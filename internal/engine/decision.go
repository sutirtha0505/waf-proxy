package engine

import (
	"encoding/json"
	"net/http"

	"smart-waf/internal/storage"
	"smart-waf/pkg/models"
)

type Decision struct {
	policy Policy
	repo   storage.Repository
}

type Result struct {
	Allowed bool
	Status  int
	Reason  string
}

func NewDecision(policy Policy, repo storage.Repository) *Decision {
	return &Decision{policy: policy, repo: repo}
}

func (d *Decision) Evaluate(req *models.WAFRequest, resp *models.AIResponse) Result {
	if resp == nil {
		return Result{Allowed: true, Status: http.StatusOK, Reason: "missing_ai_response"}
	}
	if resp.ConfidenceScore < d.policy.Threshold {
		_ = d.repo.SavePendingRequest(req, resp)
		return Result{Allowed: true, Status: http.StatusOK, Reason: "pending_admin_review"}
	}
	if d.policy.ActionFor(resp.AttackVector) == ActionAllow {
		return Result{Allowed: true, Status: http.StatusOK, Reason: resp.AttackVector}
	}
	return Result{Allowed: false, Status: http.StatusForbidden, Reason: resp.AttackVector}
}

func WriteBlocked(w http.ResponseWriter, reason string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"blocked_by": "smart-waf",
		"reason":     reason,
	})
}
