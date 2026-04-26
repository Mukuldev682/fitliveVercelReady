const express = require('express');
const router  = express.Router();
const Workout = require('../models/Workout');
const { ensureAuth } = require('../middleware/auth');

router.get('/', ensureAuth, async (req, res) => {
  const workouts = await Workout.find({ user: req.session.user._id }).sort({ date: -1 });
  res.render('workout', { title: 'Workout Tracker', workouts, page: 'workout' });
});

router.post('/', ensureAuth, async (req, res) => {
  const { exerciseName, type, duration, caloriesBurned, intensity, notes } = req.body;
  try {
    if (!exerciseName || !duration) {
      req.flash('error_msg', 'Exercise name and duration are required.');
      return res.redirect('/workout');
    }
    await Workout.create({ user: req.session.user._id, exerciseName, type, duration: +duration, caloriesBurned: +caloriesBurned || 0, intensity, notes });
    req.flash('success_msg', `✅ "${exerciseName}" logged!`);
  } catch (err) {
    req.flash('error_msg', 'Failed: ' + err.message);
  }
  res.redirect('/workout');
});

router.delete('/:id', ensureAuth, async (req, res) => {
  await Workout.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });
  req.flash('success_msg', 'Workout removed.');
  res.redirect('/workout');
});

module.exports = router;
