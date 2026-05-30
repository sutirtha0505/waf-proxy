package storage

import (
	"time"

	"smart-waf/pkg/models"
)

type PendingRequest struct {
	RequestID      string
	WAFRequestJSON string
	AIResponseJSON string
	CreatedAt      time.Time
}

type PendingRequestDetails struct {
	Request     *models.WAFRequest
	AIResponse  *models.AIResponse
	CreatedAt   time.Time
	HasAIResult bool
	WasFailOpen bool
}

type BlockedEventDetails struct {
	Request    *models.WAFRequest
	AIResponse *models.AIResponse
	CreatedAt  time.Time
}

type LabeledData struct {
	ID            int64
	RequestString string
	AttackVector  string
	Code          int
	CreatedAt     time.Time
}

type AttackVector struct {
	Name string
	Code int
}
