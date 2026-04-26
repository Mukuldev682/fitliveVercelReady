# FitLive V2 — Vercel Deployment Guide

Real-time fitness tracker with Google Fit, AI coach, and MongoDB.

---

## Project Structure

```
fitlive/
├── api/
│   └── index.js        ← Vercel serverless entry point (Express app export)
├── server.js           ← Local dev server (includes Socket.io)
├── vercel.json         ← Vercel routing config
├── .env.example        ← Copy to .env and fill in your values
├── ai/                 ← Groq AI coach logic
├── config/             ← DB + Google Fit config
├── middleware/         ← Auth guards
├── models/             ← Mongoose models
├── routes/             ← Express routes
├── services/           ← Google Fit service
├── views/              ← EJS templates
└── public/             ← Static CSS/JS
```

---

## Step 1 — Set up MongoDB Atlas (REQUIRED for Vercel)

Vercel cannot connect to `localhost` MongoDB.

1. Go to https://mongodb.com/atlas → create a free M0 cluster
2. Create a database user (username + password)
3. Allow access from anywhere: Network Access → `0.0.0.0/0`
4. Copy your connection string:
   `mongodb+srv://<user>:<password>@cluster.mongodb.net/fitlive?retryWrites=true&w=majority`

---

## Step 2 — Set Environment Variables in Vercel

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

| Variable              | Value                                                  |
|-----------------------|--------------------------------------------------------|
| `MONGO_URI`           | Your Atlas connection string                           |
| `SESSION_SECRET`      | Any long random string (e.g. 32+ random characters)   |
| `GROQ_API_KEY`        | Your Groq API key                                      |
| `GOOGLE_CLIENT_ID`    | Google OAuth Client ID                                 |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret                             |
| `GOOGLE_REDIRECT_URI` | `https://your-app.vercel.app/googlefit/callback`       |
| `EMAIL_USER`          | Gmail address for password reset                       |
| `EMAIL_PASS`          | Gmail App Password (not your real password)            |
| `NODE_ENV`            | `production`                                           |

---

## Step 3 — Update Google OAuth Redirect URI

In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client:

Add to **Authorized redirect URIs**:
```
https://your-app.vercel.app/googlefit/callback
```

---

## Step 4 — Deploy to Vercel

### Option A: Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

### Option B: GitHub Integration
1. Push this project to a GitHub repo (make sure `.env` is in `.gitignore`)
2. Go to https://vercel.com → New Project → Import your repo
3. Vercel auto-detects the config — click Deploy

---

## Local Development

```bash
cp .env.example .env        # Fill in your values
npm install
npm run dev                 # nodemon + Socket.io
```

---

## ⚠️ Socket.io on Vercel

Vercel Serverless Functions are **stateless** — they cannot maintain persistent WebSocket connections. This means the **real-time health data panel** (live heart rate, steps ticker) won't push updates via Socket.io on Vercel.

**Everything else works:** auth, workouts, diet, weight tracking, AI coach, Google Fit OAuth, goals.

**To keep real-time working**, deploy to a platform that supports long-running servers:
- [Railway](https://railway.app) — easiest, free tier available
- [Render](https://render.com) — free tier, spins down after inactivity
- [Fly.io](https://fly.io) — more control

