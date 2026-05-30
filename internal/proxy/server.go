package proxy

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"smart-waf/internal/config"
)

type Server struct {
	httpServer *http.Server
}

func NewServer(cfg config.Config, handler *Handler, logger *log.Logger) (*Server, error) {
	backend, err := url.Parse(cfg.Proxy.BackendURL)
	if err != nil {
		return nil, err
	}

	proxy := httputil.NewSingleHostReverseProxy(backend)
	originalDirector := proxy.Director
	proxy.Director = func(r *http.Request) {
		originalDirector(r)
		r.Host = backend.Host
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		logger.Printf("proxy error request_id=%s err=%v", r.Header.Get("X-WAF-Request-ID"), err)
		http.Error(w, "bad gateway", http.StatusBadGateway)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		recorder := &responseRecorder{ResponseWriter: w}
		if handler.Intercept(recorder, r) {
			proxy.ServeHTTP(recorder, r)
		}
		logResponse(logger, r.Header.Get("X-WAF-Request-ID"), recorder.status, started)
	})

	return &Server{httpServer: &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Proxy.Port),
		Handler:      mux,
		ReadTimeout:  cfg.Proxy.ReadTimeout,
		WriteTimeout: cfg.Proxy.WriteTimeout,
		IdleTimeout:  cfg.Proxy.IdleTimeout,
	}}, nil
}

func (s *Server) Start() error {
	return s.httpServer.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpServer.Shutdown(ctx)
}
