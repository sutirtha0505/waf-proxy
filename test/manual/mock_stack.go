package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
)

func main() {
	go startBackend()
	startAI()
}

func startBackend() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"service":    "mock-backend",
			"method":     r.Method,
			"path":       r.URL.Path,
			"query":      r.URL.RawQuery,
			"body":       string(body),
			"request_id": r.Header.Get("X-WAF-Request-ID"),
		})
	})
	log.Println("mock backend listening on :18080")
	log.Fatal(http.ListenAndServe(":18080", mux))
}

func startAI() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/detect", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			RequestID   string `json:"request_id"`
			Path        string `json:"path"`
			QueryString string `json:"query_string"`
			BodyRaw     string `json:"body_raw"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		joined := strings.ToLower(req.Path + " " + req.QueryString + " " + req.BodyRaw)
		resp := map[string]any{
			"request_id":       req.RequestID,
			"attack_vector":    "normal",
			"confidence_score": 99.0,
		}
		if strings.Contains(joined, "block") || strings.Contains(joined, "' or '1'='1") {
			resp["attack_vector"] = "sqli_classic"
			resp["confidence_score"] = 99.0
		}
		if strings.Contains(joined, "review") {
			resp["attack_vector"] = "xss_reflected"
			resp["confidence_score"] = 42.0
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})
	log.Println("mock ai listening on :15001")
	log.Fatal(http.ListenAndServe(":15001", mux))
}
