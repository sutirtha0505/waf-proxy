package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http"
	"strings"
	"time"
)

type SessionManager struct {
	secret []byte
	ttl    time.Duration
}

func NewSessionManager(secret string, ttl time.Duration) *SessionManager {
	return &SessionManager{secret: []byte(secret), ttl: ttl}
}

func (s *SessionManager) Set(w http.ResponseWriter, username string) {
	value := username + "|" + sign(s.secret, username)
	http.SetCookie(w, &http.Cookie{Name: "smart_waf_session", Value: value, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Expires: time.Now().Add(s.ttl)})
}

func (s *SessionManager) Clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: "smart_waf_session", Value: "", Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode, Expires: time.Unix(0, 0), MaxAge: -1})
}

func (s *SessionManager) Username(r *http.Request) string {
	cookie, err := r.Cookie("smart_waf_session")
	if err != nil {
		return ""
	}
	parts := strings.Split(cookie.Value, "|")
	if len(parts) != 2 {
		return ""
	}
	if !hmac.Equal([]byte(parts[1]), []byte(sign(s.secret, parts[0]))) {
		return ""
	}
	return parts[0]
}

func (s *SessionManager) Valid(r *http.Request) bool {
	return s.Username(r) != ""
}

func sign(secret []byte, value string) string {
	mac := hmac.New(sha256.New, secret)
	_, _ = mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
