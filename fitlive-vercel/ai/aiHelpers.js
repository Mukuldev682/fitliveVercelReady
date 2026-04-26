/**
 * ai/aiHelpers.js
 * ─────────────────────────────────────────────────────────────────
 * Helper functions that pull user data from MongoDB and
 * format it for AI prompts.
 * ─────────────────────────────────────────────────────────────────
 */

const Diet    = require('../models/Diet');
const Workout = require('../models/Workout');
const Weight  = require('../models/Weight');
const Goal    = require('../models/Goal');
const User    = require('../models/User');

/**
 * Gather all stats needed for AI context.
 * Returns a rich stats object used by all 4 AI features.
 */
async function getUserStats(userId) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0,0,0,0);

  const [
    todayMeals,
    todayWorkouts,
    weekMeals,
    weekWorkouts,
    allWeights,
    goals,
    user
  ] = await Promise.all([
    Diet.find({ user: userId, date: { $gte: today } }),
    Workout.find({ user: userId, date: { $gte: today } }),
    Diet.find({ user: userId, date: { $gte: weekAgo } }),
    Workout.find({ user: userId, date: { $gte: weekAgo } }),
    Weight.find({ user: userId }).sort({ date: 1 }),
    Goal.find({ user: userId, achieved: false }),
    User.findById(userId).select('name age gender height')
  ]);

  // Today stats
  const todayCals   = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayBurned = todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0);

  // Week stats
  const avgCals = weekMeals.length
    ? Math.round(weekMeals.reduce((s, m) => s + m.calories, 0) / 7)
    : 0;

  // Weight stats
  const latestWeight = allWeights.length ? allWeights[allWeights.length - 1].value : null;
  const oldestWeight = allWeights.length > 1 ? allWeights[0].value : null;
  let weightChange = null;
  if (latestWeight && oldestWeight) {
    const diff = (latestWeight - oldestWeight).toFixed(1);
    weightChange = diff > 0 ? `+${diff} kg` : `${diff} kg`;
  }

  // BMI
  let bmi = null;
  if (latestWeight && user && user.height) {
    const h = user.height / 100;
    bmi = (latestWeight / (h * h)).toFixed(1);
  }

  // Last 7 days day-by-day calorie data (for anomaly detection)
  const dailyCals = [];
  for (let i = 6; i >= 0; i--) {
    const d    = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayMeals = weekMeals.filter(m => {
      const md = new Date(m.date);
      return md >= d && md < next;
    });
    dailyCals.push(dayMeals.reduce((s, m) => s + m.calories, 0));
  }

  // Last workout date (for anomaly detection)
  const lastWorkout = weekWorkouts.length > 0
    ? weekWorkouts.sort((a,b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  const daysSinceWorkout = lastWorkout
    ? Math.floor((Date.now() - new Date(lastWorkout.date)) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    user,
    todayCals,
    todayBurned,
    workoutsToday: todayWorkouts.length,
    avgCals,
    weekWorkouts:  weekWorkouts.length,
    latestWeight,
    weightChange,
    bmi,
    goals,
    meals:      todayMeals,
    dailyCals,
    daysSinceWorkout,
    weekMealsAll: weekMeals,
    weekWorkoutsAll: weekWorkouts
  };
}

module.exports = { getUserStats };
