/**
 * routes/ai.js
 * ─────────────────────────────────────────────────────────────────
 * All AI-powered routes (Google Gemini 1.5 Flash — FREE tier):
 *   GET  /ai/coach         → AI Coach chat page
 *   POST /ai/chat          → AI Fitness Coach message
 *   POST /ai/meal          → Smart Meal Nutrition Auto-fill
 *   GET  /ai/summary       → Weekly Health Summary
 *   GET  /ai/anomalies     → Anomaly Detection alerts
 * ─────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();
const { ensureAuth }  = require('../middleware/auth');
const { chatCompletion: groqChat } = require('../ai/groqClient');
const {
  coachSystemPrompt,
  mealNutritionPrompt,
  weeklySummaryPrompt,
  anomalyDetectionPrompt,
  buildUserContext
} = require('../ai/coachPrompts');
const { getUserStats } = require('../ai/aiHelpers');

// Helper: Use Groq API only
async function chatCompletion(messages, maxTokens = 300) {
  console.log('DEBUG: Using Groq API');
  
  try {
    const response = await groqChat(messages, maxTokens);
    console.log('DEBUG: Got Groq response');
    return response;
  } catch (error) {
    console.error('Groq error:', error.message);
    throw error;
  }
}



// Helper: format Groq errors into user-friendly messages
function friendlyError(err) {
  const msg = err.message || '';
  
  if (msg.includes('GROQ_KEY_MISSING')) {
    return ' Groq API key not set. Add to .env: GROQ_API_KEY=your_key_here (Free key: https://console.groq.com/keys)';
  }
  if (msg.includes('401') || msg.includes('Invalid API Key')) {
    return ' Invalid Groq API key. Check your API key in .env file.';
  }
  if (msg.includes('429') || msg.includes('Rate limit')) {
    return ' Groq rate limit exceeded. Please wait a moment and try again.';
  }
  if (msg.includes('403') || msg.includes('Permission denied')) {
    return ' Groq API permission denied. Check your API key and billing settings.';
  }
  if (msg.includes('404') || msg.includes('not found')) {
    return ' Groq model not found. Try restarting the server.';
  }
  if (msg.includes('timed out')) {
    return ' Groq request timed out. Please check your internet connection.';
  }
  if (msg.includes('Cannot reach')) {
    return ' Cannot connect to Groq. Check your internet connection.';
  }
  
  return ' Groq error: ' + msg;
}

// ── GET /ai/coach  →  Coach chat page ─────────────────────────────
router.get('/coach', ensureAuth, async (req, res) => {
  try {
    const stats = await getUserStats(req.session.user._id);
    res.render('coach', {
      title: 'AI Coach',
      page:  'coach',
      stats,
      groqConfigured: !!(process.env.GROQ_API_KEY &&
        process.env.GROQ_API_KEY !== 'YOUR_GROQ_API_KEY_HERE')
    });
  } catch (err) {
    console.error('Coach page error:', err);
    req.flash('error_msg', 'Could not load AI Coach: ' + err.message);
    res.redirect('/dashboard');
  }
});

// ── POST /ai/chat  →  Fitness Coach message ───────────────────────
router.post('/chat', ensureAuth, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Pull user's real stats from MongoDB → inject into AI context
    const stats       = await getUserStats(req.session.user._id);
    const userContext = buildUserContext(req.session.user, stats);

    // Build messages: system prompt + conversation history + new message
    const messages = [
      { role: 'system', content: coachSystemPrompt(userContext) }
    ];

    // Include last 10 turns of conversation
    if (Array.isArray(history)) {
      history.slice(-10).forEach(h => {
        if (h.role && h.content) {
          messages.push({ role: h.role, content: h.content });
        }
      });
    }

    messages.push({ role: 'user', content: message.trim() });

    const reply = await chatCompletion(messages, 600);
    res.json({ reply, timestamp: new Date().toLocaleTimeString() });

  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// ── POST /ai/meal  →  Nutrition Auto-fill ─────────────────────────
router.post('/meal', ensureAuth, async (req, res) => {
  try {
    const { foodName, servingSize } = req.body;

    if (!foodName || !foodName.trim()) {
      return res.status(400).json({ error: 'Food name is required.' });
    }

    const userMessage = servingSize && servingSize.trim()
      ? `Food: ${foodName.trim()}, Serving size: ${servingSize.trim()}`
      : `Food: ${foodName.trim()}`;

    const messages = [
      { role: 'system', content: mealNutritionPrompt() },
      { role: 'user',   content: userMessage }
    ];

    // Use Gemini API for nutrition data
    const rawResponse = await chatCompletion(messages, 200);
    console.log('DEBUG: Got Gemini nutrition response');

    // Parse Gemini JSON response
    let nutrition;
    try {
      // Clean response and parse JSON
      const cleaned = rawResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
      
      nutrition = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Nutrition JSON parse failed. Raw response:', rawResponse);
      throw new Error('Gemini returned invalid nutrition format');
    }

    // Validate all required numeric fields
    const fields = ['calories', 'protein', 'carbs', 'fats'];
    for (const f of fields) {
      if (typeof nutrition[f] !== 'number') {
        nutrition[f] = parseFloat(nutrition[f]) || 0;
      }
    }

    if (!nutrition.mealName) {
      nutrition.mealName = foodName.trim();
    }

    res.json({ success: true, nutrition });

  } catch (err) {
    console.error('AI meal error:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// ── GET /ai/summary  →  Weekly Health Summary ─────────────────────
router.get('/summary', ensureAuth, async (req, res) => {
  try {
    const stats = await getUserStats(req.session.user._id);

    const totalBurned = stats.weekWorkoutsAll
      ? stats.weekWorkoutsAll.reduce((s, w) => s + (w.caloriesBurned || 0), 0)
      : 0;

    const dataDescription = [
      `User: ${req.session.user.name}`,
      `This week's fitness data:`,
      `- Total meals logged: ${stats.weekMealsAll ? stats.weekMealsAll.length : 0}`,
      `- Average daily calories: ${stats.avgCals} kcal`,
      `- Total workouts completed: ${stats.weekWorkouts}`,
      `- Total calories burned from workouts: ${totalBurned} kcal`,
      `- Current weight: ${stats.latestWeight ? stats.latestWeight + ' kg' : 'not logged'}`,
      `- Weight change: ${stats.weightChange || 'insufficient data'}`,
      `- Current BMI: ${stats.bmi || 'not calculated'}`,
      `- Active goals: ${stats.goals.length > 0 ? stats.goals.map(g => g.title).join(', ') : 'none set'}`,
      `- Daily calorie intake (last 7 days): ${stats.dailyCals.join(', ')} kcal`,
      `- Days since last workout: ${stats.daysSinceWorkout >= 999 ? 'no workouts recorded' : stats.daysSinceWorkout}`
    ].join('\n');

    const messages = [
      { role: 'system', content: weeklySummaryPrompt() },
      { role: 'user',   content: `Generate my weekly health summary:\n\n${dataDescription}` }
    ];

    const summary = await chatCompletion(messages, 600);

    res.json({
      success:     true,
      summary,
      generatedAt: new Date().toLocaleString()
    });

  } catch (err) {
    console.error('AI summary error:', err.message);
    res.status(500).json({ error: friendlyError(err) });
  }
});

// ── GET /ai/anomalies  →  Anomaly Detection ───────────────────────
router.get('/anomalies', ensureAuth, async (req, res) => {
  try {
    const stats = await getUserStats(req.session.user._id);

    // Skip if not enough data to analyse
    if (stats.weekWorkouts === 0 && stats.todayCals === 0) {
      return res.json({ success: true, anomalies: [] });
    }

    const dataDescription = [
      `Daily calorie intake this week: ${stats.dailyCals.join(', ')} kcal`,
      `Average daily calories this week: ${stats.avgCals} kcal`,
      `Today's calories so far: ${stats.todayCals} kcal`,
      `Days since last workout: ${stats.daysSinceWorkout >= 999 ? 'no workouts on record' : stats.daysSinceWorkout}`,
      `Total workouts this week: ${stats.weekWorkouts}`,
      `Current weight: ${stats.latestWeight ? stats.latestWeight + ' kg' : 'not logged'}`,
      `BMI: ${stats.bmi || 'not calculated'}`,
      `Active goals: ${stats.goals.length}`
    ].join('\n');

    const messages = [
      { role: 'system', content: anomalyDetectionPrompt() },
      { role: 'user',   content: `Analyze this fitness data and return JSON array of anomalies:\n\n${dataDescription}` }
    ];

    const rawResponse = await chatCompletion(messages, 400);

    const cleaned = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/,      '')
      .replace(/```\s*$/,      '')
      .trim();

    let anomalies = [];
    try {
      anomalies = JSON.parse(cleaned);
      if (!Array.isArray(anomalies)) anomalies = [];
    } catch (e) {
      console.error('Anomaly JSON parse failed:', rawResponse);
      anomalies = [];
    }

    res.json({ success: true, anomalies });

  } catch (err) {
    console.error('AI anomaly error:', err.message);
    // Silent fail for anomalies — non-critical, don't break the page
    res.json({ success: true, anomalies: [] });
  }
});

module.exports = router;
