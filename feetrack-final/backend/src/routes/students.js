const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/students — fee summary view, filterable by class
router.get('/', auth(), async (req, res) => {
  const { class: cls, year } = req.query;
  let q = 'SELECT * FROM student_fee_summary WHERE 1=1';
  const params = [];
  if (cls && cls !== 'All') { params.push(cls); q += ` AND class=$${params.length}`; }
  if (year) { params.push(year); q += ` AND academic_year=$${params.length}`; }
  q += ' ORDER BY class, section, name';
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// GET /api/students/:id — single student with payment history
router.get('/:id', auth(), async (req, res) => {
  const { rows: [student] } = await pool.query(
    'SELECT * FROM student_fee_summary WHERE id=$1', [req.params.id]
  );
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { rows: payments } = await pool.query(
    `SELECT p.*, u.name AS recorded_by_name
     FROM payments p LEFT JOIN users u ON u.id=p.recorded_by
     WHERE p.student_id=$1 ORDER BY p.payment_date DESC`, [req.params.id]
  );
  const { rows: concessions } = await pool.query(
    `SELECT cr.*, u.name AS requested_by_name, a.name AS approved_by_name
     FROM concession_requests cr
     LEFT JOIN users u ON u.id=cr.requested_by
     LEFT JOIN users a ON a.id=cr.approved_by
     WHERE cr.student_id=$1 ORDER BY cr.created_at DESC`, [req.params.id]
  );
  res.json({ ...student, payments, concessions });
});

// POST /api/students/upload — accountant uploads Excel/CSV due list
router.post('/upload', auth(['accountant', 'admin']), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  if (!rows.length) return res.status(400).json({ error: 'File is empty' });

  const required = ['Student Name', 'Class', 'Section', 'Parent Name', 'Phone', 'Total Fee'];
  const missing = required.filter(col => !(col in rows[0]));
  if (missing.length) return res.status(400).json({ error: `Missing columns: ${missing.join(', ')}` });

  const year = req.body.academic_year || '2026-27';
  const client = await pool.connect();
  let inserted = 0;

  try {
    await client.query('BEGIN');
    for (const row of rows) {
      await client.query(
        `INSERT INTO students (name, class, section, roll_no, parent_name, phone, total_fee, academic_year, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT DO NOTHING`,
        [
          row['Student Name'], String(row['Class']), row['Section'] || 'A',
          row['Roll No'] || null, row['Parent Name'], String(row['Phone']),
          parseFloat(row['Total Fee']) || 0, year, req.user.id
        ]
      );
      inserted++;
    }

    await client.query(
      `INSERT INTO audit_log (action, entity, performed_by, details)
       VALUES ('fee_list_uploaded', 'students', $1, $2)`,
      [req.user.id, JSON.stringify({ file: req.file.originalname, count: inserted, year })]
    );

    await client.query('COMMIT');
    res.json({ success: true, inserted, total: rows.length });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// GET /api/students/classes/list — unique classes for filter tabs
router.get('/classes/list', auth(), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT class || '-' || section AS label, class, section
     FROM students WHERE active=true ORDER BY class, section`
  );
  res.json(rows);
});

module.exports = router;
