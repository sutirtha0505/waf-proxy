package ai

import (
	"context"
	"net/http"

	"smart-waf/pkg/models"
)

func (c *Client) Detect(ctx context.Context, req *models.WAFRequest) (*models.AIResponse, error) {
	var out models.AIResponse
	if err := c.doJSON(ctx, http.MethodPost, "/detect", req, &out, req.RequestID); err != nil {
		return nil, err
	}
	if err := validateAIResponse(req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
