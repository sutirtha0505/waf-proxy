package config

import "testing"

func TestLoadReadsYAMLConfig(t *testing.T) {
	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Proxy.Port != 8080 {
		t.Fatalf("expected proxy port from YAML, got %d", cfg.Proxy.Port)
	}
	if cfg.Proxy.BackendURL != "http://dvwa:80" {
		t.Fatalf("expected backend URL from YAML, got %q", cfg.Proxy.BackendURL)
	}
	if cfg.AI.Timeout == 0 {
		t.Fatal("expected AI timeout from YAML")
	}
}
