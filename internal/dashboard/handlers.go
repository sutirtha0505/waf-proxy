package dashboard

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"smart-waf/internal/auth"
)

type redTeamCase struct {
	ID          string
	Title       string
	Label       string
	Code        int
	Method      string
	Path        string
	Body        string
	ContentType string
	Summary     string
	Safe        bool
	Curl        string
}

type redTeamResult struct {
	Case        redTeamCase `json:"case"`
	StatusCode  int         `json:"status_code"`
	Location    string      `json:"location,omitempty"`
	BodyPreview string      `json:"body_preview,omitempty"`
	Error       string      `json:"error,omitempty"`
	At          int64       `json:"at"`
}

type aiHealthResult struct {
	Status         string `json:"status"`
	ModelName      string `json:"model_name"`
	ModelVersion   string `json:"model_version"`
	LastCheckedAt  any    `json:"last_checked_at,omitempty"`
	LastSwappedAt  any    `json:"last_swapped_at,omitempty"`
	LastError      string `json:"last_error,omitempty"`
	SourceEndpoint string `json:"source_endpoint"`
}

var redTeamCases = map[string]redTeamCase{
	"safe_baseline": {
		ID:      "safe_baseline",
		Title:   "Safe baseline",
		Label:   "safe",
		Code:    0,
		Method:  http.MethodGet,
		Path:    "/index.php",
		Summary: "Benign smoke test that should pass through the WAF.",
		Safe:    true,
		Curl:    "curl -i 'http://localhost:8080/index.php'",
	},
	"sqli_classic": {
		ID:      "sqli_classic",
		Title:   "SQL injection",
		Label:   "sqli_classic",
		Code:    1,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli/?id=1%27%20OR%20%271%27%3D%271&Submit=Submit",
		Summary: "Classic quoted OR payload from the SQLi family.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20OR%20%271%27%3D%271&Submit=Submit'",
	},
	"xss_reflected": {
		ID:      "xss_reflected",
		Title:   "Reflected XSS",
		Label:   "xss_reflected",
		Code:    7,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/xss_r/?name=%3Cscript%3Ealert(1)%3C%2Fscript%3E&Submit=Submit",
		Summary: "Reflected script payload to exercise XSS detection.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/xss_r/?name=%3Cscript%3Ealert(1)%3C%2Fscript%3E&Submit=Submit'",
	},
	"cmdi": {
		ID:      "cmdi",
		Title:   "Command injection",
		Label:   "cmdi",
		Code:    11,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/exec/?ip=127.0.0.1%3Bcat%20/etc/passwd&Submit=Submit",
		Summary: "Shell metacharacter payload for command injection checks.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/exec/?ip=127.0.0.1%3Bcat%20/etc/passwd&Submit=Submit'",
	},
	"path_traversal": {
		ID:      "path_traversal",
		Title:   "Path traversal",
		Label:   "path_traversal",
		Code:    18,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/fi/?page=../../../../etc/passwd",
		Summary: "Traversal payload that should be blocked or flagged.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=../../../../etc/passwd'",
	},
	"http_parameter_pollution": {
		ID:      "http_parameter_pollution",
		Title:   "Parameter pollution",
		Label:   "http_parameter_pollution",
		Code:    37,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli/?id=1&id=2&Submit=Submit",
		Summary: "Duplicate parameter payload to test parser edge cases.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1&id=2&Submit=Submit'",
	},
	"brute_force": {
		ID:          "brute_force",
		Title:       "Brute force",
		Label:       "brute_force",
		Code:        23,
		Method:      http.MethodPost,
		Path:        "/login.php",
		Body:        "username=admin&password=wrong&Login=Login",
		ContentType: "application/x-www-form-urlencoded",
		Summary:     "Repeated login-style submission for auth/session testing.",
		Curl:        "curl -i -X POST 'http://localhost:8080/login.php' -H 'Content-Type: application/x-www-form-urlencoded' --data 'username=admin&password=wrong&Login=Login'",
	},
}

func loginHandler(authn *auth.Authenticator, sessions *auth.SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if sessions.Valid(r) {
			http.Redirect(w, r, "/dashboard", http.StatusFound)
			return
		}
		if r.Method == http.MethodGet {
			render(w, "login.html", nil)
			return
		}
		username := r.FormValue("username")
		password := r.FormValue("password")
		ok, _ := authn.Verify(username, password)
		if !ok {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		sessions.Set(w, username)
		http.Redirect(w, r, "/dashboard", http.StatusFound)
	}
}

func logoutHandler(sessions *auth.SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessions.Clear(w)
		http.Redirect(w, r, "/login", http.StatusFound)
	}
}

func redTeamHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var body struct {
			Case string `json:"case"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		spec, ok := redTeamCases[body.Case]
		if !ok {
			http.Error(w, "unknown red team case", http.StatusBadRequest)
			return
		}

		baseURL := "http://localhost:8080"
		requestURL := baseURL + spec.Path
		target, err := url.Parse(requestURL)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var requestBody io.Reader
		if spec.Body != "" {
			requestBody = strings.NewReader(spec.Body)
		}
		request, err := http.NewRequestWithContext(r.Context(), spec.Method, target.String(), requestBody)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if spec.ContentType != "" {
			request.Header.Set("Content-Type", spec.ContentType)
		}
		request.Header.Set("User-Agent", "smart-waf-redteam/1.0")
		request.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

		client := &http.Client{
			Timeout: 15 * time.Second,
			CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}
		response, err := client.Do(request)
		result := redTeamResult{Case: spec, At: time.Now().Unix()}
		if err != nil {
			result.Error = err.Error()
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(result)
			return
		}
		defer response.Body.Close()

		result.StatusCode = response.StatusCode
		result.Location = response.Header.Get("Location")
		preview, _ := io.ReadAll(io.LimitReader(response.Body, 600))
		result.BodyPreview = strings.TrimSpace(string(preview))
		if response.StatusCode >= 300 && response.StatusCode < 400 && result.Location != "" {
			result.Error = fmt.Sprintf("redirected to %s", result.Location)
		} else if !strings.Contains(strings.ToLower(response.Header.Get("Content-Type")), "application/json") {
			trimmed := strings.TrimSpace(result.BodyPreview)
			if strings.HasPrefix(trimmed, "<!doctype") || strings.HasPrefix(trimmed, "<html") {
				result.Error = "received HTML instead of JSON; please ensure you are logged in before running the test"
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	}
}

func aiHealthHandler(aiBaseURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if strings.TrimSpace(aiBaseURL) == "" {
			http.Error(w, "ai endpoint not configured", http.StatusServiceUnavailable)
			return
		}

		client := &http.Client{Timeout: 10 * time.Second}
		request, err := http.NewRequestWithContext(r.Context(), http.MethodGet, strings.TrimRight(aiBaseURL, "/")+"/health", nil)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response, err := client.Do(request)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
		defer response.Body.Close()

		var payload map[string]any
		if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}

		modelName, _ := payload["model_name"].(string)
		modelVersion := extractModelVersion(modelName)
		result := aiHealthResult{
			Status:         fmt.Sprint(payload["status"]),
			ModelName:      modelName,
			ModelVersion:   modelVersion,
			SourceEndpoint: strings.TrimRight(aiBaseURL, "/") + "/health",
		}
		if value, ok := payload["last_checked_at"]; ok {
			result.LastCheckedAt = value
		}
		if value, ok := payload["last_swapped_at"]; ok {
			result.LastSwappedAt = value
		}
		if value, ok := payload["last_error"].(string); ok {
			result.LastError = value
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	}
}

func extractModelVersion(modelName string) string {
	idx := strings.LastIndex(modelName, "_v")
	if idx < 0 || idx+2 >= len(modelName) {
		return "unknown"
	}
	version := modelName[idx+2:]
	if version == "" {
		return "unknown"
	}
	return version
}
