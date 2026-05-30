package dashboard

import (
	"net/http"

	"smart-waf/internal/auth"
)

func loginHandler(authn *auth.Authenticator, sessions *auth.SessionManager) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			render(w, "login.html", nil)
			return
		}
		username := r.FormValue("username")
		password := r.FormValue("password")
		ok, _ := authn.Verify(username, password)
		if !ok {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		sessions.Set(w, username)
		http.Redirect(w, r, "/dashboard", http.StatusFound)
	}
}
