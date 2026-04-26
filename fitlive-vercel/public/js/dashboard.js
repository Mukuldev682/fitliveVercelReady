// ── Shared Chart Defaults ────────────────────────────
const C = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(31,37,53,.8)' }, ticks: { color: '#6b7699', font: { size: 10 } } },
    y: { grid: { color: 'rgba(31,37,53,.8)' }, ticks: { color: '#6b7699', font: { size: 10 } } }
  }
};

// ── Weekly Calorie Bar Chart ──────────────────────────
new Chart(document.getElementById('chart-calories'), {
  type: 'bar',
  data: {
    labels: last7Labels,
    datasets: [{ data: last7Cals, backgroundColor: 'rgba(0,229,160,.25)', borderColor: '#00e5a0', borderWidth: 2, borderRadius: 6 }]
  },
  options: { ...C }
});

// ── Mini HR sparkline on dashboard ───────────────────
const miniHRData = new Array(20).fill(null);
const miniHRChart = new Chart(document.getElementById('chart-hr-mini'), {
  type: 'line',
  data: {
    labels: miniHRData.map((_, i) => i),
    datasets: [{ data: miniHRData, borderColor: '#ff4d6d', backgroundColor: 'rgba(255,77,109,.07)', tension: 0.4, pointRadius: 0, fill: true, borderWidth: 2 }]
  },
  options: { ...C, animation: { duration: 0 }, scales: { x: { display: false }, y: { ...C.scales.y, suggestedMin: 50, suggestedMax: 150 } } }
});

// ── Full Live HR Chart ────────────────────────────────
const liveHRData = new Array(30).fill(null);
const liveHRChart = new Chart(document.getElementById('chart-hr-live'), {
  type: 'line',
  data: {
    labels: liveHRData.map((_, i) => i),
    datasets: [{ data: liveHRData, borderColor: '#ff4d6d', backgroundColor: 'rgba(255,77,109,.06)', tension: 0.4, pointRadius: 0, fill: true, borderWidth: 2 }]
  },
  options: { ...C, animation: { duration: 0 }, scales: { x: { display: false }, y: { ...C.scales.y, suggestedMin: 50, suggestedMax: 150 } } }
});

// ── Socket.io Real-Time ───────────────────────────────
const socket = io();

socket.on('connect', () => {
  if (typeof currentUserId !== 'undefined') {
    socket.emit('register-user', currentUserId);
  }
});

socket.on('health-data', (data) => {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.textContent = val; };

  set('rt-hr',    data.heartRate);
  set('rt-steps', data.steps != null ? Number(data.steps).toLocaleString() : null);
  set('rt-burn',  data.caloriesBurned);

  // Source badge
  const badge = document.getElementById('data-source-label');
  if (badge) {
    badge.textContent = data.source === 'google_fit' ? '🟢 Google Fit' : '🔵 Simulated';
    badge.style.color = data.source === 'google_fit' ? 'var(--accent)' : 'var(--muted)';
  }

  // Push HR into both charts
  if (data.heartRate) {
    miniHRData.push(data.heartRate); miniHRData.shift();
    miniHRChart.data.datasets[0].data = [...miniHRData];
    miniHRChart.update('none');

    liveHRData.push(data.heartRate); liveHRData.shift();
    liveHRChart.data.datasets[0].data = [...liveHRData];
    liveHRChart.update('none');
  }
});
