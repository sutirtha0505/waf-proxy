package admin

import "net/http"

func Router(handler *Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/admin/requests/count", handler.Count)
	mux.HandleFunc("/api/admin/requests", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/admin/requests" {
			http.NotFound(w, r)
			return
		}
		handler.List(w, r)
	})
	mux.HandleFunc("/api/admin/requests/", func(w http.ResponseWriter, r *http.Request) {
		id, action := requestIDFromPath(r.URL.Path, "/api/admin/requests/")
		switch {
		case id == "":
			http.NotFound(w, r)
		case action == "" && r.Method == http.MethodGet:
			handler.Get(w, r, id)
		case action == "safe" && r.Method == http.MethodPost:
			handler.Safe(w, r, id)
		case action == "unsafe" && r.Method == http.MethodPost:
			handler.Unsafe(w, r, id)
		default:
			http.NotFound(w, r)
		}
	})

	mux.HandleFunc("/api/admin/requests/bulk/", func(w http.ResponseWriter, r *http.Request) {
		rest := r.URL.Path[len("/api/admin/requests/bulk/"):]
		switch rest {
		case "safe":
			if r.Method == http.MethodPost {
				handler.BulkSafe(w, r)
				return
			}
		case "unsafe":
			if r.Method == http.MethodPost {
				handler.BulkUnsafe(w, r)
				return
			}
		case "delete":
			if r.Method == http.MethodPost {
				handler.BulkDelete(w, r)
				return
			}
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/api/admin/vectors", handler.Vectors)
	mux.HandleFunc("/api/admin/blocked", handler.BlockedList)
	return mux
}
