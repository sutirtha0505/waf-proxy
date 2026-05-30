window.openReview = async function openReview(id) {
  const modal = document.getElementById("review-modal");
  const summaryEl = document.getElementById("request-summary");
  const decisionEl = document.getElementById("request-decision");
  const confidenceEl = document.getElementById("request-confidence");
  const pre = document.getElementById("request-json");
  const vectorSelect = document.getElementById("vector-select");
  const req = await fetch(`/api/admin/requests/${id}`).then((r) => r.json());
  const vectors = await fetch("/api/admin/vectors").then((r) => r.json());
  pre.textContent = JSON.stringify(req, null, 2);
  if (summaryEl) summaryEl.textContent = `Request ${req.request_id} - ${req.method} ${req.path}`;
  if (decisionEl) {
    if (req.was_fail_open) {
      decisionEl.textContent = "Decision: fail-open (AI unavailable, request was queued for review)";
    } else if (req.ai_response) {
      decisionEl.textContent = `Decision: ${req.ai_response.attack_vector}`;
    } else {
      decisionEl.textContent = "Decision: pending human review";
    }
  }
  if (confidenceEl) {
    confidenceEl.textContent = req.confidence_label ? `Confidence: ${req.confidence_label}` : "Confidence: n/a";
  }
  vectorSelect.innerHTML = "";
  Object.entries(vectors).forEach(([name, code]) => {
    const option = document.createElement("option");
    option.value = JSON.stringify({ vector_name: name, code });
    option.textContent = `${name} (${code})`;
    vectorSelect.appendChild(option);
  });
  document.getElementById("safe-btn").onclick = async () => {
    await fetch(`/api/admin/requests/${id}/safe`, { method: "POST" });
    modal.close();
    refreshRequestList();
  };
  document.getElementById("unsafe-btn").onclick = async () => {
    await fetch(`/api/admin/requests/${id}/unsafe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: vectorSelect.value
    });
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
    vectorSelect.appendChild(option);
    vectorSelect.value = option.value;
  };
  modal.showModal();
};
