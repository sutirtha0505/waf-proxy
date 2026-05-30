package integration

import (
	"net/http/httptest"
	"testing"

	"smart-waf/internal/config"
	"smart-waf/internal/proxy"
)

func TestStaticDetector(t *testing.T) {
	detector := proxy.NewStaticDetector(config.Defaults.StaticExtensions)
	if !detector.IsStatic("/assets/app.css") {
		t.Fatal("expected css to be static")
	}
	if detector.IsStatic("/login") {
		t.Fatal("did not expect /login to be static")
	}
}

func TestParser(t *testing.T) {
	req := httptest.NewRequest("GET", "/a/b?q=%3Cscript%3E", nil)
	parsed, err := proxy.NewParser(1024).Parse(req)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.PathDepth != 2 {
		t.Fatalf("expected path depth 2, got %d", parsed.PathDepth)
	}
	if !parsed.HasEncodedChars {
		t.Fatal("expected encoded chars")
	}
}
