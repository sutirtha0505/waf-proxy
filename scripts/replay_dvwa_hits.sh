#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAFE_FILE="$ROOT_DIR/safe.txt"
ATTACK_FILE="$ROOT_DIR/attacks.txt"
OUT_FILE="$ROOT_DIR/response.txt"
ADMIN_COUNT_URL="http://localhost:9090/api/admin/requests/count"
WAF_BASE_URL="${WAF_BASE_URL:-http://localhost:8080}"
DVWA_USER="${DVWA_USER:-admin}"
DVWA_PASS="${DVWA_PASS:-password}"
COOKIE_JAR="$ROOT_DIR/.dvwa.cookies"

if [[ ! -f "$SAFE_FILE" || ! -f "$ATTACK_FILE" ]]; then
  echo "safe.txt or attacks.txt not found in $ROOT_DIR" >&2
  exit 1
fi

extract_count() {
  local payload="$1"
  printf '%s' "$payload" | sed -n 's/.*"count"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1
}

get_pending_count_payload() {
  curl -sS "$ADMIN_COUNT_URL" || echo "unreachable"
}

get_pending_count_value() {
  local payload
  payload="$(get_pending_count_payload)"
  extract_count "$payload"
}

extract_user_token() {
  local html="$1"
  printf '%s' "$html" | sed -n 's/.*name="user_token" value="\([^"]*\)".*/\1/p' | head -n1
}

bootstrap_dvwa_session() {
  local login_page login_token login_resp security_page security_token

  rm -f "$COOKIE_JAR"

  login_page="$(curl -sS -c "$COOKIE_JAR" "$WAF_BASE_URL/login.php")"
  login_token="$(extract_user_token "$login_page")"

  login_resp="$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$WAF_BASE_URL/login.php" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "username=$DVWA_USER&password=$DVWA_PASS&Login=Login&user_token=$login_token")"

  if printf '%s' "$login_resp" | grep -qi "login failed"; then
    return 1
  fi

  security_page="$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" "$WAF_BASE_URL/security.php")"
  security_token="$(extract_user_token "$security_page")"

  curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$WAF_BASE_URL/security.php" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "security=low&seclev_submit=Submit&user_token=$security_token" >/dev/null
}

run_group() {
  local group_name="$1"
  local file_path="$2"

  {
    echo
    echo "===== ${group_name} ====="
  } >> "$OUT_FILE"

  local index=0
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    [[ ! "$url" =~ ^http://localhost:8080/ ]] && continue

    index=$((index + 1))

    status=""
    location=""
    server=""

    headers="$(curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -D - -o /dev/null "$url" || true)"
    status="$(printf '%s\n' "$headers" | head -n1 | tr -d '\r')"
    location="$(printf '%s\n' "$headers" | awk -F': ' 'tolower($1)=="location" {print $2}' | head -n1 | tr -d '\r')"
    server="$(printf '%s\n' "$headers" | awk -F': ' 'tolower($1)=="server" {print $2}' | head -n1 | tr -d '\r')"

    {
      echo "[$index] URL: $url"
      echo "    Status: ${status:-N/A}"
      [[ -n "$location" ]] && echo "    Location: $location"
      [[ -n "$server" ]] && echo "    Server: $server"
    } >> "$OUT_FILE"
  done < "$file_path"
}

run_group_with_delta() {
  local group_name="$1"
  local file_path="$2"
  local before_value after_value

  before_value="$(get_pending_count_value || true)"
  run_group "$group_name" "$file_path"
  after_value="$(get_pending_count_value || true)"

  {
    echo
    echo "${group_name} pending count delta:"
    echo "  before=${before_value:-N/A}"
    echo "  after=${after_value:-N/A}"
    if [[ -n "${before_value:-}" && -n "${after_value:-}" ]]; then
      echo "  delta=$((after_value - before_value))"
    else
      echo "  delta=N/A"
    fi
  } >> "$OUT_FILE"
}

{
  echo "DVWA WAF replay report"
  echo "Generated: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "Root: $ROOT_DIR"
  echo "WAF target: $WAF_BASE_URL"
  echo "Dashboard API: $ADMIN_COUNT_URL"
  echo "DVWA user: $DVWA_USER"
  echo
  echo "Pending count (before):"
  get_pending_count_payload
} > "$OUT_FILE"

{
  echo
  echo "DVWA session bootstrap:"
} >> "$OUT_FILE"

if bootstrap_dvwa_session; then
  {
    echo "  login: ok"
    echo "  security_level: low"
  } >> "$OUT_FILE"
else
  {
    echo "  login: failed"
    echo "  security_level: not_set"
    echo "  note: replay will continue; many hits may redirect to login.php"
  } >> "$OUT_FILE"
fi

run_group_with_delta "SAFE URL HITS" "$SAFE_FILE"
run_group_with_delta "ATTACK URL HITS" "$ATTACK_FILE"

{
  echo
  echo "Pending count (after):"
  get_pending_count_payload
} >> "$OUT_FILE"

echo "Report written to $OUT_FILE"