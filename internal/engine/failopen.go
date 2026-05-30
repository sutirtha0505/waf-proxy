package engine

import (
	"log"

	"smart-waf/internal/logging"
	"smart-waf/internal/storage"
	"smart-waf/pkg/models"
)

type FailOpen struct {
	logger *log.Logger
	audit  *logging.AuditLogger
	repo   storage.Repository
}

func NewFailOpen(logger *log.Logger, audit *logging.AuditLogger, repo storage.Repository) *FailOpen {
	return &FailOpen{logger: logger, audit: audit, repo: repo}
}

func (f *FailOpen) Handle(req *models.WAFRequest, reason string) {
	if f.logger != nil {
		f.logger.Printf("WARN fail-open request_id=%s reason=%s", req.RequestID, reason)
	}
	if f.audit != nil {
		f.audit.Log(logging.AuditEvent{
			EventType: "fail_open",
			RequestID: req.RequestID,
			Metadata:  map[string]any{"reason": reason},
		})
	}
	// Persist the request as a pending request so it appears in the dashboard
	if f.repo != nil {
		// save with nil AI response (will be stored as null JSON)
		_ = f.repo.SavePendingRequest(req, nil)
	}
}
