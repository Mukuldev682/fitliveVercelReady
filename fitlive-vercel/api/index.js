/**
 * Vercel serverless entry point for FitLive.
 *
 * IMPORTANT — Socket.io note:
 * Vercel Serverless Functions are stateless and do NOT support persistent
 * WebSocket connections. Socket.io real-time features (live heart rate,
 * steps, etc.) will NOT work on Vercel's serverless tier.
 *
 * Options to keep real-time working:
 *   1. Deploy to Vercel + a separate Socket.io server (e.g. Railway/Render)
 *      and set SOCKET_SERVER_URL env var to that server's URL.
 *   2. Upgrade to Vercel Pro and use Edge Functions (advanced).
 *   3. Deploy the whole app to Railway / Render / Fly.io instead.
 *
 * For now, the app will function fully (auth, CRUD, AI coach, Google Fit
 * OAuth) — only the real-time health-data panel will show simulated data
 * sourced from the client itself when no Socket.io server is reachable.
 */

require('dotenv').config();
const express        = require('express');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const path           = require('path');

const app = express();

// ── Database ──────────────────────────────────────────
const connectDB = require('../config/db');
connectDB();

// ── Middleware ────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret:            process.env.SESSION_SECRET || 'fitlive_secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,   // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use(flash());

// ── View Engine ───────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// ── Global template variables ─────────────────────────
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.user        = req.session.user || null;
  next();
});

// ── Routes ────────────────────────────────────────────
app.use('/',          require('../routes/auth'));
app.use('/dashboard', require('../routes/dashboard'));
app.use('/diet',      require('../routes/diet'));
app.use('/workout',   require('../routes/workout'));
app.use('/',          require('../routes/password'));
app.use('/weight',    require('../routes/weight'));
app.use('/goals',     require('../routes/goals'));
app.use('/googlefit', require('../routes/googlefit'));
app.use('/ai',        require('../routes/ai'));

// ── Health check (useful for Vercel / uptime monitors) ─
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Export for Vercel ─────────────────────────────────
module.exports = app;
