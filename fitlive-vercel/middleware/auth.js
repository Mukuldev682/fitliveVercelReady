// Protect routes — redirect to login if not authenticated
const ensureAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();
  req.flash('error_msg', 'Please log in to access this page.');
  res.redirect('/login');
};

// Redirect to dashboard if already logged in
const ensureGuest = (req, res, next) => {
  if (req.session && req.session.user) return res.redirect('/dashboard');
  next();
};

module.exports = { ensureAuth, ensureGuest };
