package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"smart-waf/internal/config"
	"smart-waf/pkg/models"
)

type Client struct {
	baseURL        string
	httpClient     *http.Client
	healthInterval time.Duration
	maxRetries     int

	mu             sync.RWMutex
	lastHealthAt   time.Time
	lastHealthGood bool
}

func NewClient(cfg config.AIConfig) *Client {
	return &Client{
		baseURL: cfg.URL,
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		healthInterval: cfg.HealthInterval,
		maxRetries:     cfg.MaxRetries,
	}
}

func (c *Client) doJSON(ctx context.Context, method, path string, body any, out any, requestID string) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	var lastErr error
	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(payload))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		if requestID != "" {
			req.Header.Set("X-WAF-Request-ID", requestID)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
		} else {
			defer resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return json.NewDecoder(resp.Body).Decode(out)
			}
			lastErr = fmt.Errorf("ai engine returned %s", resp.Status)
			if resp.StatusCode != http.StatusTooManyRequests && resp.StatusCode < 500 {
				break
			}
		}
		time.Sleep(time.Duration(attempt+1) * 100 * time.Millisecond)
	}
	return lastErr
}

func validateAIResponse(req *models.WAFRequest, resp *models.AIResponse) error {
	if resp == nil {
		return fmt.Errorf("nil ai response")
	}
	if resp.RequestID == "" {
		resp.RequestID = req.RequestID
	}
	if resp.AttackVector == "" {
		return fmt.Errorf("missing attack_vector")
	}
	if resp.ConfidenceScore < 0 || resp.ConfidenceScore > 100 {
		return fmt.Errorf("invalid confidence_score: %.2f", resp.ConfidenceScore)
	}
	return nil
}
