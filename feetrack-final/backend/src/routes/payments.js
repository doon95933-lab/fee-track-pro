const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// Generate receipt number
function generateReceiptNo() {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `RCP-${yy}${mm}-${rand}`;
}

// Notify a user (insert into notifications table)
async function notify(client, userId, title, message, type = 'info', link = null) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message, type, link)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, title, message, type, link]
  );
}

// POST /api/payments — record a payment (accountant only)
router.post('/', auth(['accountant', 'admin']), async (req, res) => {
  const { student_id, amount, payment_date, mode, utr_number, cheque_number, bank_name, remarks } = req.body;

  if (!student_id || !amount || !mode)
    return res.status(400).json({ error: 'student_id, amount, and mode are required' });

  if (mode === 'online' && !utr_number)
    return res.status(400).json({ error: 'UTR number is mandatory for online payments' });

  if (mode === 'cheque' && !cheque_number)
    return res.status(400).json({ error: 'Cheque number is required for cheque payments' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify student exists and get due amount
    const { rows: [student] } = await client.query(
      'SELECT * FROM student_fee_summary WHERE id=$1', [student_id]
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (parseFloat(amount) > parseFloat(student.due))
      return res.status(400).json({ error: `Amount ₹${amount} exceeds due ₹${student.due}` });

    const receipt_no = generateReceiptNo();

    const { rows: [payment] } = await client.query(
      `INSERT INTO payments (student_id, amount, payment_date, mode, utr_number, cheque_number, bank_name, remarks, receipt_no, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [student_id, amount, payment_date || new Date(), mode, utr_number || null,
       cheque_number || null, bank_name || null, remarks || null, receipt_no, req.user.id]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (action, entity, entity_id, performed_by, details)
       VALUES ('payment_recorded','payment',$1,$2,$3)`,
      [payment.id, req.user.id, JSON.stringify({ student: student.name, amount, mode, receipt_no, utr: utr_number })]
    );

    // Notify all directors and admins
    const { rows: directors } = await client.query(
      `SELECT id FROM users WHERE role IN ('director','admin') AND active=true`
    );
    for (const d of directors) {
      await notify(client, d.id,
        'Payment recorded',
        `₹${parseFloat(amount).toLocaleString('en-IN')} received from ${student.parent_name} for ${student.name} (${student.class}-${student.section}) via ${mode}`,
        'success', '/ledger'
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ payment, receipt_no });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// GET /api/payments — all payments, filterable
router.get('/', auth(), async (req, res) => {
  const { student_id, mode, from, to } = req.query;
  let q = `SELECT p.*, s.name AS student_name, s.class, s.section, s.parent_name, u.name AS recorded_by_name
           FROM payments p
           JOIN students s ON s.id=p.student_id
           LEFT JOIN users u ON u.id=p.recorded_by
           WHERE 1=1`;
  const params = [];
  if (student_id) { params.push(student_id); q += ` AND p.student_id=$${params.length}`; }
  if (mode) { params.push(mode); q += ` AND p.mode=$${params.length}`; }
  if (from) { params.push(from); q += ` AND p.payment_date>=$${params.length}`; }
  if (to) { params.push(to); q += ` AND p.payment_date<=$${params.length}`; }
  q += ' ORDER BY p.created_at DESC';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// GET /api/payments/:id — single receipt
router.get('/:id', auth(), async (req, res) => {
  const { rows: [p] } = await pool.query(
    `SELECT p.*, s.name AS student_name, s.class, s.section, s.parent_name, s.phone, u.name AS recorded_by_name
     FROM payments p
     JOIN students s ON s.id=p.student_id
     LEFT JOIN users u ON u.id=p.recorded_by
     WHERE p.id=$1`, [req.params.id]
  );
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  res.json(p);
});

module.exports = router;
