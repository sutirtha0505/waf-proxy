package config

import "time"

var Defaults = Config{
	Proxy: ProxyConfig{
		Port:         8080,
		BackendURL:   "http://localhost:8888",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	},
	AI: AIConfig{
		URL:            "http://localhost:5001",
		Timeout:        2 * time.Second,
		HealthInterval: 5 * time.Second,
		MaxRetries:     2,
	},
	Admin:     AdminConfig{Threshold: 85.0},
	Dashboard: DashboardConfig{Port: 9090},
	DB:        DBConfig{Path: "./data/waf.db"},
	StaticExtensions: []string{
		".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
		".woff", ".woff2", ".ttf", ".eot", ".map",
	},
}
