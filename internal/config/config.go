package config

import (
	"os"
	"path/filepath"
	"strconv"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Proxy            ProxyConfig     `yaml:"proxy"`
	AI               AIConfig        `yaml:"ai"`
	Admin            AdminConfig     `yaml:"admin"`
	Dashboard        DashboardConfig `yaml:"dashboard"`
	DB               DBConfig        `yaml:"database"`
	StaticExtensions []string        `yaml:"static_extensions"`
}

type ProxyConfig struct {
	Port         int           `yaml:"port"`
	BackendURL   string        `yaml:"backend_url"`
	ReadTimeout  time.Duration `yaml:"read_timeout"`
	WriteTimeout time.Duration `yaml:"write_timeout"`
	IdleTimeout  time.Duration `yaml:"idle_timeout"`
}

type AIConfig struct {
	URL            string        `yaml:"url"`
	Timeout        time.Duration `yaml:"timeout"`
	HealthInterval time.Duration `yaml:"health_interval"`
	MaxRetries     int           `yaml:"max_retries"`
}

type AdminConfig struct {
	Threshold float64 `yaml:"threshold"`
}

type DashboardConfig struct {
	Port int `yaml:"port"`
}

type DBConfig struct {
	Path string `yaml:"path"`
}

func Load() (Config, error) {
	cfg := Defaults
	if configPath, ok := findConfigFile("configs/waf.yaml"); ok {
		data, err := os.ReadFile(configPath)
		if err != nil {
			return cfg, err
		}
		var file yamlConfig
		if err := yaml.Unmarshal(data, &file); err != nil {
			return cfg, err
		}
		applyYAML(&cfg, file)
	}

	if v := os.Getenv("WAF_PROXY_PORT"); v != "" {
		cfg.Proxy.Port = mustAtoi(v, cfg.Proxy.Port)
	}
	if v := os.Getenv("WAF_BACKEND_URL"); v != "" {
		cfg.Proxy.BackendURL = v
	}
	if v := os.Getenv("WAF_AI_URL"); v != "" {
		cfg.AI.URL = v
	}
	if v := os.Getenv("WAF_DASHBOARD_PORT"); v != "" {
		cfg.Dashboard.Port = mustAtoi(v, cfg.Dashboard.Port)
	}
	if v := os.Getenv("WAF_DB_PATH"); v != "" {
		cfg.DB.Path = v
	}
	if v := os.Getenv("WAF_THRESHOLD"); v != "" {
		if parsed, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.Admin.Threshold = parsed
		}
	}

	return cfg, Validate(cfg)
}

func findConfigFile(rel string) (string, bool) {
	dir, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		candidate := filepath.Join(dir, rel)
		if _, err := os.Stat(candidate); err == nil {
			return candidate, true
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", false
		}
		dir = parent
	}
}

type yamlConfig struct {
	Proxy struct {
		Port         int    `yaml:"port"`
		BackendURL   string `yaml:"backend_url"`
		ReadTimeout  string `yaml:"read_timeout"`
		WriteTimeout string `yaml:"write_timeout"`
		IdleTimeout  string `yaml:"idle_timeout"`
	} `yaml:"proxy"`
	AI struct {
		URL            string `yaml:"url"`
		Timeout        string `yaml:"timeout"`
		HealthInterval string `yaml:"health_interval"`
		MaxRetries     int    `yaml:"max_retries"`
	} `yaml:"ai"`
	Admin struct {
		Threshold float64 `yaml:"threshold"`
	} `yaml:"admin"`
	Dashboard struct {
		Port int `yaml:"port"`
	} `yaml:"dashboard"`
	DB struct {
		Path string `yaml:"path"`
	} `yaml:"database"`
	StaticExtensions []string `yaml:"static_extensions"`
}

func applyYAML(cfg *Config, file yamlConfig) {
	if file.Proxy.Port != 0 {
		cfg.Proxy.Port = file.Proxy.Port
	}
	if file.Proxy.BackendURL != "" {
		cfg.Proxy.BackendURL = file.Proxy.BackendURL
	}
	if parsed, err := time.ParseDuration(file.Proxy.ReadTimeout); err == nil && parsed > 0 {
		cfg.Proxy.ReadTimeout = parsed
	}
	if parsed, err := time.ParseDuration(file.Proxy.WriteTimeout); err == nil && parsed > 0 {
		cfg.Proxy.WriteTimeout = parsed
	}
	if parsed, err := time.ParseDuration(file.Proxy.IdleTimeout); err == nil && parsed > 0 {
		cfg.Proxy.IdleTimeout = parsed
	}
	if file.AI.URL != "" {
		cfg.AI.URL = file.AI.URL
	}
	if parsed, err := time.ParseDuration(file.AI.Timeout); err == nil && parsed > 0 {
		cfg.AI.Timeout = parsed
	}
	if parsed, err := time.ParseDuration(file.AI.HealthInterval); err == nil && parsed > 0 {
		cfg.AI.HealthInterval = parsed
	}
	if file.AI.MaxRetries != 0 {
		cfg.AI.MaxRetries = file.AI.MaxRetries
	}
	if file.Admin.Threshold != 0 {
		cfg.Admin.Threshold = file.Admin.Threshold
	}
	if file.Dashboard.Port != 0 {
		cfg.Dashboard.Port = file.Dashboard.Port
	}
	if file.DB.Path != "" {
		cfg.DB.Path = file.DB.Path
	}
	if len(file.StaticExtensions) > 0 {
		cfg.StaticExtensions = file.StaticExtensions
	}
}

func mustAtoi(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
