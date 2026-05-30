package models

type WAFRequest struct {
	RequestID       string `json:"request_id"`
	Timestamp       int64  `json:"timestamp"`
	SourceIP        string `json:"source_ip"`
	Protocol        string `json:"protocol"`
	Method          string `json:"method"`
	Path            string `json:"path"`
	QueryString     string `json:"query_string"`
	UserAgent       string `json:"user_agent"`
	Cookie          string `json:"cookie"`
	BodyRaw         string `json:"body_raw"`
	ContentType     string `json:"content_type"`
	HasEncodedChars bool   `json:"has_encoded_chars"`
	HasScriptTag    bool   `json:"has_script_tag"`
	PathDepth       int    `json:"path_depth"`
}
