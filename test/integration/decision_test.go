package integration

import (
	"testing"

	"smart-waf/internal/engine"
	"smart-waf/internal/storage"
	"smart-waf/pkg/models"
)

func TestDecisionBlocksHighConfidenceAttack(t *testing.T) {
	repo, err := storage.Open(t.TempDir() + "/waf.json")
	if err != nil {
		t.Fatal(err)
	}
	decision := engine.NewDecision(engine.NewPolicy(85), repo)
	result := decision.Evaluate(&models.WAFRequest{RequestID: "1"}, &models.AIResponse{RequestID: "1", AttackVector: "sqli_classic", ConfidenceScore: 98})
	if result.Allowed {
		t.Fatal("expected request to be blocked")
	}
}
