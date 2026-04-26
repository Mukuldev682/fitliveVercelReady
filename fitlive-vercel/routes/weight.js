const express = require('express');
const router  = express.Router();
const Weight  = require('../models/Weight');
const { ensureAuth } = require('../middleware/auth');

const calcBMI = (w, height) => {
  if (!height) return null;
  const h = height / 100;
  return parseFloat((w / (h * h)).toFixed(1));
};

const bmiCat = (bmi) => {
  if (!bmi) return '—';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
};

router.get('/', ensureAuth, async (req, res) => {
  const weights = await Weight.find({ user: req.session.user._id }).sort({ date: 1 });
  const height  = req.session.user.height;
  res.render('weight', { title: 'Weight & BMI', weights, calcBMI: (w) => calcBMI(w, height), bmiCat, page: 'weight' });
});

router.post('/', ensureAuth, async (req, res) => {
  const { value, note, date } = req.body;
  try {
    if (!value) {
      req.flash('error_msg', 'Weight value is required.');
      return res.redirect('/weight');
    }
    await Weight.create({ user: req.session.user._id, value: +value, note, date: date ? new Date(date) : new Date() });
    req.flash('success_msg', '✅ Weight entry saved!');
  } catch (err) {
    req.flash('error_msg', 'Failed: ' + err.message);
  }
  res.redirect('/weight');
});

router.delete('/:id', ensureAuth, async (req, res) => {
  await Weight.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });
  req.flash('success_msg', 'Entry removed.');
  res.redirect('/weight');
});

module.exports = router;
