-- FeeTrack Pro — PostgreSQL Schema
-- Run this once to set up the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  role         VARCHAR(20) NOT NULL CHECK (role IN ('admin','director','management','accountant')),
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STUDENTS ────────────────────────────────────────────────────────────────
CREATE TABLE students (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(100) NOT NULL,
  class        VARCHAR(10) NOT NULL,
  section      VARCHAR(5) NOT NULL,
  roll_no      VARCHAR(20),
  parent_name  VARCHAR(100) NOT NULL,
  phone        VARCHAR(15) NOT NULL,
  total_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  academic_year VARCHAR(10) NOT NULL DEFAULT '2026-27',
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by  UUID REFERENCES users(id)
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode         VARCHAR(20) NOT NULL CHECK (mode IN ('cash','online','cheque')),
  utr_number   VARCHAR(50),       -- mandatory for online
  cheque_number VARCHAR(50),      -- for cheque
  bank_name    VARCHAR(100),      -- for cheque
  remarks      TEXT,
  receipt_no   VARCHAR(30) UNIQUE NOT NULL,
  recorded_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONCESSION REQUESTS ─────────────────────────────────────────────────────
CREATE TABLE concession_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id),
  waiver_requested NUMERIC(10,2) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  reason          TEXT NOT NULL,
  is_urgent       BOOLEAN DEFAULT false,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','waived')),
  approved_by     UUID REFERENCES users(id),
  approved_amount NUMERIC(10,2),
  decision_note   TEXT,
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENT PLANS ───────────────────────────────────────────────────────────
CREATE TABLE payment_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES users(id),
  note         TEXT,
  deadline     DATE NOT NULL,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plan_instalments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id      UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  instalment_no INT NOT NULL,
  amount       NUMERIC(10,2) NOT NULL,
  due_date     DATE NOT NULL,
  status       VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming','paid','overdue'))
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  message      TEXT NOT NULL,
  type         VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','success','warning','danger')),
  is_read      BOOLEAN DEFAULT false,
  link         VARCHAR(200),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOG ───────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action       VARCHAR(100) NOT NULL,
  entity       VARCHAR(50),
  entity_id    UUID,
  performed_by UUID REFERENCES users(id),
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VIEWS ───────────────────────────────────────────────────────────────────

-- Live fee summary per student
CREATE VIEW student_fee_summary AS
SELECT
  s.id,
  s.name,
  s.class,
  s.section,
  s.roll_no,
  s.parent_name,
  s.phone,
  s.total_fee,
  s.academic_year,
  COALESCE(SUM(p.amount), 0) AS paid,
  COALESCE(cr.total_waived, 0) AS waived,
  s.total_fee - COALESCE(SUM(p.amount), 0) - COALESCE(cr.total_waived, 0) AS due,
  CASE
    WHEN s.total_fee - COALESCE(SUM(p.amount), 0) - COALESCE(cr.total_waived, 0) <= 0 THEN 'paid'
    WHEN COALESCE(SUM(p.amount), 0) = 0 THEN 'pending'
    ELSE 'partial'
  END AS status
FROM students s
LEFT JOIN payments p ON p.student_id = s.id
LEFT JOIN (
  SELECT student_id, SUM(approved_amount) AS total_waived
  FROM concession_requests
  WHERE status IN ('approved','waived')
  GROUP BY student_id
) cr ON cr.student_id = s.id
WHERE s.active = true
GROUP BY s.id, s.name, s.class, s.section, s.roll_no, s.parent_name, s.phone, s.total_fee, s.academic_year, cr.total_waived;

-- ─── SEED: Default admin user ─────────────────────────────────────────────────
-- Password: Admin@123 (bcrypt hash)
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Dr. S. Gupta', 'director@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'director'),
('Priya Jain', 'accounts@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'accountant'),
('Rahul Sharma', 'rahul@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'management');
-- Default password for all: password
