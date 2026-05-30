package admin

import (
	"fmt"
	"strings"

	"smart-waf/pkg/models"
)

func ToBERTString(req *models.WAFRequest) string {
	parts := []string{
		req.Method,
		req.Protocol,
		req.Path,
		req.QueryString,
		req.BodyRaw,
		req.ContentType,
		req.UserAgent,
		req.Cookie,
		fmt.Sprintf("%d", req.PathDepth),
		req.SourceIP,
		fmt.Sprintf("%d", req.Timestamp),
		req.RequestID,
		fmt.Sprintf("%t", req.HasEncodedChars),
		fmt.Sprintf("%t", req.HasScriptTag),
	}
	for i, part := range parts {
		parts[i] = strings.ReplaceAll(part, "|", " ")
	}
	return strings.Join(parts, "|")
}
