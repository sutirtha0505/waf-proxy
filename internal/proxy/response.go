package proxy

import (
	"log"
	"net/http"
	"time"
)

type responseRecorder struct {
	http.ResponseWriter
	status int
}

func (r *responseRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func logResponse(logger *log.Logger, requestID string, status int, started time.Time) {
	if logger == nil {
		return
	}
	if status == 0 {
		status = http.StatusOK
	}
	logger.Printf("response request_id=%s status=%d latency=%s", requestID, status, time.Since(started))
}
