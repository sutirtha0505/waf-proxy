let lastCount = -1;
let page = 0;
const PAGE_SIZE = 25;
let totalPending = 0;
let refreshInFlight = false;
let needsRefresh = false;
let streamRetryTimer = null;

function formatTimestamp(unixSeconds) {
  if (!unixSeconds) return 'Unknown time';
  const date = new Date(unixSeconds * 1000);
  return `${unixSeconds} • ${date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getDecisionState(row) {
  if (row?.blocked_by_ai) return 'blocked';
  if (row?.was_fail_open) return 'fail-open';
  if (row?.decision_state === 'ai_review') return 'ai-reviewed';
  if (row?.decision_state === 'pending_review') return 'pending';
  return row?.decision_state || 'unknown';
}

function getStatusClass(row) {
  if (row?.blocked_by_ai) return 'blocked';
  if (row?.was_fail_open) return 'warning';
  if (row?.decision_state === 'ai_review') return 'info';
  return 'pending';
}

function renderRequestRow(row, { blocked = false } = {}) {
  const li = document.createElement('li');
  li.className = `request-row ${blocked ? 'is-blocked' : ''} ${row?.was_fail_open ? 'is-fail-open' : ''} ${row?.decision_state === 'pending_review' ? 'is-pending' : ''}`.trim();

  const top = document.createElement('div');
  top.className = 'request-top';

  const titleWrap = document.createElement('div');
  const route = document.createElement('div');
  route.className = 'request-route';
  route.textContent = `${row.method || 'GET'} ${row.path || '/'}`;
  const id = document.createElement('div');
  id.className = 'request-id';
  id.textContent = row.request_id || 'Unknown request';
  titleWrap.appendChild(route);
  titleWrap.appendChild(id);

  const badge = document.createElement('span');
  badge.className = `badge ${getStatusClass(row)}`;
  badge.textContent = getDecisionState(row);

  top.appendChild(titleWrap);
  top.appendChild(badge);

  const body = document.createElement('div');
  body.className = 'request-body';
  const decision = row.decision_summary || 'Pending human review';
  const confidence = row.confidence_label ? `Confidence ${row.confidence_label}` : 'Confidence n/a';
  const timestamp = formatTimestamp(row.timestamp);
  body.textContent = `${decision} • ${confidence} • ${timestamp}`;

  const meta = document.createElement('div');
  meta.className = 'request-metadata';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'ghost-button';
  openBtn.textContent = 'Open review';
  openBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    window.openReview(row.request_id);
  });

  const checkWrap = document.createElement('label');
  checkWrap.className = 'chip';
  checkWrap.addEventListener('click', (event) => event.stopPropagation());
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.dataset.id = row.request_id;
  cb.className = 'request-checkbox';
  cb.addEventListener('click', (event) => event.stopPropagation());
  cb.addEventListener('change', () => {
    const selectAll = document.getElementById('select-all-cb');
    if (!selectAll) return;
    const all = Array.from(document.querySelectorAll('.request-checkbox'));
    selectAll.checked = all.length > 0 && all.every((c) => c.checked);
  });
  const checkLabel = document.createElement('span');
  checkLabel.textContent = 'Select';
  checkWrap.appendChild(cb);
  checkWrap.appendChild(checkLabel);

  const tsChip = document.createElement('span');
  tsChip.className = 'pill';
  tsChip.textContent = timestamp;

  meta.appendChild(openBtn);
  meta.appendChild(checkWrap);
  meta.appendChild(tsChip);

  li.appendChild(top);
  li.appendChild(body);
  li.appendChild(meta);

  li.addEventListener('click', () => window.openReview(row.request_id));
  return li;
}

async function refreshRequestList() {
  if (refreshInFlight) {
    needsRefresh = true;
    return;
  }

  refreshInFlight = true;
  const list = document.getElementById("request-list");
  if (!list) {
    refreshInFlight = false;
    return;
  }

  try {
    const [blockedRes, res] = await Promise.all([
      fetch('/api/admin/blocked'),
      fetch(`/api/admin/requests?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`),
    ]);
    const blocked = blockedRes.ok ? await blockedRes.json() : [];
    const rows = res.ok ? await res.json() : [];

    totalPending = parseInt(res.headers.get('x-total-count') || '0', 10);
    if (Number.isNaN(totalPending) || totalPending < 0) {
      totalPending = 0;
    }

    const totalPages = Math.max(1, Math.ceil(totalPending / PAGE_SIZE));
    if (page >= totalPages && totalPending > 0) {
      page = totalPages - 1;
      refreshInFlight = false;
      return refreshRequestList();
    }

    list.innerHTML = "";

    // Render the latest blocked items first as a live context banner list.
    blocked.slice(0, 10).forEach((row) => {
      list.appendChild(renderRequestRow(row, { blocked: true }));
    });

    rows.forEach((row) => {
      const rowEl = renderRequestRow(row);
      const selectAll = document.getElementById('select-all-cb');
      if (selectAll && selectAll.checked) {
        const checkbox = rowEl.querySelector('.request-checkbox');
        if (checkbox) checkbox.checked = true;
      }
      list.appendChild(rowEl);
    });

    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
      pageInfo.textContent = `Page ${totalPending === 0 ? 0 : page + 1} / ${totalPages} (${totalPending} pending)`;
    }
    const prev = document.getElementById('prev-page');
    const next = document.getElementById('next-page');
    if (prev) prev.disabled = page === 0;
    if (next) next.disabled = totalPending === 0 || page >= totalPages - 1;

    const label = document.getElementById("count");
    if (label) label.textContent = `${totalPending} pending requests`;
    const queueMetric = document.getElementById('metric-queue');
    if (queueMetric) queueMetric.textContent = String(totalPending + blocked.length);
    lastCount = totalPending;
  } catch (err) {
    setBulkStatus(`Refresh error: ${err.message || String(err)}`);
  } finally {
    refreshInFlight = false;
    if (needsRefresh) {
      needsRefresh = false;
      refreshRequestList();
    }
  }
}

function getSelectedIds() {
  return Array.from(document.querySelectorAll('.request-checkbox:checked')).map((el) => el.dataset.id);
}

async function bulkSafe() {
  const ids = getSelectedIds();
  if (ids.length === 0) return alert('No requests selected');
  setBulkStatus('Processing...');
  const res = await fetch('/api/admin/requests/bulk/safe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setBulkStatus('Error: ' + (err.error || res.statusText));
  } else {
    setBulkStatus('Done');
    refreshRequestList();
  }
}

async function bulkDelete() {
  const ids = getSelectedIds();
  if (ids.length === 0) return alert('No requests selected');
  if (!confirm(`Delete ${ids.length} selected requests?`)) return;
  setBulkStatus('Deleting...');
  const res = await fetch('/api/admin/requests/bulk/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setBulkStatus('Error: ' + (err.error || res.statusText));
  } else {
    setBulkStatus('Deleted');
    refreshRequestList();
  }
}

async function bulkUnsafe() {
  const ids = getSelectedIds();
  if (ids.length === 0) return alert('No requests selected');
  // fetch vectors and ask user to choose one
  const vectors = await fetch('/api/admin/vectors').then((r) => r.json());
  const names = Object.keys(vectors);
  if (names.length === 0) return alert('No attack vectors defined');
  const choice = prompt('Enter attack vector name:\n' + names.join(', '));
  if (!choice) return;
  const code = vectors[choice];
  if (!code) return alert('Unknown vector: ' + choice);
  setBulkStatus('Processing...');
  const items = ids.map((id) => ({ id, vector_name: choice, code }));
  const res = await fetch('/api/admin/requests/bulk/unsafe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    setBulkStatus('Error: ' + (err.error || res.statusText));
  } else {
    setBulkStatus('Done');
    refreshRequestList();
  }
}

function setBulkStatus(msg) {
  const el = document.getElementById('bulk-status');
  if (el) el.textContent = msg;
}

function setupBulkButtons() {
  const safeBtn = document.getElementById('bulk-safe-btn');
  const unsafeBtn = document.getElementById('bulk-unsafe-btn');
  const delBtn = document.getElementById('bulk-delete-btn');
  if (safeBtn) safeBtn.addEventListener('click', bulkSafe);
  if (unsafeBtn) unsafeBtn.addEventListener('click', bulkUnsafe);
  if (delBtn) delBtn.addEventListener('click', bulkDelete);
  const selectAll = document.getElementById('select-all-cb');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const checked = selectAll.checked;
      document.querySelectorAll('.request-checkbox').forEach((cb) => { cb.checked = checked; });
    });
  }
  const prev = document.getElementById('prev-page');
  const next = document.getElementById('next-page');
  if (prev) prev.addEventListener('click', () => { if (page > 0) { page--; refreshRequestList(); } });
  if (next) next.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(totalPending / PAGE_SIZE));
    if (page < totalPages - 1) {
      page++;
      refreshRequestList();
    }
  });
}

function connectLiveUpdates() {
  if (!window.EventSource) {
    setInterval(refreshRequestList, 5000);
    return;
  }

  const source = new EventSource('/api/admin/stream');
  source.addEventListener('update', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      if (typeof payload.pending_count === 'number') {
        const label = document.getElementById('count');
        if (label) {
          label.textContent = `${payload.pending_count} pending requests`;
        }
        if (payload.pending_count !== lastCount) {
          lastCount = payload.pending_count;
          refreshRequestList();
          return;
        }
      }
      refreshRequestList();
    } catch (_err) {
      refreshRequestList();
    }
  });

  source.onerror = () => {
    source.close();
    if (streamRetryTimer) {
      clearTimeout(streamRetryTimer);
    }
    streamRetryTimer = setTimeout(connectLiveUpdates, 3000);
  };
}

function initRequestsPage() {
  const list = document.getElementById('request-list');
  if (!list) return;
  setupBulkButtons();
  refreshRequestList();
  connectLiveUpdates();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRequestsPage);
} else {
  initRequestsPage();
}

window.refreshRequestList = refreshRequestList;
