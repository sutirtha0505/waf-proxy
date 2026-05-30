package proxy

import (
	"net"
	"net/http"
	"regexp"
	"strings"
	"time"

	"smart-waf/pkg/models"
	"smart-waf/pkg/utils"
)

var (
	encodedCharRe = regexp.MustCompile(`%[0-9A-Fa-f]{2}`)
	scriptTagRe   = regexp.MustCompile(`(?i)<script`)
)

type Parser struct {
	MaxBodyBytes int64
}

func NewParser(maxBodyBytes int64) *Parser {
	return &Parser{MaxBodyBytes: maxBodyBytes}
}

func (p *Parser) Parse(r *http.Request) (*models.WAFRequest, error) {
	body, err := utils.BufferBody(r, p.MaxBodyBytes)
	if err != nil {
		return nil, err
	}
	rawBody := body.String()
	sourceIP, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		sourceIP = r.RemoteAddr
	}
	cookie := r.Header.Get("Cookie")
	return &models.WAFRequest{
		RequestID:       utils.NewRequestID(),
		Timestamp:       time.Now().UTC().UnixMilli(),
		SourceIP:        sourceIP,
		Protocol:        r.Proto,
		Method:          r.Method,
		Path:            r.URL.Path,
		QueryString:     r.URL.RawQuery,
		UserAgent:       r.UserAgent(),
		Cookie:          cookie,
		BodyRaw:         rawBody,
		ContentType:     r.Header.Get("Content-Type"),
		HasEncodedChars: encodedCharRe.MatchString(r.URL.RawPath) || encodedCharRe.MatchString(r.URL.RawQuery) || encodedCharRe.MatchString(rawBody),
		HasScriptTag:    scriptTagRe.MatchString(r.URL.RawQuery) || scriptTagRe.MatchString(rawBody),
		PathDepth:       strings.Count(r.URL.Path, "/"),
	}, nil
}
