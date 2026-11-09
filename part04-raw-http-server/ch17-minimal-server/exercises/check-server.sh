#!/usr/bin/env bash
# 練習問題2の確認スクリプト。サーバを 127.0.0.1:9177 で起動して確かめ、最後に止める
# 使い方: bash check-server.sh [確かめるファイル]   （既定は buggy-server.mjs）
#         bash check-server.sh ../solutions/server.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-server.mjs"
fi
PORT=9177
URL="http://127.0.0.1:$PORT"
LOG="$(mktemp)"
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

# サーバが落ちていたら起動し直す（1つのバグで、後の確認がすべて失敗しないように）
start() {
  PORT=$PORT node "$SERVER" > "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/api/messages" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }
restart_if_dead() { [ "$(alive)" = yes ] || { wait "$PID" 2> /dev/null; start; }; }
header() { tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2- ; }

start

# 1. / の Content-Type に charset がある
check "1. / の Content-Type に charset=utf-8 がある" "text/html; charset=utf-8" "$(curl -s -D - -o /dev/null --max-time 2 "$URL/" | header Content-Type)"
check "2. / の後もサーバが動いている" "yes" "$(sleep 0.2; alive)"
restart_if_dead
check "3. / に Cache-Control: no-store がある" "no-store" "$(curl -s -D - -o /dev/null --max-time 2 "$URL/" | header Cache-Control)"
restart_if_dead

# 4. JSON の一覧が最後まで届き、Content-Length がバイト数と同じ
body="$(curl -s --max-time 2 "$URL/api/messages")"
check "4. /api/messages の JSON が最後まで届く（JSON として読める）" "ok" "$(printf '%s' "$body" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{JSON.parse(s);console.log("ok")}catch{console.log("読めない: "+s.slice(-20))}})')"
check "5. /api/messages の Content-Type に charset=utf-8 がある" "application/json; charset=utf-8" "$(curl -s -D - -o /dev/null --max-time 2 "$URL/api/messages" | header Content-Type)"

# 6. 無い id は 1 秒以内に 404
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "$URL/api/messages/999")"
check "6. 無い id は 1 秒以内に 404" "404" "$code"

# 7. 正しい POST は 201 と Location
out="$(curl -s -D - -o /dev/null --max-time 2 -H 'Content-Type: application/json' -d '{"name":"テスト","text":"こんにちは"}' "$URL/api/messages")"
check "7. POST は 201" "201" "$(printf '%s' "$out" | head -1 | cut -d' ' -f2)"
check "8. POST の Location" "/api/messages/3" "$(printf '%s' "$out" | header Location)"

# 9. 壊れた JSON は 400。サーバは落ちない
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 -d '{ 壊れている' "$URL/api/messages")"
check "9. 壊れた JSON は 400" "400" "$code"
check "10. 壊れた JSON の後もサーバが動いている" "yes" "$(sleep 0.2; alive)"
restart_if_dead

# 11. ハンドラの中の失敗は 500。サーバは落ちない
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$URL/api/stats")"
check "11. /api/stats（ファイルが無い）は 500" "500" "$code"
check "12. /api/stats の後もサーバが動いている" "yes" "$(sleep 0.2; alive)"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 件失敗しました"
  exit 1
fi
