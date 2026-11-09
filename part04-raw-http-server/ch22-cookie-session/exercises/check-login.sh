#!/usr/bin/env bash
# 練習問題5の確認スクリプト。サーバを 127.0.0.1:9225 で起動して確かめ、最後に止める
# 使い方: bash check-login.sh [確かめるファイル]   （既定は buggy-login.mjs）
#         bash check-login.sh ../solutions/login.mjs
# セッションの期限を短くする（SESSION_TTL_MS=1500）ので、全部で 10 秒ほどかかる
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-login.mjs"
fi
PORT=9225
URL="http://127.0.0.1:$PORT"
LOG="$(mktemp)"
PID=""
trap 'kill "$PID" 2> /dev/null; rm -f "$LOG"' EXIT

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
  PORT=$PORT SESSION_TTL_MS=1500 node "$SERVER" >> "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null --max-time 1 "$URL/me" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }

FORM='Content-Type: application/x-www-form-urlencoded'
# req メソッド パス [sid] [フォームの本文]   → レスポンスのヘッダと本文を、そのまま出す
req() {
  local args=(-s -i --max-time 3 -X "$1" "$URL$2")
  [ -n "${3:-}" ] && args+=(-H "Cookie: sid=$3")
  [ -n "${4:-}" ] && args+=(-H "$FORM" --data "$4")
  curl "${args[@]}" | tr -d '\r'
}
status() { head -1 | cut -d' ' -f2; }
header() { grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
# Set-Cookie: sid=… の行（無ければ空）と、その値
cookie_line() { grep -i '^set-cookie: sid=' | head -1 | cut -d' ' -f2-; }
sid_in() { sed -n 's/^sid=\([^;]*\).*/\1/p'; }
has_attr() { tr ';' '\n' | sed 's/^ *//' | grep -qix "$1" && echo yes || echo no; }
csrf_in() { grep -o 'name="csrf" value="[^"]*"' | head -1 | sed 's/.*value="\([^"]*\)"/\1/'; }

start

echo "--- Cookie"
R="$(req GET /login)"
C="$(echo "$R" | cookie_line)"
A="$(echo "$C" | sid_in)"
check "1. セッション ID は 43 文字の base64url（32 バイトの乱数）" yes "$(echo "$A" | grep -qE '^[A-Za-z0-9_-]{43}$' && echo yes || echo no)"
A2="$(req GET /login | cookie_line | sid_in)"
check "2. 別の客には、別の ID" yes "$([ -n "$A2" ] && [ "$A" != "$A2" ] && echo yes || echo no)"
check "3. Cookie に HttpOnly" yes "$(echo "$C" | has_attr HttpOnly)"
check "4. Cookie に SameSite=Lax" yes "$(echo "$C" | has_attr SameSite=Lax)"
F="$(req GET /login my-own-made-up-id | cookie_line | sid_in)"
check "5. 知らない ID が来たら、使わずに新しい ID にする" yes "$([ -n "$F" ] && [ "$F" != my-own-made-up-id ] && echo yes || echo no)"
TOKEN="$(echo "$R" | csrf_in)"

echo "--- ログインの失敗"
check "6. CSRF トークンの無いログインは 403" 403 "$(req POST /login "$A" 'name=ryota&password=wrong' | status)"
R="$(req POST /login "$A" "csrf=$TOKEN&name=ryota&password=wrong")"
check "7. パスワードが違えば 303 で /login へ" "303 /login" "$(echo "$R" | status) $(echo "$R" | header Location)"
check "8. その知らせは「ユーザー名かパスワードが違います」" yes "$(req GET /login "$A" | grep -qF 'ユーザー名かパスワードが違います' && echo yes || echo no)"
check "9. 知らせは1回だけ表示する" no "$(req GET /login "$A" | grep -qF 'class="flash"' && echo yes || echo no)"
req POST /login "$A" "csrf=$TOKEN&name=nobody&password=wrong" > /dev/null
check "10. 無いユーザーでも、同じ知らせ" yes "$(req GET /login "$A" | grep -qF 'ユーザー名かパスワードが違います' && echo yes || echo no)"

echo "--- ログイン"
R="$(req POST /login "$A" "csrf=$TOKEN&name=ryota&password=dev-only-password")"
B="$(echo "$R" | cookie_line | sid_in)"
[ -z "$B" ] && B="$A"
check "11. 正しければ 303 で / へ" "303 /" "$(echo "$R" | status) $(echo "$R" | header Location)"
check "12. ログインしたら ID が変わる" yes "$([ "$A" != "$B" ] && echo yes || echo no)"
R="$(req GET /me "$B")"
check "13. 新しい ID で /me は 200 と名前" '200 {"name":"ryota"}' "$(echo "$R" | status) $(echo "$R" | tail -1)"
check "14. /me に Cache-Control: no-store" no-store "$(echo "$R" | header Cache-Control)"
check "15. ログイン前の ID では、ログインしていない（401）" 401 "$(req GET /me "$A" | status)"
check "16. Cookie が無ければ 401" 401 "$(req GET /me | status)"

echo "--- ログアウト"
TOKEN2="$(req GET / "$B" | csrf_in)"
check "17. CSRF トークンの無いログアウトは 403" 403 "$(req POST /logout "$B" 'x=1' | status)"
R="$(req POST /logout "$B" "csrf=$TOKEN2")"
check "18. ログアウトは 303 で /login へ" "303 /login" "$(echo "$R" | status) $(echo "$R" | header Location)"
check "19. ログアウトした ID は、もう使えない（401）" 401 "$(req GET /me "$B" | status)"

echo "--- 期限"
R="$(req GET /login)"
D="$(echo "$R" | cookie_line | sid_in)"
R="$(req POST /login "$D" "csrf=$(echo "$R" | csrf_in)&name=hanako&password=another-dev-password")"
E="$(echo "$R" | cookie_line | sid_in)"
[ -z "$E" ] && E="$D"
check "20. 期限の前は 200" 200 "$(req GET /me "$E" | status)"
sleep 2
check "21. 最後に使ってから期限（1.5 秒）を過ぎたら 401" 401 "$(req GET /me "$E" | status)"
check "22. その後もサーバが動いている" yes "$(alive)"

echo
echo "----- サーバの出力"
cat "$LOG"
echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 件失敗しました"
  exit 1
fi
