let trafficRangeSeconds = 3600;
let trafficRefreshTimer = null;
let trafficStreamRetryTimer = null;

function getTrafficInterval(rangeSeconds) {
  if (rangeSeconds <= 3600) return 60;
  if (rangeSeconds <= 21600) return 300;
  return 900;
}

function formatShortTime(unixSeconds) {
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRangeLabel(rangeSeconds) {
  if (rangeSeconds <= 900) return '15m';
  if (rangeSeconds <= 3600) return '1h';
  if (rangeSeconds <= 21600) return '6h';
  return '24h';
}

function drawTrafficChart(points) {
  const canvas = document.getElementById('traffic-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 20, right: 24, bottom: 34, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (!Array.isArray(points) || points.length === 0) {
    ctx.fillStyle = '#5d6a78';
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('No data in selected time window', padding.left, padding.top + 20);
    return;
  }

  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.blocked || 0, p.pending || 0)));
  const xAt = (idx) => padding.left + (idx / Math.max(points.length - 1, 1)) * chartWidth;
  const yAt = (value) => padding.top + chartHeight - (value / maxValue) * chartHeight;

  ctx.strokeStyle = '#e1e7ee';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#d2dae3';
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  function drawSeries(field, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, idx) => {
      const x = xAt(idx);
      const y = yAt(point[field] || 0);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  drawSeries('pending', '#1f7a8c');
  drawSeries('blocked', '#c0392b');

  ctx.fillStyle = '#4b5867';
  ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const first = points[0];
  const mid = points[Math.floor(points.length / 2)];
  const last = points[points.length - 1];
  ctx.fillText(formatShortTime(first.ts), padding.left, height - 10);
  ctx.fillText(formatShortTime(mid.ts), padding.left + chartWidth / 2 - 20, height - 10);
  ctx.fillText(formatShortTime(last.ts), padding.left + chartWidth - 42, height - 10);

  ctx.fillStyle = '#1f7a8c';
  ctx.fillRect(width - 184, 14, 12, 12);
  ctx.fillStyle = '#1a2430';
  ctx.fillText('Pending queue', width - 165, 24);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(width - 88, 14, 12, 12);
  ctx.fillStyle = '#1a2430';
  ctx.fillText('Blocked', width - 69, 24);
}

function renderVectorBreakdown(byVector) {
  const list = document.getElementById('vector-breakdown');
  if (!list) return;

  list.innerHTML = '';
  const entries = Object.entries(byVector || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'No blocked traffic in selected window';
    item.style.cursor = 'default';
    list.appendChild(item);
    return;
  }

  entries.forEach(([name, count]) => {
    const item = document.createElement('li');
    item.style.cursor = 'default';
    item.textContent = `${name}: ${count}`;
    list.appendChild(item);
  });
}

async function refreshTrafficChart() {
  const now = Math.floor(Date.now() / 1000);
  const from = now - trafficRangeSeconds;
  const interval = getTrafficInterval(trafficRangeSeconds);
  const response = await fetch(`/api/admin/traffic?from=${from}&to=${now}&interval=${interval}`);
  if (!response.ok) {
    throw new Error(`Traffic request failed (${response.status})`);
  }

  const payload = await response.json();
  drawTrafficChart(payload.time_series || []);
  const rangeLabel = document.getElementById('metric-window');
  if (rangeLabel) rangeLabel.textContent = formatRangeLabel(trafficRangeSeconds);
  const blockedMetric = document.getElementById('metric-blocked');
  const pendingMetric = document.getElementById('metric-pending');
  const blockedChartMetric = document.getElementById('metric-blocked-chart');
  const pendingChartMetric = document.getElementById('metric-pending-chart');
  const queueMetric = document.getElementById('metric-queue');
  if (blockedMetric) blockedMetric.textContent = String(payload.blocked || 0);
  if (pendingMetric) pendingMetric.textContent = String(payload.pending || 0);
  if (blockedChartMetric) blockedChartMetric.textContent = String(payload.blocked || 0);
  if (pendingChartMetric) pendingChartMetric.textContent = String(payload.pending || 0);
  if (queueMetric) queueMetric.textContent = String((payload.blocked || 0) + (payload.pending || 0));
  const count = document.getElementById('count');
  if (count) count.textContent = `${payload.pending || 0} pending requests`;
  renderVectorBreakdown(payload.by_vector || {});
}

function scheduleTrafficRefresh(delayMs = 400) {
  if (trafficRefreshTimer) clearTimeout(trafficRefreshTimer);
  trafficRefreshTimer = setTimeout(() => {
    refreshTrafficChart().catch(() => {
      // Keep the dashboard resilient if the backend is temporarily unavailable.
    });
  }, delayMs);
}

function connectTrafficStream() {
  if (!window.EventSource) return;

  const source = new EventSource('/api/admin/stream');
  source.addEventListener('update', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      const count = document.getElementById('count');
      if (count && typeof payload.pending_count === 'number') {
        count.textContent = `${payload.pending_count} pending requests`;
      }
    } catch (_err) {
      // Ignore malformed stream payloads and continue.
    }
    scheduleTrafficRefresh(300);
  });

  source.onerror = () => {
    source.close();
    if (trafficStreamRetryTimer) clearTimeout(trafficStreamRetryTimer);
    trafficStreamRetryTimer = setTimeout(connectTrafficStream, 3000);
  };
}

function initDashboard() {
  const rangeSelect = document.getElementById('traffic-range');
  if (rangeSelect) {
    rangeSelect.addEventListener('change', (event) => {
      trafficRangeSeconds = parseInt(event.target.value, 10) || 3600;
      const rangeLabel = document.getElementById('metric-window');
      if (rangeLabel) rangeLabel.textContent = formatRangeLabel(trafficRangeSeconds);
      scheduleTrafficRefresh(0);
    });
  }

  refreshTrafficChart().catch(() => {
    const count = document.getElementById('count');
    if (count) count.textContent = 'Unable to load dashboard metrics';
  });
  connectTrafficStream();
}

window.refreshTrafficChart = refreshTrafficChart;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
