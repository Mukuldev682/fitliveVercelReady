const express = require('express');
const router  = express.Router();
const Diet    = require('../models/Diet');
const { ensureAuth } = require('../middleware/auth');

router.get('/', ensureAuth, async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const meals = await Diet.find({ user: req.session.user._id }).sort({ date: -1 });
  const todayMeals   = meals.filter(m => new Date(m.date) >= today);
  const totalCals    = todayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = todayMeals.reduce((s, m) => s + m.protein, 0);
  const totalCarbs   = todayMeals.reduce((s, m) => s + m.carbs, 0);
  const totalFats    = todayMeals.reduce((s, m) => s + m.fats, 0);
  res.render('diet', { title: 'Diet Tracker', meals, todayMeals, totalCals, totalProtein, totalCarbs, totalFats, page: 'diet' });
});

router.post('/', ensureAuth, async (req, res) => {
  const { mealName, category, calories, protein, carbs, fats } = req.body;
  try {
    if (!mealName || !calories) {
      req.flash('error_msg', 'Meal name and calories are required.');
      return res.redirect('/diet');
    }
    await Diet.create({ user: req.session.user._id, mealName, category, calories: +calories, protein: +protein || 0, carbs: +carbs || 0, fats: +fats || 0 });
    req.flash('success_msg', `✅ "${mealName}" added!`);
  } catch (err) {
    req.flash('error_msg', 'Failed to add meal: ' + err.message);
  }
  res.redirect('/diet');
});

router.delete('/:id', ensureAuth, async (req, res) => {
  await Diet.findOneAndDelete({ _id: req.params.id, user: req.session.user._id });
  req.flash('success_msg', 'Meal removed.');
  res.redirect('/diet');
});

module.exports = router;
