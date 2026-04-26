const express = require('express');
const router  = express.Router();
const { ensureAuth } = require('../middleware/auth');
const Diet    = require('../models/Diet');
const Workout = require('../models/Workout');
const Weight  = require('../models/Weight');
const Goal    = require('../models/Goal');

router.get('/', ensureAuth, async (req, res) => {
  try {
    const uid   = req.session.user._id;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [meals, workouts, weights, goals] = await Promise.all([
      Diet.find({ user: uid, date: { $gte: today } }).sort({ date: -1 }),
      Workout.find({ user: uid, date: { $gte: today } }).sort({ date: -1 }),
      Weight.find({ user: uid }).sort({ date: 1 }),
      Goal.find({ user: uid, achieved: false }).sort({ createdAt: -1 })
    ]);

    const todayCals   = meals.reduce((s, m) => s + m.calories, 0);
    const todayBurned = workouts.reduce((s, w) => s + w.caloriesBurned, 0);
    const latestWeight = weights.length ? weights[weights.length - 1].value : null;

    // BMI calculation
    let bmi = null, bmiCat = '—';
    const h = req.session.user.height;
    if (latestWeight && h) {
      const hm = h / 100;
      bmi = (latestWeight / (hm * hm)).toFixed(1);
      if      (bmi < 18.5) bmiCat = 'Underweight';
      else if (bmi < 25)   bmiCat = 'Normal';
      else if (bmi < 30)   bmiCat = 'Overweight';
      else                 bmiCat = 'Obese';
    }

    // Last 7 days calories for chart
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d    = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const agg  = await Diet.aggregate([
        { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(uid), date: { $gte: d, $lt: next } } },
        { $group: { _id: null, total: { $sum: '$calories' } } }
      ]);
      last7.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), cals: agg[0]?.total || 0 });
    }

    res.render('dashboard', {
      title: 'Dashboard',
      meals, workouts,
      weights,
      goals,
      todayCals,
      todayBurned,
      latestWeight,
      bmi,
      bmiCat,
      last7,
      page: 'dashboard'
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard', {
      title: 'Dashboard',
      meals: [], workouts: [], weights: [], goals: [],
      todayCals: 0, todayBurned: 0, latestWeight: null,
      bmi: null, bmiCat: '—', last7: [], page: 'dashboard'
    });
  }
});

module.exports = router;
