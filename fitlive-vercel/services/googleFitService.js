const { google } = require('googleapis');
const { buildAuthClient } = require('../config/googleFit');

const fitness = google.fitness('v1');

// ─── Time Helpers ─────────────────────────────────────────────────────────────

function todayRange() {
  const now   = new Date();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return {
    startMs: start.getTime().toString(),
    endMs:   now.getTime().toString()
  };
}

function lastNDaysRange(n = 7) {
  const now   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  start.setHours(0, 0, 0, 0);
  return {
    startMs: start.getTime().toString(),
    endMs:   now.getTime().toString()
  };
}

// ─── Helper: extract value from aggregate bucket ──────────────────────────────

function sumBuckets(buckets, type = 'int') {
  let total = 0;
  (buckets || []).forEach(bucket => {
    (bucket.dataset || []).forEach(ds => {
      (ds.point || []).forEach(pt => {
        (pt.value || []).forEach(v => {
          total += type === 'int' ? (v.intVal || 0) : (v.fpVal || 0);
        });
      });
    });
  });
  return total;
}

function latestFromBuckets(buckets, type = 'fp') {
  let latest = null;
  (buckets || []).forEach(bucket => {
    (bucket.dataset || []).forEach(ds => {
      (ds.point || []).forEach(pt => {
        (pt.value || []).forEach(v => {
          const val = type === 'int' ? v.intVal : v.fpVal;
          if (val != null) latest = val;
        });
      });
    });
  });
  return latest;
}

// ─── Today's Step Count ───────────────────────────────────────────────────────

async function getTodaySteps(user) {
  try {
    const auth  = buildAuthClient(user);
    const range = todayRange();
    const res = await fitness.users.dataset.aggregate({
      userId: 'me', auth,
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: range.startMs,
        endTimeMillis:   range.endMs
      }
    });
    return Math.round(sumBuckets(res.data.bucket, 'int'));
  } catch (err) {
    console.error('GFit steps error:', err.message);
    return null;
  }
}

// ─── Today's Calories Burned ─────────────────────────────────────────────────

async function getTodayCaloriesBurned(user) {
  try {
    const auth  = buildAuthClient(user);
    const range = todayRange();
    const res = await fitness.users.dataset.aggregate({
      userId: 'me', auth,
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: range.startMs,
        endTimeMillis:   range.endMs
      }
    });
    return Math.round(sumBuckets(res.data.bucket, 'fp'));
  } catch (err) {
    console.error('GFit calories error:', err.message);
    return null;
  }
}

// ─── Latest Heart Rate ────────────────────────────────────────────────────────

async function getLatestHeartRate(user) {
  try {
    const auth  = buildAuthClient(user);
    const range = lastNDaysRange(1);
    const res = await fitness.users.dataset.aggregate({
      userId: 'me', auth,
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
        bucketByTime: { durationMillis: '3600000' }, // 1-hour buckets
        startTimeMillis: range.startMs,
        endTimeMillis:   range.endMs
      }
    });
    const val = latestFromBuckets(res.data.bucket, 'fp');
    return val ? Math.round(val) : null;
  } catch (err) {
    console.error('GFit HR error:', err.message);
    return null;
  }
}

// ─── Latest Weight from Google Fit ───────────────────────────────────────────

async function getLatestWeight(user) {
  try {
    const auth  = buildAuthClient(user);
    const range = lastNDaysRange(30);
    const res = await fitness.users.dataset.aggregate({
      userId: 'me', auth,
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.weight' }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: range.startMs,
        endTimeMillis:   range.endMs
      }
    });
    const val = latestFromBuckets(res.data.bucket, 'fp');
    return val ? parseFloat(val.toFixed(1)) : null;
  } catch (err) {
    console.error('GFit weight error:', err.message);
    return null;
  }
}

// ─── Weekly Steps (last 7 days, per day) ─────────────────────────────────────

async function getWeeklySteps(user) {
  try {
    const auth  = buildAuthClient(user);
    const range = lastNDaysRange(7);
    const res = await fitness.users.dataset.aggregate({
      userId: 'me', auth,
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: range.startMs,
        endTimeMillis:   range.endMs
      }
    });
    return (res.data.bucket || []).map(b => {
      const d = new Date(parseInt(b.startTimeMillis));
      let steps = 0;
      (b.dataset || []).forEach(ds => (ds.point || []).forEach(pt => (pt.value || []).forEach(v => { steps += v.intVal || 0; })));
      return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), steps: Math.round(steps) };
    });
  } catch (err) {
    console.error('GFit weekly steps error:', err.message);
    return [];
  }
}

// ─── Weekly Calories Burned (last 7 days) ────────────────────────────────────

async function getWeeklyCaloriesBurned(user) {
  try {
    const auth  = buildAuthClient(user);
    const range = lastNDaysRange(7);
    const res = await fitness.users.dataset.aggregate({
      userId: 'me', auth,
      requestBody: {
        aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
        bucketByTime: { durationMillis: '86400000' },
        startTimeMillis: range.startMs,
        endTimeMillis:   range.endMs
      }
    });
    return (res.data.bucket || []).map(b => {
      const d = new Date(parseInt(b.startTimeMillis));
      let cals = 0;
      (b.dataset || []).forEach(ds => (ds.point || []).forEach(pt => (pt.value || []).forEach(v => { cals += v.fpVal || 0; })));
      return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), cals: Math.round(cals) };
    });
  } catch (err) {
    console.error('GFit weekly calories error:', err.message);
    return [];
  }
}

// ─── All Live Metrics at Once ─────────────────────────────────────────────────

async function getLiveHealthData(user) {
  const [steps, caloriesBurned, heartRate, weight] = await Promise.all([
    getTodaySteps(user),
    getTodayCaloriesBurned(user),
    getLatestHeartRate(user),
    getLatestWeight(user)
  ]);
  return { steps, caloriesBurned, heartRate, weight };
}

module.exports = {
  getTodaySteps,
  getTodayCaloriesBurned,
  getLatestHeartRate,
  getLatestWeight,
  getWeeklySteps,
  getWeeklyCaloriesBurned,
  getLiveHealthData
};
