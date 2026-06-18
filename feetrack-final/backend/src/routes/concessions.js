const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

async function notify(client, userId, title, message, type = 'info', link = null) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5)`,
    [userId, title, message, type, link]
  );
}

// GET /api/concessions
router.get('/', auth(), async (req, res) => {
  const { status } = req.query;
  let q = `SELECT cr.*, s.name AS student_name, s.class, s.section, s.parent_name,
           u.name AS requested_by_name, a.name AS approved_by_name,
           sf.due AS current_due, sf.total_fee
           FROM concession_requests cr
           JOIN students s ON s.id=cr.student_id
           JOIN student_fee_summary sf ON sf.id=cr.student_id
           JOIN users u ON u.id=cr.requested_by
           LEFT JOIN users a ON a.id=cr.approved_by
           WHERE 1=1`;
  const params = [];

  // Management sees only their own requests
  if (req.user.role === 'management') {
    params.push(req.user.id);
    q += ` AND cr.requested_by=$${params.length}`;
  }
  if (status) { params.push(status); q += ` AND cr.status=$${params.length}`; }
  q += ' ORDER BY cr.is_urgent DESC, cr.created_at DESC';

  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// POST /api/concessions — management raises a request
router.post('/', auth(['management', 'admin']), async (req, res) => {
  const { student_id, waiver_requested, category, reason, is_urgent } = req.body;
  if (!student_id || !waiver_requested || !category || !reason)
    return res.status(400).json({ error: 'All fields are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [student] } = await client.query(
      'SELECT * FROM student_fee_summary WHERE id=$1', [student_id]
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (parseFloat(waiver_requested) > parseFloat(student.due))
      return res.status(400).json({ error: 'Waiver cannot exceed current due amount' });

    const { rows: [req_row] } = await client.query(
      `INSERT INTO concession_requests (student_id, requested_by, waiver_requested, category, reason, is_urgent)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [student_id, req.user.id, waiver_requested, category, reason, !!is_urgent]
    );

    await client.query(
      `INSERT INTO audit_log (action, entity, entity_id, performed_by, details)
       VALUES ('concession_requested','concession_request',$1,$2,$3)`,
      [req_row.id, req.user.id, JSON.stringify({ student: student.name, waiver_requested, category, is_urgent })]
    );

    // Notify all directors
    const { rows: directors } = await client.query(
      `SELECT id FROM users WHERE role IN ('director','admin') AND active=true`
    );
    for (const d of directors) {
      await notify(client, d.id,
        is_urgent ? '🚨 Urgent concession request' : 'New concession request',
        `${req.user.name} raised a ₹${parseFloat(waiver_requested).toLocaleString('en-IN')} waiver request for ${student.name} (${student.class}-${student.section}) — ${category}`,
        is_urgent ? 'danger' : 'info', '/approvals'
      );
    }

    await client.query('COMMIT');
    res.status(201).json(req_row);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// PATCH /api/concessions/:id/decide — director approves/rejects/waives
router.patch('/:id/decide', auth(['director', 'admin']), async (req, res) => {
  const { status, approved_amount, decision_note } = req.body;
  if (!['approved', 'rejected', 'waived'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  if (!decision_note)
    return res.status(400).json({ error: 'Decision note is mandatory' });
  if (status !== 'rejected' && !approved_amount)
    return res.status(400).json({ error: 'Approved amount is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [cr] } = await client.query(
      `SELECT cr.*, s.name AS student_name, s.class, s.section, u.id AS requester_id, u.name AS requester_name
       FROM concession_requests cr
       JOIN students s ON s.id=cr.student_id
       JOIN users u ON u.id=cr.requested_by
       WHERE cr.id=$1`, [req.params.id]
    );
    if (!cr) return res.status(404).json({ error: 'Request not found' });
    if (cr.status !== 'pending') return res.status(400).json({ error: 'Request already decided' });

    const finalAmt = status === 'waived'
      ? (await pool.query('SELECT due FROM student_fee_summary WHERE id=$1', [cr.student_id])).rows[0]?.due
      : approved_amount;

    await client.query(
      `UPDATE concession_requests SET status=$1, approved_by=$2, approved_amount=$3, decision_note=$4, decided_at=NOW()
       WHERE id=$5`,
      [status, req.user.id, finalAmt || 0, decision_note, req.params.id]
    );

    await client.query(
      `INSERT INTO audit_log (action, entity, entity_id, performed_by, details)
       VALUES ($1,'concession_request',$2,$3,$4)`,
      [`concession_${status}`, req.params.id, req.user.id,
       JSON.stringify({ student: cr.student_name, status, approved_amount: finalAmt, note: decision_note })]
    );

    // Notify the staff member who raised it
    const notifType = status === 'approved' || status === 'waived' ? 'success' : 'danger';
    const notifMsg = status === 'rejected'
      ? `Your concession request for ${cr.student_name} was rejected. Note: ${decision_note}`
      : status === 'waived'
        ? `Full waive-off granted for ${cr.student_name} by ${req.user.name}`
        : `₹${parseFloat(finalAmt).toLocaleString('en-IN')} waiver approved for ${cr.student_name} by ${req.user.name}`;

    await notify(client, cr.requester_id, `Concession ${status}`, notifMsg, notifType, '/requests');

    // Also notify accountant to update ledger
    const { rows: accountants } = await client.query(
      `SELECT id FROM users WHERE role='accountant' AND active=true`
    );
    for (const ac of accountants) {
      await notify(client, ac.id, 'Ledger update needed',
        `Concession ${status} for ${cr.student_name} — ₹${parseFloat(finalAmt || 0).toLocaleString('en-IN')}. Update the ledger.`,
        notifType, '/ledger'
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, status });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
