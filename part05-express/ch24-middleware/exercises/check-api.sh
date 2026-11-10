#!/usr/bin/env bash
# 練習問題9の確認スクリプト。サーバを 127.0.0.1:9319 で起動して確かめ、最後に止める
# 使い方: bash check-api.sh [確かめるファイル]   （既定は buggy-api.mjs）
#         bash check-api.sh ../solutions/api.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-api.mjs"
fi
PORT=9319
URL="http://127.0.0.1:$PORT"
TOKEN=dev-only-token
LOG="$(mktemp)"
ACCESS="$(mktemp)"
PID=""
trap 'kill "$PID" 2> /dev/null; rm -f "$LOG" "$ACCESS"' EXIT

failed=0
check() { # check 名前 期待 実際
  if [ "$2" = "$3" ]; then
    echo "[OK] $1"
  else
    echo "[NG] $1"
    echo "     期待: $2"
    echo "     実際: $3"
    failed=$((failed + 1))
  fi
}

start() {
  env -u NODE_ENV PORT=$PORT API_TOKEN=$TOKEN LOG_FILE="$ACCESS" node "$SERVER" >> "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/api/tasks" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$@"; }
body() { curl -s --max-time 2 "$@"; }
header() { curl -s -D - -o /dev/null --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
ctype() { header Content-Type "$@" | cut -d';' -f1; }
AUTH=(-H "Authorization: Bearer $TOKEN")
JSONH=(-H 'Content-Type: application/json')

start

echo "--- エラーの形"
check "1. GET /api/tasks/99 は 404" 404 "$(code "$URL/api/tasks/99")"
check "2. その 404 は JSON" application/json "$(ctype "$URL/api/tasks/99")"
check "3. GET /api/tasks?limit=abc は 400（JSON）" "400 application/json" "$(code "$URL/api/tasks?limit=abc") $(ctype "$URL/api/tasks?limit=abc")"
check "4. どのルートにもないパスも 404 の JSON" "404 application/json" "$(code "$URL/api/nothing") $(ctype "$URL/api/nothing")"

echo "--- 作る（ボディ）"
check "5. トークンありの POST /api/tasks は 201" 201 "$(code "${AUTH[@]}" "${JSONH[@]}" -d '{"title":"卵を買う"}' "$URL/api/tasks")"
check "6. title が無ければ 422" 422 "$(code "${AUTH[@]}" "${JSONH[@]}" -d '{}' "$URL/api/tasks")"

echo "--- 認証"
check "7. トークンなしの DELETE /api/tasks/1 は 401" 401 "$(code -X DELETE "$URL/api/tasks/1")"
check "8. 401 の後も、タスク 1 は消えていない" 200 "$(sleep 0.1; code "$URL/api/tasks/1")"
check "9. 401 のとき、サーバのログにエラーが出ていない" 0 "$(grep -c 'ERR_HTTP_HEADERS_SENT' "$LOG")"
check "10. トークンありの DELETE /api/tasks/2 は 204" 204 "$(code "${AUTH[@]}" -X DELETE "$URL/api/tasks/2")"
check "11. トークンなしの GET /admin/stats は 401" 401 "$(code "$URL/admin/stats")"
check "12. トークンありの GET /admin/stats は 200" 200 "$(code "${AUTH[@]}" "$URL/admin/stats")"

echo "--- CORS"
check "13. Origin: http://localhost:5173 には、そのオリジンを返す" "http://localhost:5173" "$(header Access-Control-Allow-Origin -H 'Origin: http://localhost:5173' "$URL/api/tasks")"
check "14. そのとき Access-Control-Allow-Credentials: true" true "$(header Access-Control-Allow-Credentials -H 'Origin: http://localhost:5173' "$URL/api/tasks")"
check "15. 知らないオリジンには Access-Control-Allow-Origin を付けない" "" "$(header Access-Control-Allow-Origin -H 'Origin: https://evil.example' "$URL/api/tasks")"

echo "--- アクセスログ"
code "$URL/api/tasks/98" > /dev/null
sleep 0.2
check "16. ログに「GET /api/tasks/98 404」と書く（応答の後のステータス）" 1 "$(grep -c '^GET /api/tasks/98 404' "$ACCESS")"
check "17. その後もサーバが動いている" yes "$(alive)"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 個の確認が失敗しました"
  exit 1
fi
