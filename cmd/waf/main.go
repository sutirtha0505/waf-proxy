package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"smart-waf/internal/ai"
	"smart-waf/internal/config"
	"smart-waf/internal/dashboard"
	"smart-waf/internal/engine"
	"smart-waf/internal/logging"
	"smart-waf/internal/proxy"
	"smart-waf/internal/storage"
)

func main() {
	logger := logging.New()
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal(err)
	}
	repo, err := storage.Open(cfg.DB.Path)
	if err != nil {
		logger.Fatal(err)
	}
	audit, err := logging.NewAuditLogger("logs/audit.jsonl")
	if err != nil {
		logger.Fatal(err)
	}
	defer audit.Close()

	aiClient := ai.NewClient(cfg.AI)
	policy := engine.NewPolicy(cfg.Admin.Threshold)
	decision := engine.NewDecision(policy, repo)
	failOpen := engine.NewFailOpen(logger, audit, repo)
	proxyHandler := proxy.NewHandler(cfg, aiClient, decision, failOpen, logger)

	proxyServer, err := proxy.NewServer(cfg, proxyHandler, logger)
	if err != nil {
		logger.Fatal(err)
	}
	dashboardServer, err := dashboard.NewServer(cfg, repo)
	if err != nil {
		logger.Fatal(err)
	}

	errCh := make(chan error, 2)
	go func() {
		logger.Printf("Proxy: http://localhost:%d", cfg.Proxy.Port)
		errCh <- proxyServer.Start()
	}()
	go func() {
		logger.Printf("Dashboard: http://localhost:%d", cfg.Dashboard.Port)
		errCh <- dashboardServer.Start()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-stop:
		logger.Printf("shutdown signal: %s", sig)
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal(err)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = proxyServer.Shutdown(ctx)
	_ = dashboardServer.Shutdown(ctx)
	fmt.Println("smart-waf stopped")
}
