#!/usr/bin/env bash
# 練習問題9の確認スクリプト。サーバを 127.0.0.1:9184 で起動して確かめ、最後に止める
# 使い方: bash check-tasks.sh [確かめるファイル]   （既定は buggy-tasks.mjs）
#         bash check-tasks.sh ../solutions/tasks.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-tasks.mjs"
fi
PORT=9184
URL="http://127.0.0.1:$PORT"
TOKEN=dev-only-token
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
  PORT=$PORT ADMIN_TOKEN=$TOKEN node "$SERVER" >> "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }
restart_if_dead() { [ "$(alive)" = yes ] || { wait "$PID" 2> /dev/null; start; }; }

# --path-as-is: curl に、/./ や // を直さずにそのまま送らせる
code() { curl -s --path-as-is -o /dev/null -w '%{http_code}' --max-time 2 "$@"; }
body() { curl -s --path-as-is --max-time 2 "$@"; }
header() { curl -s --path-as-is -D - -o /dev/null --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
count() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);console.log(Array.isArray(a)?a.length:"配列ではない")}catch{console.log("JSON ではない")}})'; }

start

echo "--- 一覧とクエリ"
check "1. GET /api/tasks は 200" 200 "$(code "$URL/api/tasks")"
check "2. GET /api/tasks?done=true は 200" 200 "$(code "$URL/api/tasks?done=true")"
check "3. ?done=true は完了したものだけ（1件）" 1 "$(body "$URL/api/tasks?done=true" | count)"
check "4. HEAD /api/tasks は 200" 200 "$(code -I "$URL/api/tasks")"
check "5. GET /api/tasks/ は 308" 308 "$(code "$URL/api/tasks/")"
check "6. その Location は /api/tasks" /api/tasks "$(header Location "$URL/api/tasks/")"

echo "--- 1件"
check "7. GET /api/tasks/1 は 200" 200 "$(code "$URL/api/tasks/1")"
check "8. GET /api/tasks/1/comments は 404（タスク 1 ではない）" 404 "$(code "$URL/api/tasks/1/comments")"
check "9. GET /old/api/tasks/1 は 404" 404 "$(code "$URL/old/api/tasks/1")"
check "10. PUT /api/tasks/1 は 405" 405 "$(code -X PUT "$URL/api/tasks/1")"
check "11. 405 の Allow" "GET, HEAD, DELETE, OPTIONS" "$(header Allow -X PUT "$URL/api/tasks/1")"

echo "--- タグ"
check "12. GET /api/tags/node は 2件" 2 "$(body "$URL/api/tags/node" | count)"
check "13. GET /api/tags/%E5%8B%89%E5%BC%B7（勉強）は 1件" 1 "$(body "$URL/api/tags/%E5%8B%89%E5%BC%B7" | count)"
check "14. 壊れた %xx（/api/tags/%E0%A4%A）は 400" 400 "$(code "$URL/api/tags/%E0%A4%A")"
check "15. その後もサーバが動いている" yes "$(sleep 0.2; alive)"
restart_if_dead

echo "--- 管理用のページ"
check "16. トークンがあれば 200" 200 "$(code -H "X-Admin-Token: $TOKEN" "$URL/admin/stats")"
check "17. トークンが無ければ 403" 403 "$(code "$URL/admin/stats")"
check "18. /./admin/stats でも、トークンが無ければ 200 にならない" no "$([ "$(code "$URL/./admin/stats")" = 200 ] && echo yes || echo no)"
check "19. //x/admin/stats でも、トークンが無ければ 200 にならない" no "$([ "$(code "$URL//x/admin/stats")" = 200 ] && echo yes || echo no)"

echo "--- 消す（最後に）"
check "20. DELETE /api/tasks/2 は 204" 204 "$(code -X DELETE "$URL/api/tasks/2")"
check "21. その後の GET /api/tasks/2 は 404" 404 "$(code "$URL/api/tasks/2")"

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
