window.openReview = async function openReview(id) {
  const modal = document.getElementById("review-modal");
  const summaryEl = document.getElementById("request-summary");
  const decisionEl = document.getElementById("request-decision");
  const confidenceEl = document.getElementById("request-confidence");
  const decisionCopyEl = document.getElementById("request-decision-copy");
  const confidenceCopyEl = document.getElementById("request-confidence-copy");
  const pre = document.getElementById("request-json");
  const vectorSelect = document.getElementById("vector-select");

  const [reqRes, vectorsRes] = await Promise.all([
    fetch(`/api/admin/requests/${encodeURIComponent(id)}`),
    fetch("/api/admin/vectors"),
  ]);
  if (!reqRes.ok) {
    const err = await reqRes.json().catch(() => ({}));
    if (pre) pre.textContent = err.error || `Request ${id} is no longer pending.`;
    if (summaryEl) summaryEl.textContent = "Request unavailable";
    if (decisionEl) decisionEl.textContent = "This request is no longer in the pending queue.";
    if (confidenceEl) confidenceEl.textContent = "";
    if (decisionCopyEl) decisionCopyEl.textContent = decisionEl ? decisionEl.textContent : "";
    if (confidenceCopyEl) confidenceCopyEl.textContent = "";
    if (vectorSelect) vectorSelect.innerHTML = "";
    modal.showModal();
    refreshRequestList();
    return;
  }

  const req = await reqRes.json();
  const vectors = vectorsRes.ok ? await vectorsRes.json() : {};
  if (pre) pre.textContent = JSON.stringify(req, null, 2);
  if (summaryEl) summaryEl.textContent = `Request ${req.request_id} - ${req.method} ${req.path}`;
  if (decisionEl) {
    decisionEl.textContent = `Decision: ${req.decision_summary || req.decision_state || 'pending human review'}`;
  }
  if (decisionCopyEl) {
    decisionCopyEl.textContent = decisionEl ? decisionEl.textContent : '';
  }
  if (confidenceEl) {
    confidenceEl.textContent = req.confidence_label ? `Confidence: ${req.confidence_label}` : "Confidence: n/a";
  }
  if (confidenceCopyEl) {
    confidenceCopyEl.textContent = confidenceEl ? confidenceEl.textContent : '';
  }
  if (vectorSelect) {
    vectorSelect.innerHTML = "";
    Object.entries(vectors).forEach(([name, code]) => {
      const option = document.createElement("option");
      option.value = JSON.stringify({ vector_name: name, code });
      option.textContent = `${name} (${code})`;
      vectorSelect.appendChild(option);
    });
  }
  document.getElementById("safe-btn").onclick = async () => {
    const res = await fetch(`/api/admin/requests/${encodeURIComponent(id)}/safe`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || res.statusText);
      return;
    }
    modal.close();
    refreshRequestList();
  };
  document.getElementById("unsafe-btn").onclick = async () => {
    if (!vectorSelect || !vectorSelect.value) {
      alert("No attack vector selected");
      return;
    }
    const res = await fetch(`/api/admin/requests/${encodeURIComponent(id)}/unsafe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: vectorSelect.value
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || res.statusText);
      return;
    }
    modal.close();
    refreshRequestList();
  };
  document.getElementById("add-vector-btn").onclick = async () => {
    const category = prompt("Attack vector category");
    const name = prompt("Attack vector name");
    if (!name) return;
    const created = await fetch("/api/admin/vectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name })
    }).then((r) => r.json());
    const option = document.createElement("option");
    option.value = JSON.stringify({ vector_name: created.name, code: created.code });
    option.textContent = `${created.name} (${created.code})`;
    if (vectorSelect) {
      vectorSelect.appendChild(option);
      vectorSelect.value = option.value;
    }
  };
  modal.showModal();
};
