const express = require('express');
const router  = express.Router();
const Goal    = require('../models/Goal');
const { ensureAuth } = require('../middleware/auth');

router.get('/', ensureAuth, async (req, res) => {
  const goals = await Goal.find({ user: req.session.user._id }).sort({ createdAt: -1 });
  res.render('goals', { title: 'Goals', goals, page: 'goals' });
});

router.post('/', ensureAuth, async (req, res) => {
  const { title, category, currentValue, targetValue, unit, deadline } = req.body;
  try {
    if (!title || currentValue == null || targetValue == null) {
      req.flash('error_msg', 'Title, current and target values are required.');
      return res.redirect('/goals');
    }
    await Goal.create({ user: req.session.user._id, title, category, currentValue: +currentValue, targetValue: +targetValue, unit: unit || '', deadline: deadline ? new Date(deadline) : null });
    req.flash('success_msg', `✅ Goal "${title}" set!`);
  } catch (err) {
    req.flash('error_msg', 'Failed: ' + err.message);
  }
  res.redirect('/goals');
});

router.put('/:id/achieve', ensureAuth, async (req, res) => {
  await Goal.findOneAndUpdate({ _id: req.params.id, user: req.session.user._id }, { achieved: true });
  req.flash('success_msg', '🎉 Goal achieved!');
  res.redirect('/goals');
});

router.delete('/:id', ensureAuth, async (req, res) => {
  await Goal.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });
  req.flash('success_msg', 'Goal removed.');
  res.redirect('/goals');
});

module.exports = router;
