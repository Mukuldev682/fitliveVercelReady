new Chart(document.getElementById('chart-weight'), {
  type: 'line',
  data: {
    labels: weightLabels,
    datasets: [{
      label: 'Weight (kg)',
      data: weightValues,
      borderColor: '#00b4d8',
      backgroundColor: 'rgba(0,180,216,.08)',
      tension: 0.4,
      pointBackgroundColor: '#00b4d8',
      pointRadius: 5,
      fill: true,
      borderWidth: 2
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(31,37,53,.8)' }, ticks: { color: '#6b7699', font: { size: 10 } } },
      y: { grid: { color: 'rgba(31,37,53,.8)' }, ticks: { color: '#6b7699', font: { size: 10 } } }
    }
  }
});
