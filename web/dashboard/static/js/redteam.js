const RED_TEAM_CASES = [
  {
    id: 'safe_baseline',
    title: 'Safe baseline',
    label: 'safe',
    code: 0,
    summary: 'Benign smoke test that should pass through the WAF.',
    curl: "curl -i 'http://localhost:8080/index.php'",
  },
  {
    id: 'sqli_classic',
    title: 'SQL injection',
    label: 'sqli_classic',
    code: 1,
    summary: 'Classic quoted OR payload from the SQLi family.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20OR%20%271%27%3D%271&Submit=Submit'",
  },
  {
    id: 'xss_reflected',
    title: 'Reflected XSS',
    label: 'xss_reflected',
    code: 7,
    summary: 'Reflected script payload to exercise XSS detection.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/xss_r/?name=%3Cscript%3Ealert(1)%3C%2Fscript%3E&Submit=Submit'",
  },
  {
    id: 'cmdi',
    title: 'Command injection',
    label: 'cmdi',
    code: 11,
    summary: 'Shell metacharacter payload for command injection checks.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/exec/?ip=127.0.0.1%3Bcat%20/etc/passwd&Submit=Submit'",
  },
  {
    id: 'path_traversal',
    title: 'Path traversal',
    label: 'path_traversal',
    code: 18,
    summary: 'Traversal payload that should be blocked or flagged.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=../../../../etc/passwd'",
  },
  {
    id: 'http_parameter_pollution',
    title: 'Parameter pollution',
    label: 'http_parameter_pollution',
    code: 37,
    summary: 'Duplicate parameter payload to test parser edge cases.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1&id=2&Submit=Submit'",
  },
  {
    id: 'brute_force',
    title: 'Brute force',
    label: 'brute_force',
    code: 23,
    summary: 'Repeated login-style submission for auth/session testing.',
    curl: "curl -i -X POST 'http://localhost:8080/login.php' -H 'Content-Type: application/x-www-form-urlencoded' --data 'username=admin&password=wrong&Login=Login'",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRedTeamGrid() {
  const grid = document.getElementById('redteam-grid');
  if (!grid) return;

  grid.innerHTML = RED_TEAM_CASES.map((testCase) => `
    <article class="redteam-card ${testCase.label === 'safe' ? 'safe' : 'unsafe'}">
      <div class="redteam-card-head">
        <div>
          <span class="badge ${testCase.label === 'safe' ? 'safe' : 'blocked'}">${escapeHtml(testCase.label)}</span>
          <h3>${escapeHtml(testCase.title)}</h3>
        </div>
        <span class="code-chip">${testCase.code}</span>
      </div>
      <p>${escapeHtml(testCase.summary)}</p>
      <pre class="command-preview">${escapeHtml(testCase.curl)}</pre>
      <button type="button" class="redteam-run" data-redteam-id="${escapeHtml(testCase.id)}">Run request</button>
    </article>
  `).join('');

  grid.querySelectorAll('[data-redteam-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const testCase = RED_TEAM_CASES.find((item) => item.id === button.dataset.redteamId);
      if (testCase) runRedTeamCase(testCase);
    });
  });
}

function setRedTeamStatus(message, tone = 'idle') {
  const status = document.getElementById('redteam-status');
  if (status) {
    status.textContent = message;
    status.dataset.tone = tone;
  }
}

function appendRedTeamLog(lines) {
  const log = document.getElementById('redteam-log');
  if (!log) return;
  log.textContent = lines.join('\n');
}

async function readResponseBody(response) {
  const text = await response.text();
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    try {
      return { json: JSON.parse(text), raw: text };
    } catch (_err) {
      return { json: null, raw: text };
    }
  }
  return { json: null, raw: text };
}

function previewText(text, limit = 260) {
  const cleaned = String(text || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '(empty)';
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}...` : cleaned;
}

async function runRedTeamCase(testCase) {
  setRedTeamStatus(`Running ${testCase.title}...`, 'busy');
  appendRedTeamLog([
    `Case: ${testCase.title}`,
    `Label: ${testCase.label} (${testCase.code})`,
    `Curl: ${testCase.curl}`,
    'Dispatching request through the WAF at http://localhost:8080 ...',
  ]);

  try {
    const response = await fetch('/api/redteam/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case: testCase.id }),
    });
    const { json: payload, raw } = await readResponseBody(response);
    if (!payload) {
      throw new Error(previewText(raw || response.statusText, 180));
    }
    if (!response.ok || payload.error) {
      throw new Error(payload.error || response.statusText);
    }

    setRedTeamStatus(`${testCase.title} completed`, 'success');
    appendRedTeamLog([
      `Case: ${payload.case.title}`,
      `Curl: ${payload.case.curl}`,
      `Status: ${payload.status_code}`,
      payload.location ? `Location: ${payload.location}` : 'Location: -',
      `Body preview: ${previewText(payload.body_preview)}`,
      `Timestamp: ${new Date((payload.at || 0) * 1000).toLocaleString()}`,
    ]);

    if (typeof window.refreshTrafficChart === 'function') {
      window.refreshTrafficChart().catch(() => {});
    }
  } catch (err) {
    setRedTeamStatus('Run failed', 'error');
    appendRedTeamLog([
      `Case: ${testCase.title}`,
      `Curl: ${testCase.curl}`,
      `Error: ${err.message || String(err)}`,
    ]);
  }
}

async function refreshAiHealth() {
  const statusNode = document.getElementById('ai-health-status');
  const modelNode = document.getElementById('ai-model-name');
  const lastCheckedNode = document.getElementById('ai-last-checked-at');
  const lastSwappedNode = document.getElementById('ai-last-swapped-at');
  const lastErrorNode = document.getElementById('ai-last-error');
  const dotNode = document.getElementById('ai-health-dot');
  if (statusNode) statusNode.textContent = 'Checking...';
  if (modelNode) modelNode.textContent = 'Loading...';
  if (lastCheckedNode) lastCheckedNode.textContent = 'Loading...';
  if (lastSwappedNode) lastSwappedNode.textContent = 'Loading...';
  if (lastErrorNode) lastErrorNode.textContent = 'Loading...';
  if (dotNode) dotNode.className = 'status-dot neutral';

  try {
    const response = await fetch('/api/ai/health');
    const { json: payload, raw } = await readResponseBody(response);
    if (!response.ok || !payload) {
      throw new Error(previewText(raw || response.statusText, 180));
    }
    const isHealthy = String(payload.status || '').toLowerCase() === 'ok';
    if (statusNode) statusNode.textContent = `${payload.status || 'unknown'}`;
    if (dotNode) dotNode.className = `status-dot ${isHealthy ? 'good' : 'bad'}`;
    if (modelNode) modelNode.textContent = payload.model_name || 'unknown';
    if (lastCheckedNode) lastCheckedNode.textContent = renderHealthValue(payload.last_checked_at);
    if (lastSwappedNode) lastSwappedNode.textContent = renderHealthValue(payload.last_swapped_at);
    if (lastErrorNode) lastErrorNode.textContent = renderHealthValue(payload.last_error);
  } catch (err) {
    if (statusNode) statusNode.textContent = 'Unavailable';
    if (dotNode) dotNode.className = 'status-dot bad';
    if (modelNode) modelNode.textContent = 'unknown';
    if (lastCheckedNode) lastCheckedNode.textContent = 'unknown';
    if (lastSwappedNode) lastSwappedNode.textContent = 'unknown';
    if (lastErrorNode) lastErrorNode.textContent = 'unknown';
  }
}

function renderHealthValue(value) {
  if (value === null || value === undefined) return 'null';
  return String(value);
}

function initRedTeamPanel() {
  renderRedTeamGrid();
  const refreshButton = document.getElementById('refresh-ai-health');
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshAiHealth);
  }
  refreshAiHealth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRedTeamPanel);
} else {
  initRedTeamPanel();
}