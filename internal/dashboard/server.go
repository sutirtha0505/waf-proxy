package dashboard

import (
	"context"
	"fmt"
	"html/template"
	"net/http"
	"time"

	"smart-waf/internal/admin"
	"smart-waf/internal/auth"
	"smart-waf/internal/config"
	"smart-waf/internal/storage"
)

type Server struct {
	httpServer *http.Server
}

type pageData struct {
	Username string
}

func NewServer(cfg config.Config, repo storage.Repository) (*Server, error) {
	authn := auth.New(repo)
	sessions := auth.NewSessionManager("dev-secret-change-me", 8*time.Hour)
	adminHandler := admin.NewHandler(repo)

	mux := http.NewServeMux()
	registerRoutes(mux, authn, sessions, adminHandler, cfg.AI.URL)

	return &Server{httpServer: &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Dashboard.Port),
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}}, nil
}

func (s *Server) Start() error {
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}

func render(w http.ResponseWriter, name string, data any) {
	tmpl, err := template.ParseFiles("web/dashboard/templates/" + name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func pageDataForRequest(r *http.Request, sessions *auth.SessionManager) pageData {
	return pageData{Username: sessions.Username(r)}
}
