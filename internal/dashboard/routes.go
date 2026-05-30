package dashboard

import (
	"net/http"

	"smart-waf/internal/admin"
	"smart-waf/internal/auth"
)

func registerRoutes(mux *http.ServeMux, authn *auth.Authenticator, sessions *auth.SessionManager, adminHandler *admin.Handler) {
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/login", http.StatusFound)
	})
	mux.HandleFunc("/login", loginHandler(authn, sessions))
	mux.Handle("/dashboard", sessions.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		render(w, "dashboard.html", nil)
	})))
	mux.Handle("/requests", sessions.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		render(w, "requests.html", nil)
	})))
	mux.Handle("/api/admin/", admin.Router(adminHandler))
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("web/dashboard/static"))))
}
