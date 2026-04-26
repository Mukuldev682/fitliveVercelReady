new Chart(document.getElementById('chart-macro'), {
  type: 'doughnut',
  data: {
    labels: ['Protein', 'Carbs', 'Fats'],
    datasets: [{
      data: [macroData.protein, macroData.carbs, macroData.fats],
      backgroundColor: ['#00e5a0', '#f59e0b', '#ff4d6d'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '65%'
  }
});
