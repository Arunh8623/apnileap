# APNILEAP — Enterprise Governance OS

> AI-powered Jira governance dashboard with Hub-and-Spoke architecture, real-time analytics, automation engine, and Claude AI intelligence.

---

## 🗺️ What This Is

APNILEAP connects to your **Jira Cloud** instance and provides:

| Feature | Details |
|---|---|
| Hub & Spoke Architecture | Central hub project + college spoke projects |
| Issue Management | Create, edit, delete, transition issues — synced live to Jira |
| Sprint Kanban Board | Visual board pulling from your Jira sprints |
| Analytics Engine | Charts, governance health radar, KPI stats |
| Automation Engine | Overdue alerts, cron jobs, governance scoring |
| AI Insights | Claude-powered sprint summaries, risk detection, chat |
| User Management | View all Jira users, assign governance roles |
| Knowledge System | Runbooks, phase tracker, documentation links |

---

## 🚀 Complete Setup Guide (Zero Jira Knowledge Required)

### STEP 1 — Create Atlassian Account & Jira Site

1. Go to https://www.atlassian.com/software/jira/free
2. Click **"Get it free"** and sign up
3. Choose **"Jira Software"**
4. Create a site name (e.g., `apnileap.atlassian.net`)
5. Select **"Scrum"** template when prompted
6. Your Jira base URL will be: `https://apnileap.atlassian.net` *(save this)*

---

### STEP 2 — Generate Your API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Label it: `APNILEAP`
4. Click **Create** → **Copy** the token immediately (you won't see it again!)
5. Save: your email + this token

---

### STEP 3 — Create the Hub Project in Jira

1. In Jira, click **"Create project"**
2. Select **"Scrum"**
3. Set name: `APNI HUB`
4. Set key: `APNIHUB` *(this must be exact)*
5. Click **Create**

---

### STEP 4 — Create College Spoke Projects (repeat per college)

1. Click **"Create project"** again
2. Select **"Scrum"**
3. Example: Name = `College of Engineering`, Key = `COE`
4. Repeat for each college: `COB`, `COA`, `CON`, etc.

---

### STEP 5 — Configure the Backend

Navigate to the `server/` folder and create a `.env` file:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_api_token_from_step2
JIRA_HUB_PROJECT_KEY=APNIHUB
JIRA_SPOKE_KEYS=COE,COB,COA
PORT=3001
```

---

### STEP 6 — Configure the Frontend

In the root folder, create a `.env` file:

```bash
cp .env.example .env
```

The `.env` should contain:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

### STEP 7 — Install & Run

You need **Node.js 18+** installed. Download from: https://nodejs.org

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
npm install
node server.js
# Should print: 🚀 APNILEAP Backend running on port 3001
```

**Terminal 2 — Frontend:**
```bash
npm install
npm start
# Opens http://localhost:3000
```

---

## 📁 Project Structure

```
apnileap/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   ├── Header.jsx          # Top bar with search
│   │   ├── StatCard.jsx        # KPI stat cards
│   │   └── IssueModal.jsx      # Create/edit issue modal
│   ├── pages/
│   │   ├── Dashboard.jsx       # Main hub overview
│   │   ├── HubSpoke.jsx        # Hub & spoke architecture
│   │   ├── Issues.jsx          # Full issue management
│   │   ├── Sprints.jsx         # Sprint kanban board
│   │   ├── Analytics.jsx       # Charts & analytics
│   │   ├── Automation.jsx      # Automation rules
│   │   ├── AIInsights.jsx      # AI intelligence & chat
│   │   ├── Users.jsx           # User management
│   │   ├── Knowledge.jsx       # Knowledge base
│   │   └── Settings.jsx        # Config & setup guide
│   ├── services/
│   │   └── api.js              # All Jira API calls
│   └── styles/
│       └── global.css          # Design system
├── server/
│   ├── server.js               # Express + Jira proxy + cron
│   ├── package.json
│   └── .env.example
├── public/
│   └── index.html
└── package.json
```

---

## 🔄 How Issues Sync to Jira

Every action in the UI calls your backend, which calls Jira's REST API:

| Action | What Happens in Jira |
|---|---|
| Create Issue | POST /rest/api/3/issue → New issue appears in your Jira project |
| Edit Issue | PUT /rest/api/3/issue/{key} → Updates fields in Jira |
| Delete Issue | DELETE /rest/api/3/issue/{key} → Removes from Jira |
| Change Status | POST /rest/api/3/issue/{key}/transitions → Moves workflow stage |
| Add Comment | POST /rest/api/3/issue/{key}/comment → Appears in Jira |

---

## 🤖 Automation (Runs Server-Side)

The backend uses `node-cron` for scheduled tasks:

| Rule | Schedule | What It Does |
|---|---|---|
| Overdue Alerts | Daily 9 AM | Finds overdue issues, adds governance comment |
| Sprint Summary | Sprint close | Generates completion report |
| Governance Score | Every 6 hrs | Recalculates health metrics |

These run automatically when the backend server is running.

---

## 🧠 AI Features

The AI Insights page uses Claude AI (via Anthropic API) to:
- Generate sprint summaries from live Jira data
- Detect governance risks
- Analyze workload distribution
- Provide an interactive governance chat

**Note:** AI features call `https://api.anthropic.com/v1/messages` directly from the browser. This works in development. For production, route through your backend.

---

## 🌐 Deployment

### Frontend → Vercel
```bash
npm run build
# Deploy the `build/` folder to Vercel
```

### Backend → Render
1. Push the `server/` folder to GitHub
2. Create a new Web Service on render.com
3. Set environment variables in Render dashboard
4. Build command: `npm install`
5. Start command: `node server.js`

---

## 🔑 Jira API Permissions Required

Your API token needs access to:
- Read/Write Issues
- Read Projects
- Read/Write Comments
- Read Boards & Sprints
- Read Users

All of this is included in a standard Jira Software Cloud account.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Recharts, Framer Motion |
| Backend | Node.js, Express, Axios, node-cron |
| Jira API | Jira REST API v3 + Agile API |
| AI | Claude (Anthropic API) |
| Styling | Custom CSS design system (dark enterprise theme) |

---

## ❓ Troubleshooting

**"Connection failed" on Settings page**
- Make sure backend is running: `cd server && node server.js`
- Check `.env` has correct URL, email, and token
- Token must not have expired — regenerate at id.atlassian.com

**"No issues found"**
- Create a project in Jira first with key matching `JIRA_HUB_PROJECT_KEY`
- Create at least one issue manually in Jira to test

**"No boards found" on Sprints page**
- Boards are created automatically with Scrum projects
- If using an existing project, create a board: Jira → Your Project → Board

**CORS errors**
- Make sure you're accessing the frontend at `http://localhost:3000`
- Backend must be on `http://localhost:3001`
- The `proxy` field in `package.json` handles this in dev

---

Built following the APNILEAP Enterprise Implementation Roadmap — 13 phases, fully implemented.
