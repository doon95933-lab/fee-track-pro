const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

async function notify(client, userId, title, message, type = 'info', link = null) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5)`,
    [userId, title, message, type, link]
  );
}

// GET /api/plans
router.get('/', auth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pp.*, s.name AS student_name, s.class, s.section, s.parent_name, s.phone,
     u.name AS created_by_name,
     (SELECT json_agg(pi ORDER BY pi.instalment_no) FROM plan_instalments pi WHERE pi.plan_id=pp.id) AS instalments
     FROM payment_plans pp
     JOIN students s ON s.id=pp.student_id
     JOIN users u ON u.id=pp.created_by
     ORDER BY pp.created_at DESC`
  );
  res.json(rows);
});

// POST /api/plans — director creates a plan
router.post('/', auth(['director', 'admin']), async (req, res) => {
  const { student_id, note, deadline, instalments } = req.body;
  // instalments: [{ instalment_no, amount, due_date }]
  if (!student_id || !deadline || !instalments?.length)
    return res.status(400).json({ error: 'student_id, deadline and instalments are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [student] } = await client.query(
      'SELECT * FROM student_fee_summary WHERE id=$1', [student_id]
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { rows: [plan] } = await client.query(
      `INSERT INTO payment_plans (student_id, created_by, note, deadline)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [student_id, req.user.id, note || null, deadline]
    );

    for (const inst of instalments) {
      await client.query(
        `INSERT INTO plan_instalments (plan_id, instalment_no, amount, due_date)
         VALUES ($1,$2,$3,$4)`,
        [plan.id, inst.instalment_no, inst.amount, inst.due_date]
      );
    }

    await client.query(
      `INSERT INTO audit_log (action, entity, entity_id, performed_by, details)
       VALUES ('payment_plan_created','payment_plan',$1,$2,$3)`,
      [plan.id, req.user.id, JSON.stringify({ student: student.name, deadline, instalments: instalments.length })]
    );

    // Notify accountants
    const { rows: accountants } = await client.query(
      `SELECT id FROM users WHERE role='accountant' AND active=true`
    );
    for (const ac of accountants) {
      await notify(client, ac.id, 'New payment plan created',
        `${req.user.name} created a ${instalments.length}-instalment plan for ${student.name} (${student.class}-${student.section}). Deadline: ${deadline}`,
        'info', '/plans'
      );
    }

    await client.query('COMMIT');
    res.status(201).json(plan);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// PATCH /api/plans/instalments/:id — mark instalment paid/overdue
router.patch('/instalments/:id', auth(['accountant', 'director', 'admin']), async (req, res) => {
  const { status } = req.body;
  if (!['paid', 'overdue', 'upcoming'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  await pool.query(
    `UPDATE plan_instalments SET status=$1 WHERE id=$2`, [status, req.params.id]
  );
  res.json({ success: true });
});

// DELETE /api/plans/:id — revoke a plan (director only)
router.delete('/:id', auth(['director', 'admin']), async (req, res) => {
  await pool.query(`UPDATE payment_plans SET active=false WHERE id=$1`, [req.params.id]);
  await pool.query(
    `INSERT INTO audit_log (action, entity, entity_id, performed_by, details)
     VALUES ('payment_plan_revoked','payment_plan',$1,$2,$3)`,
    [req.params.id, req.user.id, JSON.stringify({ reason: req.body.reason })]
  );
  res.json({ success: true });
});

module.exports = router;
