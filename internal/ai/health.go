package ai

import (
	"context"
	"net/http"
	"time"
)

func (c *Client) IsHealthy(ctx context.Context) bool {
	c.mu.RLock()
	if time.Since(c.lastHealthAt) < c.healthInterval {
		healthy := c.lastHealthGood
		c.mu.RUnlock()
		return healthy
	}
	c.mu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/health", nil)
	healthy := false
	if err == nil {
		resp, err := c.httpClient.Do(req)
		if err == nil {
			healthy = resp.StatusCode == http.StatusOK
			_ = resp.Body.Close()
		}
	}

	c.mu.Lock()
	c.lastHealthAt = time.Now()
	c.lastHealthGood = healthy
	c.mu.Unlock()
	return healthy
}
