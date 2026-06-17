# 🏫 FeeTrack Pro — Complete Online Setup Guide
## (No installation on your computer needed)

---

## WHAT WE WILL USE (All Free)

| Purpose        | Tool          | Free Tier         |
|----------------|---------------|-------------------|
| Database       | Supabase      | 500MB, unlimited  |
| Backend (API)  | Render.com    | 750 hrs/month     |
| Frontend (UI)  | Vercel        | Unlimited         |
| Code editor    | GitHub        | Free              |
| File manager   | GitHub.dev    | Free (browser VS Code) |

Total cost: ₹0

---

## STEP 1 — CREATE A GITHUB ACCOUNT (5 minutes)

1. Open https://github.com in your browser
2. Click **Sign up**
3. Enter your email, create a username and password
4. Verify your email
5. You are in ✅

---

## STEP 2 — PUT THE CODE ON GITHUB (10 minutes)

### 2A — Create a new repository
1. On GitHub, click the **+** button (top right) → **New repository**
2. Name it: `feetrack-pro`
3. Set it to **Private**
4. Click **Create repository**

### 2B — Open the browser code editor
1. On your new empty repo page, press the **period key ( . )** on your keyboard
2. This opens **GitHub.dev** — a full VS Code editor in your browser
3. You will see a file explorer on the left

### 2C — Create the folder structure
Click the **New Folder** icon in the file explorer and create:
```
backend/
backend/src/
backend/src/db/
backend/src/middleware/
backend/src/routes/
frontend/
frontend/public/
frontend/src/
frontend/src/components/
frontend/src/context/
frontend/src/pages/
```

### 2D — Create each file
For each file Claude gave you, do this:
1. Click on the correct folder
2. Click **New File** icon
3. Name the file exactly as shown
4. Paste the code Claude gave you
5. Press **Ctrl+S** to save

**Files to create in `backend/`:**
- `package.json`
- `schema.sql`
- `.env.example`

**Files to create in `backend/src/`:**
- `index.js`

**Files to create in `backend/src/db/`:**
- `pool.js`

**Files to create in `backend/src/middleware/`:**
- `auth.js`

**Files to create in `backend/src/routes/`:**
- `auth.js`
- `students.js`
- `payments.js`
- `concessions.js`
- `plans.js`
- `misc.js`

**Files to create in `frontend/`:**
- `package.json`
- `tailwind.config.js`

**Files to create in `frontend/public/`:**
- `index.html`

**Files to create in `frontend/src/`:**
- `App.jsx`
- `api.js`
- `index.js`
- `index.css`

**Files to create in `frontend/src/components/`:**
- `UI.jsx`
- `Sidebar.jsx`
- `Topbar.jsx`

**Files to create in `frontend/src/context/`:**
- `AuthContext.jsx`
- `NotifContext.jsx`

**Files to create in `frontend/src/pages/`:**
- `Login.jsx`
- `Ledger.jsx`
- `Upload.jsx`
- `Approvals.jsx`

### 2E — Commit the code
1. Click the **Source Control** icon on the left sidebar (looks like a branch)
2. In the message box type: `Initial commit`
3. Click **Commit & Push**
4. Your code is now saved on GitHub ✅

---

## STEP 3 — SET UP THE DATABASE ON SUPABASE (10 minutes)

1. Go to https://supabase.com
2. Click **Start your project** → Sign up with GitHub (easiest)
3. Click **New project**
4. Fill in:
   - **Name:** feetrack
   - **Database password:** Create a strong password → **SAVE THIS PASSWORD**
   - **Region:** Select the closest to India (e.g. Singapore)
5. Click **Create new project**
6. Wait 2 minutes for it to set up

### Run the database schema
1. On the left sidebar click **SQL Editor**
2. Click **New query**
3. Open `backend/schema.sql` from your GitHub
4. Copy ALL the content
5. Paste it into the SQL editor
6. Click **Run** (green button)
7. You should see: "Success. No rows returned" ✅

### Get your database connection string
1. On the left sidebar click **Settings** (gear icon)
2. Click **Database**
3. Scroll down to **Connection string**
4. Select **URI** tab
5. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you saved
7. **Save this string** — you will need it in the next step

---

## STEP 4 — DEPLOY THE BACKEND ON RENDER.COM (10 minutes)

1. Go to https://render.com
2. Click **Get Started for Free** → Sign up with GitHub
3. Click **New +** → **Web Service**
4. Click **Connect a repository** → select `feetrack-pro`
5. Fill in the settings:
   - **Name:** feetrack-api
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** Free

6. Scroll down to **Environment Variables** → click **Add Environment Variable**
   Add these one by one:

   | Key              | Value                                    |
   |------------------|------------------------------------------|
   | DATABASE_URL     | (paste your Supabase connection string)  |
   | JWT_SECRET       | (type any long random text, e.g. `MySchool@FeeTrack#2026SecretKey`) |
   | NODE_ENV         | production                               |
   | PORT             | 4000                                     |

7. Click **Create Web Service**
8. Wait 3-5 minutes for it to build and deploy
9. You will see a URL like: `https://feetrack-api.onrender.com`
10. **Copy this URL** — you need it for the frontend ✅

### Test the backend is working
Open this URL in your browser:
```
https://feetrack-api.onrender.com/health
```
You should see: `{"status":"ok"}` ✅

---

## STEP 5 — DEPLOY THE FRONTEND ON VERCEL (5 minutes)

1. Go to https://vercel.com
2. Click **Sign Up** → Continue with GitHub
3. Click **Add New** → **Project**
4. Find `feetrack-pro` → click **Import**
5. Fill in settings:
   - **Framework Preset:** Create React App
   - **Root Directory:** click **Edit** → type `frontend`
6. Click **Environment Variables** → add:

   | Key                  | Value                                       |
   |----------------------|---------------------------------------------|
   | REACT_APP_API_URL    | https://feetrack-api.onrender.com/api       |

   (Replace with your actual Render URL from Step 4)

7. Click **Deploy**
8. Wait 2-3 minutes
9. Vercel gives you a URL like: `https://feetrack-pro.vercel.app` ✅

---

## STEP 6 — TEST YOUR LIVE APP (5 minutes)

Open your Vercel URL in browser. You should see the FeeTrack Pro login page.

**Login with these demo accounts** (password: `password` for all):

| Role        | Email                   | What they can do                          |
|-------------|-------------------------|-------------------------------------------|
| Director    | director@school.com     | Approve/reject waivers, create plans      |
| Accountant  | accounts@school.com     | Upload due list, mark payments            |
| Management  | rahul@school.com        | Raise concession requests                 |
| Admin       | admin@school.com        | Everything + manage users                 |

---

## STEP 7 — CHANGE THE DEFAULT PASSWORDS (Important!)

1. Open https://supabase.com → your project
2. Click **SQL Editor** → **New query**
3. Run this to change passwords (replace with real bcrypt hashes):

```sql
-- First generate a bcrypt hash of your new password at: https://bcrypt-generator.com
-- Rounds: 10

UPDATE users SET password = 'PASTE_HASH_HERE' WHERE email = 'director@school.com';
UPDATE users SET password = 'PASTE_HASH_HERE' WHERE email = 'accounts@school.com';
UPDATE users SET password = 'PASTE_HASH_HERE' WHERE email = 'rahul@school.com';
UPDATE users SET password = 'PASTE_HASH_HERE' WHERE email = 'admin@school.com';
```

Or use the Admin login → User Management page inside the app to change passwords.

---

## STEP 8 — ADD YOUR REAL STAFF USERS

1. Login as Admin → go to **User Management**
2. Click **Add user**
3. Fill in name, email, role, and set a password
4. They can login immediately

Roles to create:
- One **Director** (or Principal)
- One **Accountant** (your accounts person)
- Multiple **Management** (any staff who will raise concession requests)

---

## STEP 9 — UPLOAD YOUR FIRST FEE DUE LIST

1. Login as **Accountant**
2. Go to **Upload due list**
3. Download the Excel template
4. Fill it with all your students (one row per student)
5. Upload it
6. All tracking starts immediately ✅

---

## TROUBLESHOOTING

### Backend not starting?
- Go to Render.com → your service → **Logs**
- Most common issue: wrong DATABASE_URL
- Make sure you replaced [YOUR-PASSWORD] in the Supabase URL

### Frontend not connecting to backend?
- Check that REACT_APP_API_URL in Vercel matches your Render URL exactly
- Go to Vercel → Settings → Environment Variables to fix it
- After changing, go to Vercel → Deployments → Redeploy

### Render backend goes to sleep (free tier)?
- Free Render services sleep after 15 minutes of no traffic
- First request after sleeping takes 30-60 seconds to wake up
- To avoid: upgrade to $7/month on Render, OR use https://uptimerobot.com to ping your backend every 10 minutes for free

### Login says "Invalid credentials"?
- The schema.sql seeds 4 users with password: `password`
- Make sure you ran the full schema.sql in Supabase

---

## SUMMARY OF LINKS TO SAVE

After setup, save these:

| What                  | Link                                        |
|-----------------------|---------------------------------------------|
| Your app (frontend)   | https://feetrack-pro.vercel.app             |
| Your API (backend)    | https://feetrack-api.onrender.com           |
| Database dashboard    | https://supabase.com/dashboard              |
| Code editor           | https://github.dev/yourusername/feetrack-pro |

Share the Vercel link with your staff. That is all they need.
