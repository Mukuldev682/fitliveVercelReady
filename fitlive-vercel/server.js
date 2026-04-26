/**
 * Local development server — keeps Socket.io working for real-time features.
 * Vercel uses api/index.js instead (no Socket.io; see note there).
 *
 * Run locally:  npm run dev  or  npm start
 */

require('dotenv').config();
const http     = require('http');
const socketIo = require('socket.io');
const app      = require('./api/index');   // shared Express app

const server = http.createServer(app);
const io     = socketIo(server);

// ── Socket.io – Real-Time Health Data ─────────────────
const User = require('./models/User');
const { getLiveHealthData } = require('./services/googleFitService');

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  let userId   = null;
  let simState = { heartRate: 72, steps: 0, caloriesBurned: 0 };

  socket.on('register-user', (uid) => {
    userId = uid;
    console.log('Socket user registered:', uid);
  });

  const interval = setInterval(async () => {
    try {
      if (userId) {
        const dbUser = await User.findById(userId)
          .select('googleFitConnected googleAccessToken googleRefreshToken googleTokenExpiry _id');

        if (dbUser && dbUser.googleFitConnected) {
          const data = await getLiveHealthData(dbUser);
          socket.emit('health-data', {
            source:         'google_fit',
            heartRate:      data.heartRate      ?? simState.heartRate,
            steps:          data.steps          ?? simState.steps,
            caloriesBurned: data.caloriesBurned ?? simState.caloriesBurned,
            weight:         data.weight         ?? null,
            timestamp:      new Date().toLocaleTimeString()
          });
          return;
        }
      }

      simState.heartRate = Math.max(55, Math.min(140,
        Math.round(simState.heartRate + (Math.random() - 0.45) * 4)
      ));
      simState.steps          += Math.floor(Math.random() * 3);
      simState.caloriesBurned  = Math.round(simState.steps * 0.04);

      socket.emit('health-data', {
        source:         'simulated',
        heartRate:      simState.heartRate,
        steps:          simState.steps,
        caloriesBurned: simState.caloriesBurned,
        weight:         null,
        timestamp:      new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error('Socket interval error:', err.message);
    }
  }, 3000);

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    clearInterval(interval);
  });
});

// ── Start Server ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('FitLive running at http://localhost:' + PORT);
  console.log('');
});
