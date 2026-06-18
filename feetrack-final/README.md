# 🏫 FeeTrack Pro — School Fee Management System

A full-stack web app to manage school fee dues, concession requests,
payment recording, payment plans, and audit trails — with role-based
access and free in-app push notifications.

---

## 📁 Project Structure

```
feetrack/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── index.js          Entry point
│   │   ├── db/pool.js        PostgreSQL connection
│   │   ├── middleware/auth.js JWT middleware
│   │   └── routes/
│   │       ├── auth.js           Login / me
│   │       ├── students.js       Upload due list, ledger
│   │       ├── payments.js       Mark paid, receipts
│   │       ├── concessions.js    Requests + approvals
│   │       ├── plans.js          Payment plans
│   │       └── misc.js           Notifications, audit, analytics, users
│   ├── schema.sql        Database schema (run once)
│   └── .env.example      Environment variables template
│
└── frontend/         React + Tailwind UI
    └── src/
        ├── api.js                Axios instance
        ├── App.jsx               Router + shell
        ├── context/
        │   ├── AuthContext.jsx   Login state
        │   └── NotifContext.jsx  Push notifications (polling)
        ├── components/
        │   ├── UI.jsx            Shared components
        │   ├── Sidebar.jsx       Navigation
        │   └── Topbar.jsx        Header + notification bell
        └── pages/
            ├── Login.jsx         Login screen
            ├── Upload.jsx        Upload fee due list (accountant)
            ├── Ledger.jsx        Fee ledger + mark payment
            └── Approvals.jsx     Director approval workflow
```

---

## 🚀 Setup Instructions

### 1. Database (PostgreSQL)

```bash
# Create a database
createdb feetrack

# Run the schema
psql -d feetrack -f backend/schema.sql
```

This creates all tables and seeds 4 demo users.
Default password for all users: **password**

| Email                    | Role        |
|--------------------------|-------------|
| admin@school.com         | Admin       |
| director@school.com      | Director    |
| accounts@school.com      | Accountant  |
| rahul@school.com         | Management  |

---

### 2. Backend

```bash
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret

npm run dev   # development with auto-reload
npm start     # production
```

Backend runs on **http://localhost:4000**

---

### 3. Frontend

```bash
cd frontend
npm install

# Optional: create .env file
echo "REACT_APP_API_URL=http://localhost:4000/api" > .env

npm start     # development on http://localhost:3000
npm run build # production build
```

---

## 🔐 Role Permissions

| Feature                        | Admin | Director | Accountant | Management |
|--------------------------------|-------|----------|------------|------------|
| Upload due list                | ✅    | ❌       | ✅         | ❌         |
| View fee ledger                | ✅    | ✅       | ✅         | ✅         |
| Mark payment received          | ✅    | ❌       | ✅         | ❌         |
| Raise concession request       | ✅    | ❌       | ❌         | ✅         |
| Approve / reject / waive       | ✅    | ✅       | ❌         | ❌         |
| Create payment plans           | ✅    | ✅       | ❌         | ❌         |
| View audit trail               | ✅    | ✅       | ✅         | ❌         |
| View analytics                 | ✅    | ✅       | ✅         | ❌         |
| Manage users                   | ✅    | ❌       | ❌         | ❌         |

---

## 📋 Key Features

### Fee Due List Upload (Accountant)
- Upload Excel/CSV file with all students class-wise
- Guided 4-step flow with preview before confirming
- One-time per academic year — this is the foundation for all tracking

### Fee Ledger (Real-time)
- Class-wise tabs (6-A, 7-B, 10-A, etc.)
- Live calculation: Total Fee − Payments − Approved Waivers = Due
- Search by student or parent name
- Recovery % progress bar per student

### Mark Payment (Accountant only)
- Cash → just amount + date
- Online → UTR number is MANDATORY (cannot submit without it)
- Cheque → cheque number + bank name
- Auto-generates receipt number (RCP-YYMM-XXXXX)
- Ledger updates instantly after recording

### Concession Requests (Management staff)
- Staff raises request with reason, category, urgency
- Instantly notifies all directors via in-app push
- Staff only sees their own requests
- Complete history of who requested what and when

### Approvals (Director / Principal)
- See all pending requests with full detail
- Can modify the approved amount (approve less than asked)
- 4 decisions: Approve partial → Full waive-off → Payment plan → Reject
- Mandatory decision note (logged permanently)
- Notifies the requesting staff member instantly

### Payment Plans (Director)
- Create instalment schedules with custom amounts and due dates
- Track paid / overdue / upcoming instalments
- Accountant notified when plan is created

### In-App Push Notifications (Free — no WhatsApp API)
- Polls every 20 seconds for new notifications
- Bell icon shows unread count in red
- Every key action triggers targeted notifications:
  - New concession request → Director notified
  - Decision made → Staff notified
  - Payment recorded → Director notified
  - Overdue instalment → Accountant notified

### Audit Trail (Read-only, tamper-proof)
- Every payment, approval, waiver, upload, and plan is logged
- Cannot be deleted or edited by anyone
- Includes: who, what, when, amount, reference number

---

## 🌐 Deployment

### Backend (Railway / Render / VPS)
```bash
# Set environment variables:
DATABASE_URL=postgresql://...
JWT_SECRET=your_random_secret_here
PORT=4000
NODE_ENV=production
```

### Frontend (Vercel / Netlify)
```bash
npm run build
# Set env: REACT_APP_API_URL=https://your-backend-url.com/api
```

### Database (Supabase — free tier works great)
1. Create project at supabase.com
2. Paste schema.sql in the SQL editor and run
3. Use the connection string as DATABASE_URL

---

## 🛣 Roadmap (Next features to build)

- [ ] Dashboard page with summary metrics and charts
- [ ] Concession request form (management page)
- [ ] Payment plans UI (director page)
- [ ] Receipts page with print/PDF download
- [ ] Defaulters page with bulk reminder
- [ ] Analytics page with charts
- [ ] User management page (admin)
- [ ] ERP import connector
- [ ] Browser push notifications (Web Push API)
- [ ] Email notifications (Nodemailer / SendGrid)
- [ ] Mobile-responsive layout

---

## 🔑 API Endpoints

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/students              ?class=10&year=2026-27
GET    /api/students/:id
POST   /api/students/upload       multipart/form-data
GET    /api/students/classes/list

POST   /api/payments
GET    /api/payments
GET    /api/payments/:id

GET    /api/concessions           ?status=pending
POST   /api/concessions
PATCH  /api/concessions/:id/decide

GET    /api/plans
POST   /api/plans
PATCH  /api/plans/instalments/:id
DELETE /api/plans/:id

GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/mark-all-read

GET    /api/audit
GET    /api/analytics/summary
GET    /api/users
POST   /api/users
PATCH  /api/users/:id/toggle
```
