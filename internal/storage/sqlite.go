package storage

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"smart-waf/pkg/models"

	_ "modernc.org/sqlite"
)

type SQLiteRepository struct {
	db *sql.DB
}

func Open(path string) (*SQLiteRepository, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)

	repo := &SQLiteRepository{db: db}
	if err := repo.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := repo.seedAttackVectors(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return repo, nil
}

func (r *SQLiteRepository) Close() error {
	return r.db.Close()
}

func (r *SQLiteRepository) migrate() error {
	statements := []string{
		`PRAGMA journal_mode=WAL;`,
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS pending_requests (
			request_id TEXT PRIMARY KEY,
			waf_request_json TEXT NOT NULL,
			ai_response_json TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS labeled_data (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_string TEXT NOT NULL,
			attack_vector TEXT NOT NULL,
			code INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS attack_vectors (
			name TEXT PRIMARY KEY,
			code INTEGER UNIQUE NOT NULL,
			category TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS audit_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_type TEXT NOT NULL,
			request_id TEXT,
			metadata TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
	}
	for _, statement := range statements {
		if _, err := r.db.Exec(statement); err != nil {
			return err
		}
	}
	_, _ = r.db.Exec(`ALTER TABLE attack_vectors ADD COLUMN category TEXT`)
	return nil
}

func (r *SQLiteRepository) seedAttackVectors() error {
	for name, code := range models.AttackVectors {
		if _, err := r.db.Exec(`INSERT OR IGNORE INTO attack_vectors (name, code) VALUES (?, ?)`, name, code); err != nil {
			return err
		}
	}
	return nil
}

func (r *SQLiteRepository) CreateUser(u *models.User) error {
	result, err := r.db.Exec(
		`INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)`,
		u.Username,
		u.PasswordHash,
		time.Now().UTC(),
	)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err == nil {
		u.ID = id
	}
	return nil
}

func (r *SQLiteRepository) GetUser(username string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(
		`SELECT id, username, password_hash, created_at FROM users WHERE username = ?`,
		username,
	).Scan(&user.ID, &user.Username, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *SQLiteRepository) SavePendingRequest(req *models.WAFRequest, aiResp *models.AIResponse) error {
	reqJSON, err := json.Marshal(req)
	if err != nil {
		return err
	}
	aiJSON, err := json.Marshal(aiResp)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(
		`INSERT OR REPLACE INTO pending_requests (request_id, waf_request_json, ai_response_json, created_at) VALUES (?, ?, ?, ?)`,
		req.RequestID,
		string(reqJSON),
		string(aiJSON),
		time.Now().UTC(),
	)
	return err
}

func decodePendingRequest(rawReq, rawAI string, createdAt time.Time) (*PendingRequestDetails, error) {
	var req models.WAFRequest
	if err := json.Unmarshal([]byte(rawReq), &req); err != nil {
		return nil, err
	}
	details := &PendingRequestDetails{Request: &req, CreatedAt: createdAt}
	trimmedAI := strings.TrimSpace(rawAI)
	if trimmedAI != "" && trimmedAI != "null" {
		var aiResp models.AIResponse
		if err := json.Unmarshal([]byte(trimmedAI), &aiResp); err != nil {
			return nil, err
		}
		details.AIResponse = &aiResp
		details.HasAIResult = true
		details.WasFailOpen = false
	} else {
		details.WasFailOpen = true
	}
	return details, nil
}

func (r *SQLiteRepository) GetPendingRequests() ([]*PendingRequestDetails, error) {
	rows, err := r.db.Query(`SELECT waf_request_json, COALESCE(ai_response_json, ''), created_at FROM pending_requests ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []*PendingRequestDetails
	for rows.Next() {
		var rawReq, rawAI string
		var createdAt time.Time
		if err := rows.Scan(&rawReq, &rawAI, &createdAt); err != nil {
			return nil, err
		}
		details, err := decodePendingRequest(rawReq, rawAI, createdAt)
		if err != nil {
			return nil, err
		}
		requests = append(requests, details)
	}
	return requests, rows.Err()
}

func (r *SQLiteRepository) GetPendingRequestByID(id string) (*PendingRequestDetails, error) {
	var rawReq, rawAI string
	var createdAt time.Time
	err := r.db.QueryRow(`SELECT waf_request_json, COALESCE(ai_response_json, ''), created_at FROM pending_requests WHERE request_id = ?`, id).Scan(&rawReq, &rawAI, &createdAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("pending request not found")
	}
	if err != nil {
		return nil, err
	}
	return decodePendingRequest(rawReq, rawAI, createdAt)
}

func (r *SQLiteRepository) CountPendingRequests() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM pending_requests`).Scan(&count)
	return count, err
}

func (r *SQLiteRepository) DeletePendingRequest(id string) error {
	_, err := r.db.Exec(`DELETE FROM pending_requests WHERE request_id = ?`, id)
	return err
}

func (r *SQLiteRepository) SaveLabeledData(req string, vector string, code int) error {
	createdAt := time.Now().UTC()
	_, err := r.db.Exec(
		`INSERT INTO labeled_data (request_string, attack_vector, code, created_at) VALUES (?, ?, ?, ?)`,
		req,
		vector,
		code,
		createdAt,
	)
	if err != nil {
		return err
	}
	return appendDatasetCSV("logs/dataset.csv", req, vector, code, createdAt)
}

func (r *SQLiteRepository) SaveAttackVector(name string, code int, category ...string) error {
	var categoryValue any
	if len(category) > 0 && category[0] != "" {
		categoryValue = category[0]
	}
	_, err := r.db.Exec(`INSERT OR REPLACE INTO attack_vectors (name, code, category) VALUES (?, ?, ?)`, name, code, categoryValue)
	return err
}

func (r *SQLiteRepository) GetAttackVectors() (map[string]int, error) {
	rows, err := r.db.Query(`SELECT name, code FROM attack_vectors ORDER BY code ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	vectors := map[string]int{}
	for rows.Next() {
		var name string
		var code int
		if err := rows.Scan(&name, &code); err != nil {
			return nil, err
		}
		vectors[name] = code
	}
	return vectors, rows.Err()
}

func (r *SQLiteRepository) SaveBlockedEvent(req *models.WAFRequest, aiResp *models.AIResponse) error {
	wafJSON, err := json.Marshal(req)
	if err != nil {
		return err
	}
	aiJSON, err := json.Marshal(aiResp)
	if err != nil {
		return err
	}
	meta := map[string]string{
		"waf_request_json": string(wafJSON),
		"ai_response_json": string(aiJSON),
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(`INSERT INTO audit_logs (event_type, request_id, metadata, created_at) VALUES (?, ?, ?, ?)`, "blocked", req.RequestID, string(metaJSON), time.Now().UTC())
	return err
}

func (r *SQLiteRepository) GetBlockedEvents() ([]*BlockedEventDetails, error) {
	rows, err := r.db.Query(`SELECT request_id, metadata, created_at FROM audit_logs WHERE event_type = 'blocked' ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*BlockedEventDetails
	for rows.Next() {
		var requestID string
		var rawMeta string
		var createdAt time.Time
		if err := rows.Scan(&requestID, &rawMeta, &createdAt); err != nil {
			return nil, err
		}
		var meta map[string]string
		if err := json.Unmarshal([]byte(rawMeta), &meta); err != nil {
			return nil, err
		}
		var be BlockedEventDetails
		if wafRaw, ok := meta["waf_request_json"]; ok && strings.TrimSpace(wafRaw) != "" {
			var req models.WAFRequest
			if err := json.Unmarshal([]byte(wafRaw), &req); err == nil {
				be.Request = &req
			}
		}
		if aiRaw, ok := meta["ai_response_json"]; ok && strings.TrimSpace(aiRaw) != "" && aiRaw != "null" {
			var aiResp models.AIResponse
			if err := json.Unmarshal([]byte(aiRaw), &aiResp); err == nil {
				be.AIResponse = &aiResp
			}
		}
		be.CreatedAt = createdAt
		events = append(events, &be)
	}
	return events, rows.Err()
}

func appendDatasetCSV(path, requestString, attackVector string, code int, createdAt time.Time) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	needsHeader := false
	info, err := os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		needsHeader = true
	} else if err != nil {
		return err
	} else if info.Size() == 0 {
		needsHeader = true
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	if needsHeader {
		if err := writer.Write([]string{"request_string", "attack_vector", "code", "created_at"}); err != nil {
			return err
		}
	}
	if err := writer.Write([]string{requestString, attackVector, strconv.Itoa(code), createdAt.Format(time.RFC3339Nano)}); err != nil {
		return err
	}
	writer.Flush()
	return writer.Error()
}
