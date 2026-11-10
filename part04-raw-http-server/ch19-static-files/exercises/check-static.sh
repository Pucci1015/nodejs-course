#!/usr/bin/env bash
# 練習問題9の確認スクリプト。サーバを 127.0.0.1:9195 で起動して確かめ、最後に止める
# 使い方: bash check-static.sh [確かめるファイル]   （既定は buggy-static.mjs）
#         bash check-static.sh ../solutions/static-server.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-static.mjs"
fi
PORT=9195
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
  PORT=$PORT node "$SERVER" >> "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null --max-time 1 "$URL/hello.txt" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }
# サーバが落ちていたら起動し直す（1つのバグで、後の確認がすべて失敗しないように）
restart_if_dead() { [ "$(alive)" = yes ] || { wait "$PID" 2> /dev/null; start; }; }

code() { curl -s --path-as-is -o /dev/null -w '%{http_code}' --max-time 2 "$@"; }
header() { curl -s --path-as-is -D - -o /dev/null --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
# HEAD は -I。-X HEAD だと curl が本文を待ってしまう
head_header() { curl -s --path-as-is -I --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }

start

echo "--- Content-Type"
check "1. /style.css は text/css; charset=utf-8" "text/css; charset=utf-8" "$(header Content-Type "$URL/style.css")"
check "2. /app.js は text/javascript; charset=utf-8" "text/javascript; charset=utf-8" "$(header Content-Type "$URL/app.js")"
check "3. /img/logo.svg は image/svg+xml" "image/svg+xml" "$(header Content-Type "$URL/img/logo.svg")"
check "4. /hello.txt は text/plain; charset=utf-8" "text/plain; charset=utf-8" "$(header Content-Type "$URL/hello.txt")"

echo "--- パス"
check "5. /style.css?v=2（クエリ付き）は 200" 200 "$(code "$URL/style.css?v=2")"
restart_if_dead
check "6. /docs は 308" 308 "$(code "$URL/docs")"
restart_if_dead
check "7. その Location は /docs/" /docs/ "$(header Location "$URL/docs")"
restart_if_dead
check "8. /docs/ は 200" 200 "$(code "$URL/docs/")"
restart_if_dead
check "9. /..%2Foutside.txt（public の外）は 403" 403 "$(code "$URL/..%2Foutside.txt")"
restart_if_dead
check "10. /.private-note.txt は 404" 404 "$(code "$URL/.private-note.txt")"
restart_if_dead
check "11. 無いファイルは 404" 404 "$(code "$URL/nothing.txt")"
restart_if_dead
check "12. /img（index.html の無いフォルダ）は 404 か 308" yes "$(c=$(code "$URL/img/"); [ "$c" = 404 ] && echo yes || echo "no（$c）")"
check "13. その後もサーバが動いている" yes "$(sleep 0.2; alive)"
restart_if_dead
check "14. 壊れた %xx（/%E0%A4%A）は 400" 400 "$(code "$URL/%E0%A4%A")"
check "15. その後もサーバが動いている" yes "$(sleep 0.2; alive)"
restart_if_dead

echo "--- HEAD とキャッシュ"
len=$(header Content-Length "$URL/hello.txt")
check "16. GET /hello.txt に Content-Length がある" 86 "$len"
check "17. HEAD /hello.txt の Content-Length も同じ" 86 "$(head_header Content-Length "$URL/hello.txt")"
lm=$(header Last-Modified "$URL/hello.txt")
check "18. Last-Modified と同じ If-Modified-Since は 304" 304 "$(code -H "If-Modified-Since: $lm" "$URL/hello.txt")"
check "19. 古い If-Modified-Since（1990年）は 200" 200 "$(code -H 'If-Modified-Since: Mon, 01 Jan 1990 00:00:00 GMT' "$URL/hello.txt")"
check "20. ETag がある" yes "$([ -n "$(header ETag "$URL/hello.txt")" ] && echo yes || echo no)"
check "21. POST は 405" 405 "$(code -X POST "$URL/hello.txt")"

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
