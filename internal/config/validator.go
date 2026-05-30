package config

import (
	"fmt"
	"net/url"
)

func Validate(cfg Config) error {
	if cfg.Proxy.Port < 1 || cfg.Proxy.Port > 65535 {
		return fmt.Errorf("invalid proxy port: %d", cfg.Proxy.Port)
	}
	if cfg.Dashboard.Port < 1 || cfg.Dashboard.Port > 65535 {
		return fmt.Errorf("invalid dashboard port: %d", cfg.Dashboard.Port)
	}
	if cfg.Admin.Threshold < 0 || cfg.Admin.Threshold > 100 {
		return fmt.Errorf("invalid threshold: %.2f", cfg.Admin.Threshold)
	}
	for name, raw := range map[string]string{"backend": cfg.Proxy.BackendURL, "ai": cfg.AI.URL} {
		parsed, err := url.ParseRequestURI(raw)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			return fmt.Errorf("invalid %s url: %q", name, raw)
		}
	}
	return nil
}
