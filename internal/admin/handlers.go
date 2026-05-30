package admin

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"smart-waf/internal/storage"
)

type Handler struct {
	repo storage.Repository
}

func NewHandler(repo storage.Repository) *Handler {
	return &Handler{repo: repo}
}

func (h *Handler) Count(w http.ResponseWriter, r *http.Request) {
	count, err := h.repo.CountPendingRequests()
	writeJSON(w, map[string]int{"count": count}, err)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	requests, err := h.repo.GetPendingRequests()
	if err != nil {
		writeJSON(w, nil, err)
		return
	}
	type item struct {
		RequestID string `json:"request_id"`
	}
	out := make([]item, 0, len(requests))
	for _, req := range requests {
		out = append(out, item{RequestID: req.RequestID})
	}
	writeJSON(w, out, nil)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request, id string) {
	req, err := h.repo.GetPendingRequestByID(id)
	writeJSON(w, req, err)
}

func (h *Handler) Safe(w http.ResponseWriter, r *http.Request, id string) {
	req, err := h.repo.GetPendingRequestByID(id)
	if err == nil {
		err = h.repo.SaveLabeledData(ToBERTString(req), "safe", 0)
	}
	if err == nil {
		err = h.repo.DeletePendingRequest(id)
	}
	writeJSON(w, map[string]string{"status": "ok"}, err)
}

func (h *Handler) Unsafe(w http.ResponseWriter, r *http.Request, id string) {
	var body struct {
		VectorName string `json:"vector_name"`
		Code       int    `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, nil, err)
		return
	}
	vectors, err := h.repo.GetAttackVectors()
	if err != nil {
		writeJSON(w, nil, err)
		return
	}
	if vectors[body.VectorName] != body.Code {
		writeJSONStatus(w, nil, errors.New("unknown attack vector or code mismatch"), http.StatusBadRequest)
		return
	}
	req, err := h.repo.GetPendingRequestByID(id)
	if err == nil {
		err = h.repo.SaveLabeledData(ToBERTString(req), body.VectorName, body.Code)
	}
	if err == nil {
		err = h.repo.DeletePendingRequest(id)
	}
	writeJSON(w, map[string]string{"status": "ok"}, err)
}

func (h *Handler) Vectors(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		vectors, err := h.repo.GetAttackVectors()
		writeJSON(w, vectors, err)
		return
	}
	var body struct {
		Category string `json:"category"`
		Name     string `json:"name"`
		Code     int    `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, nil, err)
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		writeJSONStatus(w, nil, errors.New("name is required"), http.StatusBadRequest)
		return
	}
	if body.Code == 0 {
		vectors, _ := h.repo.GetAttackVectors()
		body.Code = NextAvailableCode(vectors)
	}
	err := h.repo.SaveAttackVector(body.Name, body.Code, body.Category)
	writeJSON(w, map[string]any{"name": body.Name, "code": body.Code}, err)
}

func (h *Handler) BulkSafe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, nil, err)
		return
	}
	var errs []string
	for _, id := range body.IDs {
		req, err := h.repo.GetPendingRequestByID(id)
		if err != nil {
			errs = append(errs, id+": "+err.Error())
			continue
		}
		if err := h.repo.SaveLabeledData(ToBERTString(req), "safe", 0); err != nil {
			errs = append(errs, id+": "+err.Error())
			continue
		}
		if err := h.repo.DeletePendingRequest(id); err != nil {
			errs = append(errs, id+": "+err.Error())
			continue
		}
	}
	if len(errs) > 0 {
		writeJSONStatus(w, map[string]any{"status": "partial", "errors": errs}, nil, http.StatusMultiStatus)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"}, nil)
}

func (h *Handler) BulkUnsafe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Items []struct {
			ID         string `json:"id"`
			VectorName string `json:"vector_name"`
			Code       int    `json:"code"`
		} `json:"items"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, nil, err)
		return
	}
	vectors, err := h.repo.GetAttackVectors()
	if err != nil {
		writeJSON(w, nil, err)
		return
	}
	var errs []string
	for _, it := range body.Items {
		if vectors[it.VectorName] != it.Code {
			errs = append(errs, it.ID+": unknown vector/code")
			continue
		}
		req, err := h.repo.GetPendingRequestByID(it.ID)
		if err != nil {
			errs = append(errs, it.ID+": "+err.Error())
			continue
		}
		if err := h.repo.SaveLabeledData(ToBERTString(req), it.VectorName, it.Code); err != nil {
			errs = append(errs, it.ID+": "+err.Error())
			continue
		}
		if err := h.repo.DeletePendingRequest(it.ID); err != nil {
			errs = append(errs, it.ID+": "+err.Error())
			continue
		}
	}
	if len(errs) > 0 {
		writeJSONStatus(w, map[string]any{"status": "partial", "errors": errs}, nil, http.StatusMultiStatus)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"}, nil)
}

func (h *Handler) BulkDelete(w http.ResponseWriter, r *http.Request) {
	var body struct {
		IDs []string `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, nil, err)
		return
	}
	var errs []string
	for _, id := range body.IDs {
		if err := h.repo.DeletePendingRequest(id); err != nil {
			errs = append(errs, id+": "+err.Error())
		}
	}
	if len(errs) > 0 {
		writeJSONStatus(w, map[string]any{"status": "partial", "errors": errs}, nil, http.StatusMultiStatus)
		return
	}
	writeJSON(w, map[string]string{"status": "ok"}, nil)
}

func writeJSON(w http.ResponseWriter, value any, err error) {
	writeJSONStatus(w, value, err, http.StatusInternalServerError)
}

func writeJSONStatus(w http.ResponseWriter, value any, err error, status int) {
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(value)
}

func requestIDFromPath(path, prefix string) (string, string) {
	rest := strings.TrimPrefix(path, prefix)
	parts := strings.Split(strings.Trim(rest, "/"), "/")
	if len(parts) == 0 {
		return "", ""
	}
	action := ""
	if len(parts) > 1 {
		action = parts[1]
	}
	return parts[0], action
}
