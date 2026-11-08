/**
 * TechShare Admin Portal - Advanced Financial & Operational Analytics
 * Renders real-time interactive charts with Chart.js using TechShare teal theme (#67BEC3 / #286E74)
 */

document.addEventListener('DOMContentLoaded', function() {
  window.__ANALYTICS_CHARTS__ = window.__ANALYTICS_CHARTS__ || {};

  // Currency formatter
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num) || 0);
  };

  const formatShortVND = (num) => {
    const val = Number(num) || 0;
    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + 'B';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
    return val.toString();
  };

  // Safe Chart Destroyer
  function destroyChart(key) {
    if (window.__ANALYTICS_CHARTS__[key]) {
      window.__ANALYTICS_CHARTS__[key].destroy();
      window.__ANALYTICS_CHARTS__[key] = null;
    }
  }

  // 1. Chart 1: Revenue & Transaction Trends (Line / Area)
  function renderRevenueTrends(trendsData) {
    const canvas = document.getElementById('revenueTrendsChart');
    if (!canvas) return;
    destroyChart('revenueTrends');

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(103, 190, 195, 0.45)');
    gradient.addColorStop(1, 'rgba(103, 190, 195, 0.0)');

    const labels = (trendsData || []).map(d => d.label);
    const gbvSeries = (trendsData || []).map(d => Number(d.grossBookingValue) || 0);
    const rentalSeries = (trendsData || []).map(d => Number(d.rentalFee) || 0);
    const feeSeries = (trendsData || []).map(d => Number(d.platformFeeRevenue) || 0);

    const maxVal = Math.max(...gbvSeries, ...rentalSeries, 1000000);

    window.__ANALYTICS_CHARTS__.revenueTrends = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Gross Booking Value (GBV)',
            data: gbvSeries,
            borderColor: '#67BEC3',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#67BEC3',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Actual Rental Revenue',
            data: rentalSeries,
            borderColor: '#3B82F6',
            borderWidth: 2,
            borderDash: [5, 4],
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#3B82F6',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Platform Fee Revenue (10%)',
            data: feeSeries,
            borderColor: '#286E74',
            borderWidth: 2.5,
            backgroundColor: 'rgba(40, 110, 116, 0.12)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#FFFFFF',
            pointBorderColor: '#286E74',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#94A3B8',
            bodyColor: '#FFFFFF',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatVND(context.raw)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94A3B8',
              font: { family: 'Be Vietnam Pro', size: 11 },
            },
          },
          y: {
            suggestedMin: 0,
            suggestedMax: Math.ceil(maxVal * 1.15),
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { family: 'Be Vietnam Pro', size: 11 },
              callback: function(val) {
                return formatShortVND(val) + '₫';
              },
            },
          },
        },
      },
    });
  }

  // 2. Chart 2: Booking Status Distribution (Donut)
  function renderBookingStatus(statusData) {
    const canvas = document.getElementById('bookingStatusChart');
    if (!canvas) return;
    destroyChart('bookingStatus');

    const ctx = canvas.getContext('2d');
    const validData = statusData || [];

    const labels = validData.map(d => d.label);
    const counts = validData.map(d => Number(d.count) || 0);
    const colors = validData.map(d => d.color);

    const totalCount = counts.reduce((a, b) => a + b, 0);

    // Empty state fallback
    if (totalCount === 0) {
      window.__ANALYTICS_CHARTS__.bookingStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['No orders'],
          datasets: [{
            data: [1],
            backgroundColor: ['#E2E8F0'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
        },
      });
      return;
    }

    window.__ANALYTICS_CHARTS__.bookingStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function(context) {
                const count = context.raw || 0;
                const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${count} orders (${pct}%)`;
              },
            },
          },
        },
      },
    });

    // Update status breakdown pills underneath
    const pillContainer = document.getElementById('statusBreakdownList');
    if (pillContainer) {
      pillContainer.innerHTML = validData.map(st => `
        <div style="display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; padding: 4px 10px; border-radius: 8px; background: #F8FAFC; border: 1px solid #E2E8F0;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${st.color};"></span>
          <span style="color: #475569; font-weight: 600;">${st.label}:</span>
          <strong style="color: #0F172A;">${st.count}</strong>
          <span style="color: #94A3B8;">(${st.percent}%)</span>
        </div>
      `).join('');
    }
  }

  // 3. Chart 3: Revenue by Device Category (Bar)
  function renderCategoryRevenue(categoryData) {
    const canvas = document.getElementById('categoryRevenueChart');
    if (!canvas) return;
    destroyChart('categoryRevenue');

    const ctx = canvas.getContext('2d');
    const validData = categoryData || [];

    const labels = validData.map(d => d.label);
    const revenues = validData.map(d => Number(d.revenue) || 0);
    const maxVal = Math.max(...revenues, 1000000);

    window.__ANALYTICS_CHARTS__.categoryRevenue = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Rental Revenue',
          data: revenues,
          backgroundColor: '#67BEC3',
          hoverBackgroundColor: '#286E74',
          borderRadius: 6,
          borderSkipped: false,
        }],
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
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function(context) {
                const item = validData[context.dataIndex];
                return ` Rental: ${formatVND(context.raw)} (${item?.percent || 0}% • ${item?.count || 0} orders)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#64748B',
              font: { family: 'Be Vietnam Pro', size: 11.5, weight: '600' },
              maxRotation: 30,
              minRotation: 0,
            },
          },
          y: {
            suggestedMin: 0,
            suggestedMax: Math.ceil(maxVal * 1.15),
            grid: { color: '#F1F5F9' },
            ticks: {
              color: '#94A3B8',
              font: { family: 'Be Vietnam Pro', size: 11 },
              callback: function(val) {
                return formatShortVND(val) + '₫';
              },
            },
          },
        },
      },
    });
  }

  // 4. Booking Conversion Funnel (HTML Steps)
  function renderBookingFunnel(funnelData) {
    const container = document.getElementById('bookingFunnelContainer');
    if (!container) return;

    const stages = funnelData || [];
    container.innerHTML = stages.map((stage, idx) => `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; position: relative;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 11.5px; font-weight: 700; color: #64748B; text-transform: uppercase;">
            Step ${idx + 1}
          </span>
          <span style="font-size: 13px; font-weight: 800; color: #286E74;">
            ${stage.percent}%
          </span>
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 6px;">
          ${stage.label}
        </div>
        <div style="font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 8px;">
          ${stage.count} <span style="font-size: 13px; font-weight: 500; color: #64748B;">orders</span>
        </div>
        <div style="width: 100%; height: 8px; border-radius: 9999px; background: #E2E8F0; overflow: hidden; margin-top: 12px;">
          <div style="width: ${stage.percent}%; height: 100%; border-radius: 9999px; background: ${idx === 3 ? '#16A34A' : '#67BEC3'};"></div>
        </div>
        <div style="font-size: 11px; color: ${idx === 0 ? '#64748B' : (stage.dropoffPercent > 0 ? '#DC2626' : '#16A34A')}; margin-top: 8px; font-weight: 600;">
          ${idx === 0 ? 'Initial Start Point' : (stage.dropoffPercent > 0 ? `↓ Drop-off: ${stage.dropoffPercent}%` : '✓ 100% Retained')}
        </div>
      </div>
    `).join('');
  }

  // Update KPI Cards in DOM
  function updateKpis(kpi) {
    if (!kpi) return;
    const gbvEl = document.getElementById('kpiGrossBookingValue');
    const revEl = document.getElementById('kpiPlatformRevenue');
    const growthEl = document.getElementById('kpiGbvGrowth');

    const compEl = document.getElementById('kpiCompletionRate');
    const compDesc = document.getElementById('kpiCompletionDesc');
    const cancEl = document.getElementById('kpiCancellationRate');
    const cancDesc = document.getElementById('kpiCancellationDesc');

    if (gbvEl) gbvEl.textContent = formatVND(kpi.grossBookingValue);
    if (revEl) revEl.textContent = formatVND(kpi.platformFeeRevenue);

    if (growthEl && kpi.growth) {
      const g = kpi.growth.gbvGrowthPercent;
      growthEl.textContent = `${g >= 0 ? '↑ +' : '↓ '}${g}% vs prior period`;
      growthEl.style.color = g >= 0 ? '#16A34A' : '#DC2626';
    }

    if (compEl) compEl.textContent = `${kpi.completionRate}%`;
    if (compDesc) compDesc.textContent = `${kpi.completedBookings || 0} / ${kpi.totalBookings || 0} successful orders`;

    if (cancEl) cancEl.textContent = `${kpi.cancellationRate}%`;
    if (cancDesc) cancDesc.textContent = `${kpi.cancelledBookings || 0} / ${kpi.totalBookings || 0} cancelled / rejected orders`;
  }

  // Fetch updated data from API
  async function fetchAnalytics(period, startDate, endDate) {
    let url = `/api/admin/analytics/advanced?period=${encodeURIComponent(period)}`;
    if (period === 'custom' && startDate && endDate) {
      url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    }

    // Update Export link
    const exportBtn = document.getElementById('btnExportAnalyticsCsv');
    if (exportBtn) {
      let exportUrl = `/api/admin/analytics/export?period=${encodeURIComponent(period)}`;
      if (period === 'custom' && startDate && endDate) {
        exportUrl += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      exportBtn.href = exportUrl;
    }

    try {
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.message || 'Failed to load analytics data');
      }

      const d = json.data;
      updateKpis(d.kpi);
      renderRevenueTrends(d.revenueTrends);
      renderBookingStatus(d.bookingStatusDistribution);
      renderCategoryRevenue(d.revenueByCategory);
      renderBookingFunnel(d.bookingFunnel);

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      if (window.showAdminToast) {
        window.showAdminToast('Failed to load analytics data: ' + err.message, 'error');
      }
    }
  }

  // Bind Period Tab Controls
  const periodTabs = document.querySelectorAll('#analyticsPeriodTabs .admin-tab-pill');
  const customBox = document.getElementById('customDateRangeBox');
  const customBtn = document.getElementById('btnApplyCustomDate');

  periodTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const period = tab.getAttribute('data-period');
      periodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (period === 'custom') {
        if (customBox) customBox.style.display = 'flex';
      } else {
        if (customBox) customBox.style.display = 'none';
        fetchAnalytics(period);
      }
    });
  });

  if (customBtn) {
    customBtn.addEventListener('click', function() {
      const start = document.getElementById('customStartDate')?.value;
      const end = document.getElementById('customEndDate')?.value;
      if (!start || !end) {
        if (window.showAdminToast) window.showAdminToast('Please select start and end dates', 'warning');
        return;
      }
      if (new Date(start) > new Date(end)) {
        if (window.showAdminToast) window.showAdminToast('Start date cannot be after end date', 'warning');
        return;
      }
      fetchAnalytics('custom', start, end);
    });
  }

  // Load Initial Server-Side Data
  try {
    const rawDataScript = document.getElementById('analyticsInitialData');
    if (rawDataScript && rawDataScript.textContent) {
      const initialData = JSON.parse(rawDataScript.textContent);
      if (initialData && initialData.kpi) {
        renderRevenueTrends(initialData.revenueTrends);
        renderBookingStatus(initialData.bookingStatusDistribution);
        renderCategoryRevenue(initialData.revenueByCategory);
        renderBookingFunnel(initialData.bookingFunnel);
      } else {
        fetchAnalytics('30d');
      }
    } else {
      fetchAnalytics('30d');
    }
  } catch (err) {
    console.warn('Initial data parse warning, fallback to fetch:', err);
    fetchAnalytics('30d');
  }
});
