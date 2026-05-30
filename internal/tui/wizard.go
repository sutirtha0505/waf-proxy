package tui

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"smart-waf/internal/config"
	"smart-waf/internal/storage"
	"smart-waf/pkg/models"
	"smart-waf/pkg/utils"
)

type Wizard struct {
	repo       storage.Repository
	cfg        config.Config
	configPath string
}

func NewWizard(repo storage.Repository, cfg config.Config) *Wizard {
	return &Wizard{repo: repo, cfg: cfg, configPath: "configs/waf.yaml"}
}

func (w *Wizard) Run() error {
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("Smart WAF Initial Setup")
	fmt.Println("Enter the backend URL you want to test through the WAF.")

	username, err := prompt(reader, "Admin username", validateUsername)
	if err != nil {
		return err
	}
	password, err := prompt(reader, "Admin password", validatePassword)
	if err != nil {
		return err
	}
	backendURL, err := promptDefault(reader, "Backend URL to test", w.cfg.Proxy.BackendURL, validateURL)
	if err != nil {
		return err
	}
	aiURL, err := promptDefault(reader, "AI Engine URL", w.cfg.AI.URL, validateURL)
	if err != nil {
		return err
	}
	proxyPort, err := promptDefault(reader, "Proxy port", strconv.Itoa(w.cfg.Proxy.Port), validatePort)
	if err != nil {
		return err
	}
	dashboardPort, err := promptDefault(reader, "Dashboard port", strconv.Itoa(w.cfg.Dashboard.Port), validatePort)
	if err != nil {
		return err
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		return err
	}
	if err := w.repo.CreateUser(&models.User{Username: username, PasswordHash: hash}); err != nil {
		return err
	}

	w.cfg.Proxy.BackendURL = backendURL
	w.cfg.AI.URL = aiURL
	w.cfg.Proxy.Port = mustPort(proxyPort, w.cfg.Proxy.Port)
	w.cfg.Dashboard.Port = mustPort(dashboardPort, w.cfg.Dashboard.Port)
	if err := writeRuntimeConfig(w.configPath, w.cfg); err != nil {
		return err
	}
	return initDatasetCSV("logs/dataset.csv")
}

func prompt(reader *bufio.Reader, label string, validate func(string) error) (string, error) {
	fmt.Printf("%s: ", label)
	value, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	value = strings.TrimSpace(value)
	return value, validate(value)
}

func promptDefault(reader *bufio.Reader, label, fallback string, validate func(string) error) (string, error) {
	fmt.Printf("%s [%s]: ", label, fallback)
	value, err := reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	value = strings.TrimSpace(value)
	if value == "" {
		value = fallback
	}
	return value, validate(value)
}

func mustPort(value string, fallback int) int {
	port, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return port
}

func writeRuntimeConfig(path string, cfg config.Config) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	content := fmt.Sprintf(`proxy:
  port: %d
  read_timeout: %s
  write_timeout: %s
  idle_timeout: %s
  backend_url: %q

ai:
  url: %q
  timeout: %s
  health_interval: %s
  max_retries: %d

admin:
  threshold: %.1f

dashboard:
  port: %d

database:
  path: %q

static_extensions:
%s
`,
		cfg.Proxy.Port,
		cfg.Proxy.ReadTimeout,
		cfg.Proxy.WriteTimeout,
		cfg.Proxy.IdleTimeout,
		cfg.Proxy.BackendURL,
		cfg.AI.URL,
		cfg.AI.Timeout,
		cfg.AI.HealthInterval,
		cfg.AI.MaxRetries,
		cfg.Admin.Threshold,
		cfg.Dashboard.Port,
		cfg.DB.Path,
		formatExtensions(cfg.StaticExtensions),
	)
	return os.WriteFile(path, []byte(content), 0644)
}

func formatExtensions(exts []string) string {
	var b strings.Builder
	for _, ext := range exts {
		b.WriteString("  - ")
		b.WriteString(ext)
		b.WriteByte('\n')
	}
	return strings.TrimRight(b.String(), "\n")
}

func initDatasetCSV(path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	if _, err := os.Stat(path); err == nil {
		return nil
	}
	return os.WriteFile(path, []byte("request_string,attack_vector,code,created_at\n"), 0644)
}
