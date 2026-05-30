CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_requests (
    request_id TEXT PRIMARY KEY,
    waf_request_json TEXT NOT NULL,
    ai_response_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS labeled_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_string TEXT NOT NULL,
    attack_vector TEXT NOT NULL,
    code INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attack_vectors (
    name TEXT PRIMARY KEY,
    code INTEGER UNIQUE NOT NULL,
    category TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    request_id TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
