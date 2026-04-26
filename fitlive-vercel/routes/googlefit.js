const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Weight  = require('../models/Weight');
const { getAuthUrl, exchangeCode, buildAuthClient } = require('../config/googleFit');
const {
  getWeeklySteps,
  getWeeklyCaloriesBurned,
  getLatestHeartRate,
  getTodaySteps,
  getTodayCaloriesBurned,
  getLatestWeight
} = require('../services/googleFitService');
const { ensureAuth } = require('../middleware/auth');
const { google } = require('googleapis');

// ── GET /googlefit  →  settings page ──────────────────
router.get('/', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id)
      .select('googleFitConnected googleEmail name email');
    res.render('googlefit', { title: 'Google Fit', user: req.session.user, dbUser: user, page: 'googlefit' });
  } catch (err) {
    req.flash('error_msg', 'Error loading Google Fit page.');
    res.redirect('/dashboard');
  }
});

// ── GET /googlefit/connect  →  redirect to Google ─────
router.get('/connect', ensureAuth, (req, res) => {
  // Check credentials are set
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    req.flash('error_msg', '⚠️ Google Client ID not configured. Please update your .env file.');
    return res.redirect('/googlefit');
  }
  const url = getAuthUrl();
  res.redirect(url);
});

// ── GET /googlefit/callback  →  handle OAuth response ─
router.get('/callback', ensureAuth, async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    req.flash('error_msg', '❌ Google Fit access was denied: ' + error);
    return res.redirect('/googlefit');
  }
  if (!code) {
    req.flash('error_msg', '❌ No authorization code received from Google.');
    return res.redirect('/googlefit');
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    // Get user's Google profile email
    let googleEmail = null;
    try {
      const oauth2Client = buildAuthClient({
        googleAccessToken:  tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry:  tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        _id: req.session.user._id
      });
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const profile = await oauth2.userinfo.get();
      googleEmail = profile.data.email;
    } catch (e) {
      console.warn('Could not fetch Google profile:', e.message);
    }

    // Save tokens to MongoDB
    await User.findByIdAndUpdate(req.session.user._id, {
      googleFitConnected: true,
      googleAccessToken:  tokens.access_token,
      googleRefreshToken: tokens.refresh_token || undefined,
      googleTokenExpiry:  tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      googleEmail:        googleEmail || undefined
    });

    // Update session
    req.session.user.googleFitConnected = true;
    req.session.user.googleEmail        = googleEmail;

    req.flash('success_msg', '✅ Google Fit connected! Live health data is now active.');
    res.redirect('/dashboard');
  } catch (err) {
    console.error('OAuth callback error:', err);
    req.flash('error_msg', '❌ Failed to connect Google Fit: ' + err.message);
    res.redirect('/googlefit');
  }
});

// ── GET /googlefit/disconnect ──────────────────────────
router.get('/disconnect', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (user && user.googleAccessToken) {
      try {
        const client = buildAuthClient(user);
        await client.revokeCredentials();
      } catch (e) { /* ignore revoke errors — token may already be expired */ }
    }

    await User.findByIdAndUpdate(req.session.user._id, {
      googleFitConnected: false,
      googleAccessToken:  null,
      googleRefreshToken: null,
      googleTokenExpiry:  null,
      googleEmail:        null
    });

    req.session.user.googleFitConnected = false;
    req.session.user.googleEmail        = null;

    req.flash('success_msg', '🔌 Google Fit disconnected. Using simulated data.');
    res.redirect('/googlefit');
  } catch (err) {
    console.error('Disconnect error:', err);
    req.flash('error_msg', 'Disconnect failed: ' + err.message);
    res.redirect('/googlefit');
  }
});

// ── GET /googlefit/live  →  JSON: live health metrics ─
// Called by Socket.io server and the live monitor page
router.get('/live', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id)
      .select('googleFitConnected googleAccessToken googleRefreshToken googleTokenExpiry _id');

    if (!user || !user.googleFitConnected) {
      return res.json({ connected: false });
    }

    const [steps, caloriesBurned, heartRate, weight] = await Promise.all([
      getTodaySteps(user),
      getTodayCaloriesBurned(user),
      getLatestHeartRate(user),
      getLatestWeight(user)
    ]);

    res.json({
      connected:      true,
      steps:          steps          ?? null,
      caloriesBurned: caloriesBurned ?? null,
      heartRate:      heartRate      ?? null,
      weight:         weight         ?? null,
      timestamp:      new Date().toLocaleTimeString()
    });
  } catch (err) {
    console.error('Live data error:', err.message);
    res.json({ connected: false, error: err.message });
  }
});

// ── GET /googlefit/summary  →  JSON: weekly chart data ─
router.get('/summary', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id)
      .select('googleFitConnected googleAccessToken googleRefreshToken googleTokenExpiry _id');

    if (!user || !user.googleFitConnected) {
      return res.json({ connected: false });
    }

    const [weeklySteps, weeklyCalories] = await Promise.all([
      getWeeklySteps(user),
      getWeeklyCaloriesBurned(user)
    ]);

    res.json({ connected: true, weeklySteps, weeklyCalories });
  } catch (err) {
    console.error('Summary error:', err.message);
    res.json({ connected: false, error: err.message });
  }
});

// ── POST /googlefit/sync-weight  →  import weight from GFit ─
router.post('/sync-weight', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id)
      .select('googleFitConnected googleAccessToken googleRefreshToken googleTokenExpiry _id');

    if (!user || !user.googleFitConnected) {
      req.flash('error_msg', 'Google Fit not connected.');
      return res.redirect('/weight');
    }

    const weight = await getLatestWeight(user);
    if (!weight) {
      req.flash('error_msg', 'No weight data found in Google Fit.');
      return res.redirect('/weight');
    }

    // Save to Weight collection
    await Weight.create({
      user:   user._id,
      value:  weight,
      note:   'Synced from Google Fit',
      source: 'google_fit',
      date:   new Date()
    });

    req.flash('success_msg', `✅ Weight synced from Google Fit: ${weight} kg`);
    res.redirect('/weight');
  } catch (err) {
    console.error('Sync weight error:', err);
    req.flash('error_msg', 'Weight sync failed: ' + err.message);
    res.redirect('/weight');
  }
});

module.exports = router;
