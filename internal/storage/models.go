package storage

import "time"

type PendingRequest struct {
	RequestID      string
	WAFRequestJSON string
	AIResponseJSON string
	CreatedAt      time.Time
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
