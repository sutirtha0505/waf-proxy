package models

type AIResponse struct {
	RequestID       string  `json:"request_id"`
	AttackVector    string  `json:"attack_vector"`
	ConfidenceScore float64 `json:"confidence_score"`
}
