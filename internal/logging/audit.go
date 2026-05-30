package logging

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"time"
)

type AuditEvent struct {
	EventType string         `json:"event_type"`
	RequestID string         `json:"request_id,omitempty"`
	Metadata  map[string]any `json:"metadata,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
}

type AuditLogger struct {
	logger *log.Logger
	file   *os.File
}

func NewAuditLogger(path string) (*AuditLogger, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}
	return &AuditLogger{logger: log.New(os.Stdout, "audit ", log.LstdFlags|log.LUTC), file: file}, nil
}

func (a *AuditLogger) Log(event AuditEvent) {
	event.CreatedAt = time.Now().UTC()
	payload, _ := json.Marshal(event)
	a.logger.Println(string(payload))
	if a.file != nil {
		_, _ = a.file.Write(append(payload, '\n'))
	}
}

func (a *AuditLogger) Close() error {
	if a.file == nil {
		return nil
	}
	return a.file.Close()
}
