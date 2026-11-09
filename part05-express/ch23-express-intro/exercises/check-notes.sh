#!/usr/bin/env bash
# 練習問題4の確認スクリプト。サーバを 127.0.0.1:9309 で起動して確かめ、最後に止める
# 使い方: bash check-notes.sh [確かめるファイル]   （既定は buggy-notes.mjs）
#         bash check-notes.sh ../solutions/notes.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-notes.mjs"
fi
PORT=9309
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
  # NODE_ENV は付けない（開発のときと同じ。既定のエラーハンドラはスタックトレースを返す）
  env -u NODE_ENV PORT=$PORT node "$SERVER" >> "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/notes" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }
restart_if_dead() { [ "$(alive)" = yes ] || { wait "$PID" 2> /dev/null; start; }; }

code() { curl -s --path-as-is -o /dev/null -w '%{http_code}' --max-time 2 "$@"; }
body() { curl -s --path-as-is --max-time 2 "$@"; }
header() { curl -s --path-as-is -D - -o /dev/null --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
ctype() { header Content-Type "$@" | cut -d';' -f1; }
# JSON の値を1つ取り出す: json 式   （例: json 'd.length'、json 'd.title'）
json() { node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{const d=JSON.parse(s);console.log(eval(process.argv[1]))}catch{console.log("JSON ではない")}})' "$1"; }
JSONH=(-H 'Content-Type: application/json')

start

echo "--- 一覧と検索"
check "1. GET /notes は 2件" 2 "$(body "$URL/notes" | json 'd.length')"
check "2. ?tag=NODE（大文字）でも 1件" 1 "$(body "$URL/notes?tag=NODE" | json 'd.length')"
check "3. ?tag=a&tag=b（2つ）は 400" 400 "$(code "$URL/notes?tag=a&tag=b")"
check "4. その 400 は JSON で返す" application/json "$(ctype "$URL/notes?tag=a&tag=b")"
restart_if_dead
check "5. GET /notes/search?q=Express は 200" 200 "$(code "$URL/notes/search?q=Express")"
check "6. その結果は 1件" 1 "$(body "$URL/notes/search?q=Express" | json 'd.length')"

echo "--- 1件"
check "7. GET /notes/1 は 200" 200 "$(code "$URL/notes/1")"
check "8. GET /notes/99 は 404" 404 "$(code "$URL/notes/99")"
check "9. 404 のとき、サーバのログにエラーが出ていない" 0 "$(sleep 0.2; grep -c -E 'Error|TypeError' "$LOG")"
check "10. GET /notes/abc は 400" 400 "$(code "$URL/notes/abc")"

echo "--- 作る"
check "11. POST /notes（JSON）は 201" 201 "$(code "${JSONH[@]}" -d '{"title":"新しいメモ"}' "$URL/notes")"
check "12. その本文は、作ったメモ（title）" "新しいメモ2" "$(body "${JSONH[@]}" -d '{"title":"新しいメモ2"}' "$URL/notes" | json 'd.title')"
check "13. その Location は /notes/5" /notes/5 "$(header Location "${JSONH[@]}" -d '{"title":"新しいメモ3"}' "$URL/notes")"
check "14. title が無ければ 422" 422 "$(code "${JSONH[@]}" -d '{}' "$URL/notes")"
check "15. 壊れた JSON は 400" 400 "$(code "${JSONH[@]}" -d '{"title":' "$URL/notes")"
check "16. 壊れた JSON の 400 も JSON で返す" application/json "$(ctype "${JSONH[@]}" -d '{"title":' "$URL/notes")"
check "17. フォームから作ると 303" 303 "$(code -d 'title=フォームのメモ' "$URL/notes/form")"
check "18. その Location は /notes" /notes "$(header Location -d 'title=フォームのメモ2' "$URL/notes/form")"

echo "--- エラーと公開するファイル"
check "19. 壊れた JSON の本文に、スタックトレースを出さない" 0 "$(body "${JSONH[@]}" -d '{"title":' "$URL/notes" | grep -c 'at ')"
check "20. Content-Type が text/plain の POST /notes は 415" 415 "$(code -H 'Content-Type: text/plain' -d '{"title":"x"}' "$URL/notes")"
check "21. /style.css は 200" 200 "$(code "$URL/style.css")"
check "22. サーバのソース（/buggy-notes.mjs）は返さない" 404 "$(code "$URL/buggy-notes.mjs")"
check "23. /check-notes.sh も返さない" 404 "$(code "$URL/check-notes.sh")"
check "24. X-Powered-By を付けない" "" "$(header X-Powered-By "$URL/notes")"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 個の確認が失敗しました"
  exit 1
fi
