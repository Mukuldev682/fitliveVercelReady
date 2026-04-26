const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { ensureGuest } = require('../middleware/auth');

// GET /  → redirect to login or dashboard
router.get('/', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

// GET /login
router.get('/login', ensureGuest, (req, res) => {
  res.render('login', { title: 'Login' });
});

// POST /login
router.post('/login', ensureGuest, async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      req.flash('error_msg', 'Please fill in all fields.');
      return res.redirect('/login');
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      req.flash('error_msg', 'No account found with that email.');
      return res.redirect('/login');
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      req.flash('error_msg', 'Incorrect password.');
      return res.redirect('/login');
    }
    // Store minimal user info in session
    req.session.user = {
      _id:                user._id.toString(),
      name:               user.name,
      email:              user.email,
      height:             user.height,
      googleFitConnected: user.googleFitConnected || false,
      googleEmail:        user.googleEmail || null
    };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
});

// GET /register
router.get('/register', ensureGuest, (req, res) => {
  res.render('register', { title: 'Register' });
});

// POST /register
router.post('/register', ensureGuest, async (req, res) => {
  const { name, email, password, age, gender, height, weight } = req.body;
  try {
    if (!name || !email || !password) {
      req.flash('error_msg', 'Name, email and password are required.');
      return res.redirect('/register');
    }
    if (password.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters.');
      return res.redirect('/register');
    }
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      req.flash('error_msg', 'An account with that email already exists.');
      return res.redirect('/register');
    }
    await User.create({ name, email, password, age, gender, height, weight });
    req.flash('success_msg', '✅ Account created! Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error_msg', 'Registration failed: ' + err.message);
    res.redirect('/register');
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
