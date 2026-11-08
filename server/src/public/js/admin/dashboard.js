/**
 * TechShare Admin Portal - Dashboard Charts & Interactivity
 * Renders Revenue & Orders charts with exact TechShare teal theme (#67BEC3)
 */

document.addEventListener('DOMContentLoaded', function() {
  const chartCanvas = document.getElementById('overviewRevenueChart');
  if (!chartCanvas) return;

  const hasValidData = window.__OVERVIEW_CHART_DATA__ &&
    typeof window.__OVERVIEW_CHART_DATA__ === 'object' &&
    (
      (Array.isArray(window.__OVERVIEW_CHART_DATA__['7d']) && window.__OVERVIEW_CHART_DATA__['7d'].length > 0) ||
      (Array.isArray(window.__OVERVIEW_CHART_DATA__.month) && window.__OVERVIEW_CHART_DATA__.month.length > 0)
    );

  const chartDataStore = hasValidData ? window.__OVERVIEW_CHART_DATA__ : {
    '7d': [
      { name: 'Thứ 2', revenue: 65000000, orders: 8 },
      { name: 'Thứ 3', revenue: 98000000, orders: 12 },
      { name: 'Thứ 4', revenue: 84000000, orders: 10 },
      { name: 'Thứ 5', revenue: 146000000, orders: 18 },
      { name: 'Thứ 6', revenue: 162000000, orders: 20 },
      { name: 'Thứ 7', revenue: 198000000, orders: 25 },
      { name: 'Chủ Nhật', revenue: 185381000, orders: 23 },
    ],
    month: [
      { name: 'Tuần 1', revenue: 165000000, orders: 24 },
      { name: 'Tuần 2', revenue: 210000000, orders: 32 },
      { name: 'Tuần 3', revenue: 198000000, orders: 29 },
      { name: 'Tuần 4', revenue: 265381000, orders: 41 },
    ],
    year: [
      { name: 'Th1', revenue: 52000000, orders: 14 },
      { name: 'Th2', revenue: 64000000, orders: 18 },
      { name: 'Th3', revenue: 78000000, orders: 22 },
      { name: 'Th4', revenue: 85000000, orders: 25 },
      { name: 'Th5', revenue: 92000000, orders: 28 },
      { name: 'Th6', revenue: 110000000, orders: 34 },
      { name: 'Th7', revenue: 125000000, orders: 38 },
      { name: 'Th8', revenue: 118000000, orders: 36 },
      { name: 'Th9', revenue: 135000000, orders: 42 },
      { name: 'Th10', revenue: 148000000, orders: 46 },
      { name: 'Th11', revenue: 162000000, orders: 50 },
      { name: 'Th12', revenue: 185000000, orders: 58 },
    ],
  };

  let currentRange = '7d';
  let chartInstance = null;

  function renderChart(range) {
    const rawData = (chartDataStore && chartDataStore[range]) || (chartDataStore && chartDataStore['7d']) || [];
    const labels = rawData.map(d => d.name);
    const revenues = rawData.map(d => Number(d.revenue) || 0);
    const maxRev = Math.max(...revenues, 0);

    const ctx = chartCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(103, 190, 195, 0.4)');
    gradient.addColorStop(1, 'rgba(103, 190, 195, 0.0)');

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Doanh thu (₫)',
          data: revenues,
          borderColor: '#67BEC3',
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#286E74',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#94A3B8',
            bodyColor: '#67BEC3',
            bodyFont: { weight: 'bold', size: 13 },
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: function(context) {
                const val = context.raw || 0;
                const formatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
                const orderCount = rawData[context.dataIndex]?.orders;
                return orderCount !== undefined
                  ? ` Doanh thu: ${formatted} (${orderCount} đơn)`
                  : ` Doanh thu: ${formatted}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94A3B8', font: { size: 11, family: 'Be Vietnam Pro' } }
          },
          y: {
            beginAtZero: true,
            suggestedMax: maxRev > 0 ? maxRev * 1.15 : 10000000,
            border: { dash: [4, 4] },
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { size: 11, family: 'Be Vietnam Pro' },
              callback: function(val) {
                if (val === 0) return '0 ₫';
                if (val >= 1000000000) {
                  return (val / 1000000000).toFixed(val % 1000000000 === 0 ? 0 : 1) + 'B';
                }
                if (val >= 1000000) {
                  return (val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1) + 'M';
                }
                if (val >= 1000) {
                  return (val / 1000).toFixed(0) + 'k';
                }
                return val.toLocaleString() + ' ₫';
              }
            }
          }
        }
      }
    });
  }

  // Initialize
  renderChart(currentRange);

  // Time range selector clicks
  document.querySelectorAll('.btn-time-range').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.btn-time-range').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#64748B';
        b.style.fontWeight = '600';
        b.style.boxShadow = 'none';
      });
      btn.classList.add('active');
      btn.style.background = '#FFFFFF';
      btn.style.color = '#286E74';
      btn.style.fontWeight = '700';
      btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

      const range = btn.getAttribute('data-range') || '7d';
      currentRange = range;
      renderChart(range);
    });
  });
});
