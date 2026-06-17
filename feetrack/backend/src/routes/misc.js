const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

// GET /api/notifications — current user's notifications
router.get('/', auth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth(), async (req, res) => {
  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`,
    [req.user.id]
  );
  res.json({ count: parseInt(count) });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth(), async (req, res) => {
  await pool.query(
    `UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', auth(), async (req, res) => {
  await pool.query(
    `UPDATE notifications SET is_read=true WHERE user_id=$1`, [req.user.id]
  );
  res.json({ success: true });
});

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

// GET /api/audit
router.get('/audit', auth(['director', 'admin', 'accountant']), async (req, res) => {
  const { action, from, to } = req.query;
  let q = `SELECT al.*, u.name AS performed_by_name
           FROM audit_log al LEFT JOIN users u ON u.id=al.performed_by
           WHERE 1=1`;
  const params = [];
  if (action) { params.push(`%${action}%`); q += ` AND al.action ILIKE $${params.length}`; }
  if (from)   { params.push(from); q += ` AND al.created_at>=$${params.length}`; }
  if (to)     { params.push(to);   q += ` AND al.created_at<=$${params.length}`; }
  q += ' ORDER BY al.created_at DESC LIMIT 200';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

// GET /api/analytics/summary
router.get('/analytics/summary', auth(), async (req, res) => {
  const { year = '2026-27' } = req.query;

  const [totals, byClass, modeBreakdown, concStats] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) AS total_students,
         SUM(total_fee) AS total_fee,
         SUM(paid) AS total_paid,
         SUM(due) AS total_due,
         COUNT(*) FILTER (WHERE status='paid') AS fully_paid,
         COUNT(*) FILTER (WHERE status='partial') AS partial,
         COUNT(*) FILTER (WHERE status='pending') AS unpaid
       FROM student_fee_summary WHERE academic_year=$1`, [year]
    ),
    pool.query(
      `SELECT class || '-' || section AS label, SUM(total_fee) AS fee, SUM(paid) AS paid, SUM(due) AS due
       FROM student_fee_summary WHERE academic_year=$1
       GROUP BY class, section ORDER BY class, section`, [year]
    ),
    pool.query(
      `SELECT mode, COUNT(*) AS count, SUM(amount) AS total
       FROM payments p JOIN students s ON s.id=p.student_id
       WHERE s.academic_year=$1 GROUP BY mode`, [year]
    ),
    pool.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(approved_amount),0) AS total_waived
       FROM concession_requests cr JOIN students s ON s.id=cr.student_id
       WHERE s.academic_year=$1 GROUP BY status`, [year]
    ),
  ]);

  res.json({
    totals: totals.rows[0],
    byClass: byClass.rows,
    modeBreakdown: modeBreakdown.rows,
    concessions: concStats.rows,
  });
});

// GET /api/users — admin/director user management
router.get('/users', auth(['admin', 'director']), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, active, created_at FROM users ORDER BY role, name`
  );
  res.json(rows);
});

// POST /api/users — admin creates user
router.post('/users', auth(['admin']), async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'All fields required' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role`,
      [name, email, hash, role]
    );
    res.status(201).json(user);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/users/:id/toggle — activate/deactivate user
router.patch('/users/:id/toggle', auth(['admin']), async (req, res) => {
  await pool.query(`UPDATE users SET active = NOT active WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
