package proxy

import (
	"context"
	"log"
	"net/http"

	"smart-waf/internal/ai"
	"smart-waf/internal/config"
	"smart-waf/internal/engine"
	"smart-waf/pkg/models"
)

type Handler struct {
	cfg            config.Config
	parser         *Parser
	staticDetector *StaticDetector
	aiClient       *ai.Client
	decision       *engine.Decision
	failOpen       *engine.FailOpen
	logger         *log.Logger
}

func NewHandler(cfg config.Config, aiClient *ai.Client, decision *engine.Decision, failOpen *engine.FailOpen, logger *log.Logger) *Handler {
	return &Handler{
		cfg:            cfg,
		parser:         NewParser(1 << 20),
		staticDetector: NewStaticDetector(cfg.StaticExtensions),
		aiClient:       aiClient,
		decision:       decision,
		failOpen:       failOpen,
		logger:         logger,
	}
}

func (h *Handler) Intercept(w http.ResponseWriter, r *http.Request) bool {
	wafReq, err := h.parser.Parse(r)
	if err != nil {
		h.logger.Printf("parse failed: %v", err)
		return true
	}
	r.Header.Set("X-WAF-Request-ID", wafReq.RequestID)

	if h.staticDetector.IsStatic(wafReq.Path) {
		return true
	}

	healthCtx, cancelHealth := context.WithTimeout(r.Context(), h.cfg.AI.Timeout)
	healthy := h.aiClient.IsHealthy(healthCtx)
	cancelHealth()
	if !healthy {
		h.failOpen.Handle(wafReq, "ai_unavailable")
		return true
	}

	ctx, cancel := context.WithTimeout(r.Context(), h.cfg.AI.Timeout)
	defer cancel()

	type detectResult struct {
		respErr error
		resp    *models.AIResponse
	}
	resultCh := make(chan detectResult, 1)
	go func() {
		resp, err := h.aiClient.Detect(ctx, wafReq)
		resultCh <- detectResult{resp: resp, respErr: err}
	}()

	select {
	case result := <-resultCh:
		if result.respErr != nil {
			h.failOpen.Handle(wafReq, "ai_detect_error")
			return true
		}
		decision := h.decision.Evaluate(wafReq, result.resp)
		if decision.Allowed {
			return true
		}
		engine.WriteBlocked(w, decision.Reason)
		return false
	case <-ctx.Done():
		h.failOpen.Handle(wafReq, "ai_timeout")
		return true
	}
}
