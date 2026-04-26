new Chart(document.getElementById('chart-wo-type'), {
  type: 'doughnut',
  data: {
    labels: woTypeLabels,
    datasets: [{
      data: woTypeCounts,
      backgroundColor: ['#00e5a0','#00b4d8','#f59e0b','#ff4d6d','#a78bfa','#6b7699'],
      borderWidth: 0
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#6b7699', font: { size: 11 }, padding: 14 } } },
    cutout: '55%'
  }
});
