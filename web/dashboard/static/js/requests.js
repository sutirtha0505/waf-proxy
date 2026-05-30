let lastCount = -1;

async function refreshRequestList() {
  const list = document.getElementById("request-list");
  if (!list) return;
  // fetch blocked events first
  const blockedRes = await fetch('/api/admin/blocked');
  const blocked = blockedRes.ok ? await blockedRes.json() : [];
  const res = await fetch("/api/admin/requests");
  const rows = await res.json();
  list.innerHTML = "";

  // render blocked items first
  blocked.forEach((row) => {
    const li = document.createElement('li');
    li.style.color = 'crimson';
    const badge = document.createElement('strong');
    badge.textContent = 'AI-blocked';
    badge.style.marginRight = '0.5rem';
    const label = document.createElement('span');
    label.textContent = row.request_id || row.request_id;
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => window.openReview(row.request_id));
    const meta = document.createElement('small');
    const summary = row.decision_summary || 'Blocked by AI';
    const confidence = row.confidence_label ? ` (${row.confidence_label})` : '';
    meta.textContent = ` ${summary}${confidence}`;
    meta.style.marginLeft = '0.5rem';
    meta.style.opacity = '0.8';
    li.appendChild(badge);
    li.appendChild(label);
    li.appendChild(meta);
    list.appendChild(li);
  });

  rows.forEach((row) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.id = row.request_id;
    cb.className = "request-checkbox";
    const label = document.createElement("span");
    label.textContent = row.request_id;
    label.style.cursor = "pointer";
    label.addEventListener("click", () => window.openReview(row.request_id));
    const meta = document.createElement("small");
    const summary = row.decision_summary || 'Pending human review';
    const confidence = row.confidence_label ? ` (${row.confidence_label})` : '';
    meta.textContent = ` ${summary}${confidence}`;
    meta.style.marginLeft = '0.5rem';
    meta.style.opacity = '0.8';
    cb.addEventListener('change', () => {
      const selectAll = document.getElementById('select-all-cb');
      if (!selectAll) return;
      const all = Array.from(document.querySelectorAll('.request-checkbox'));
      selectAll.checked = all.length > 0 && all.every((c) => c.checked);
    });
    // preserve select-all state when refreshing
    const selectAll = document.getElementById('select-all-cb');
    li.appendChild(meta);
    if (selectAll && selectAll.checked) cb.checked = true;
    li.appendChild(cb);
    li.appendChild(label);
    list.appendChild(li);
  });
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
}

async function pollCount() {
  const res = await fetch("/api/admin/requests/count");
  const { count } = await res.json();
  const label = document.getElementById("count");
  if (label) label.textContent = `${count} pending requests`;
  if (count !== lastCount) {
    lastCount = count;
    refreshRequestList();
  }
}

setInterval(pollCount, 3000);
pollCount();
setupBulkButtons();
