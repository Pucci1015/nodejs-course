#!/usr/bin/env bash
# 練習問題9の確認スクリプト。サーバを 127.0.0.1:9329 で起動して確かめ、最後に止める
# 使い方: bash check-design.sh [確かめるファイル]   （既定は buggy-api.mjs）
#         bash check-design.sh ../solutions/design-api.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-api.mjs"
fi
PORT=9329
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

env -u NODE_ENV PORT=$PORT node "$SERVER" >> "$LOG" 2>&1 &
PID=$!
for _ in $(seq 1 50); do
  curl -s -o /dev/null "$URL/api/tasks" && break
  sleep 0.1
done
curl -s -o /dev/null "$URL/api/tasks" || { echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1; }

code() { curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$@"; }
body() { curl -s --max-time 2 "$@"; }
header() { curl -s -D - -o /dev/null --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
ctype() { header Content-Type "$@" | cut -d';' -f1; }
# jget 'errors.0.pointer' — 標準入力の JSON から、点で区切った場所の値を取り出す
jget() {
  node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let v;
      try { v = JSON.parse(s); } catch { return console.log("(JSON ではない)"); }
      for (const k of process.argv[1].split(".").filter(Boolean)) v = v?.[k];
      console.log(typeof v === "object" && v !== null ? JSON.stringify(v) : String(v));
    });' "$1"
}
JSONH=(-H 'Content-Type: application/json')

echo "--- 一覧"
check "1. ?limit=abc は 400" 400 "$(code "$URL/api/tasks?limit=abc")"
check "2. ?limit=1000 は 400（上限なしに返さない）" 400 "$(code "$URL/api/tasks?limit=1000")"
check "3. ?limit=5 は 5 件" 5 "$(body "$URL/api/tasks?limit=5" | jget items.length)"

echo "--- 1件"
check "4. GET /api/tasks/999 は 404" 404 "$(code "$URL/api/tasks/999")"
check "5. その 404 は application/problem+json" application/problem+json "$(ctype "$URL/api/tasks/999")"
check "6. 本文の status も 404" 404 "$(body "$URL/api/tasks/999" | jget status)"

echo "--- 作る"
created="$(curl -s -D - --max-time 2 "${JSONH[@]}" -d '{"title":"卵を買う"}' "$URL/api/tasks" | tr -d '\r')"
check "7. POST /api/tasks は 201" 201 "$(echo "$created" | head -1 | cut -d' ' -f2)"
newid="$(echo "$created" | sed '1,/^$/d' | jget id)"
check "8. Location はできたタスクの URL" "/api/tasks/$newid" "$(echo "$created" | grep -i '^location:' | cut -d' ' -f2-)"
check "9. title が無ければ 422" 422 "$(code "${JSONH[@]}" -d '{}' "$URL/api/tasks")"
check "10. 422 の errors で、間違った場所を示す" '#/title' "$(body "${JSONH[@]}" -d '{}' "$URL/api/tasks" | jget errors.0.pointer)"
check "11. JSON でないボディは 415" 415 "$(code -H 'Content-Type: text/plain' -d 'title=卵' "$URL/api/tasks")"
leak="$( (body "${JSONH[@]}" -d '{}' "$URL/api/tasks"; body -H 'Content-Type: text/plain' -d 'x' "$URL/api/tasks") | grep -c -E 'ZodError|Cannot read|invalid_type|"expected"')"
check "12. 間違いの本文に、サーバの中の文が出ない" 0 "$leak"

echo "--- 変える"
check "13. PATCH {status: done} は 200 で done になる" "200 done" "$(code -X PATCH "${JSONH[@]}" -d '{"status":"done"}' "$URL/api/tasks/1") $(body "$URL/api/tasks/1" | jget status)"
check "14. PATCH で id を送ると 422" 422 "$(code -X PATCH "${JSONH[@]}" -d '{"id":1}' "$URL/api/tasks/2")"
check "15. その後も、タスク 2 は id 2 のまま" "200 2" "$(code "$URL/api/tasks/2") $(body "$URL/api/tasks/2" | jget id)"
check "16. PATCH の値の間違い（status: later）は 422" 422 "$(code -X PATCH "${JSONH[@]}" -d '{"status":"later"}' "$URL/api/tasks/1")"
check "17. 無いタスクの PATCH は 404" 404 "$(code -X PATCH "${JSONH[@]}" -d '{"status":"done"}' "$URL/api/tasks/999")"

echo "--- 消す"
check "18. DELETE は 204 で本文なし" "204 0" "$(curl -s -o /dev/null -w '%{http_code} %{size_download}' --max-time 2 -X DELETE "$URL/api/tasks/3")"
check "19. もう一度 DELETE すると 404" 404 "$(code -X DELETE "$URL/api/tasks/3")"

echo "--- そのほか"
check "20. どのルートにもないパスも problem+json の 404" "404 application/problem+json" "$(code "$URL/api/nothing") $(ctype "$URL/api/nothing")"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 個の確認が失敗しました"
  exit 1
fi
