#!/usr/bin/env bash
# 練習問題9の確認スクリプト。サーバを何回か起動して、起動・ログ・止め方を確かめる
# 使い方: bash check-server.sh [確かめるファイル]   （既定は buggy-server.mjs）
#         bash check-server.sh ../solutions/server.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-server.mjs"
fi
PORT=9339
URL="http://127.0.0.1:$PORT"
TOKEN=dev-only-token-for-log-check
SECRET=dev-only-session-secret-for-check-0123456789
LOG="$(mktemp)"
OUT="$(mktemp)"
PID=""
trap 'kill -9 "$PID" 2> /dev/null; rm -f "$LOG" "$OUT"' EXIT

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
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$@"; }

# start 環境変数…  — サーバを後ろで起動する（ログは $LOG）
start() {
  : > "$LOG"
  env -u NODE_ENV -u PORT -u SESSION_SECRET -u LOG_LEVEL "$@" node "$SERVER" > "$LOG" 2>&1 &
  PID=$!
}
# wait_exit 秒 — 終わるのを待って、終了コードを RESULT に入れる。時間内に終わらなければ running にして止める
wait_exit() {
  local i
  for i in $(seq 1 $(($1 * 10))); do
    if ! kill -0 "$PID" 2> /dev/null; then
      wait "$PID" 2> /dev/null
      RESULT=$?
      return
    fi
    sleep 0.1
  done
  kill -9 "$PID" 2> /dev/null
  wait "$PID" 2> /dev/null
  RESULT=running
}
# logged パス ステータス — そのパスの行に、そのステータスが書かれた JSON の行があれば yes
logged() {
  node -e '
    const [file, p, status] = process.argv.slice(1);
    const lines = require("node:fs").readFileSync(file, "utf8").split("\n").filter(Boolean);
    const hit = lines.some((l) => {
      try {
        const j = JSON.parse(l);
        return String(j.status) === status && String(j.url ?? j.req?.url ?? "").startsWith(p);
      } catch {
        return false;
      }
    });
    console.log(hit ? "yes" : "no");' "$LOG" "$1" "$2"
}
wait_up() {
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/healthz" && return 0
    kill -0 "$PID" 2> /dev/null || break
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}

echo "--- 起動のときの設定"
start PORT=abc SESSION_SECRET=$SECRET
wait_exit 3
check "1. PORT=abc なら起動せず、終了コード 1。PORT が悪いと分かる" "1 yes" "$RESULT $(grep -q PORT "$LOG" && echo yes || echo no)"
start NODE_ENV=production PORT=$PORT
wait_exit 3
check "2. 本番で SESSION_SECRET が無ければ起動せず、終了コード 1" "1 yes" "$RESULT $(grep -q SESSION_SECRET "$LOG" && echo yes || echo no)"
start NODE_ENV=production PORT=$PORT SESSION_SECRET=short-dev-only
wait_exit 3
check "3. 短い SESSION_SECRET も起動しない。その値をログに書かない" "1 no" "$RESULT $(grep -q short-dev-only "$LOG" && echo yes || echo no)"

echo "--- ログ"
start PORT=$PORT SESSION_SECRET=$SECRET SHUTDOWN_DELAY_MS=700 SHUTDOWN_TIMEOUT_MS=1500
wait_up
check "4. /healthz は 200" 200 "$(code "$URL/healthz")"
check "5. /readyz は 200" 200 "$(code "$URL/readyz")"
check "6. /api/me は 200" 200 "$(code -H "Authorization: Bearer $TOKEN" "$URL/api/me")"
sleep 0.2
check "7. Authorization の値をログに書かない" no "$(grep -q "$TOKEN" "$LOG" && echo yes || echo no)"
check "8. ログは、どの行も JSON" yes "$(node -e '
  const lines = require("node:fs").readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean);
  console.log(lines.length > 0 && lines.every((l) => { try { return typeof JSON.parse(l) === "object"; } catch { return false; } }) ? "yes" : "no");' "$LOG")"
check "9. /api/me のログの行に、返したステータス（200）がある" yes "$(logged /api/me 200)"

echo "--- 止め方"
curl -s -o "$OUT" -w '%{http_code}' --max-time 5 "$URL/slow" > "$OUT.code" &
CURL=$!
sleep 0.3
kill -TERM "$PID"
sleep 0.2
check "10. 止める合図の後、/readyz は 503" 503 "$(code "$URL/readyz")"
wait "$CURL"
check "11. 合図の前に来ていた /slow は、最後まで 200 で返る" 200 "$(cat "$OUT.code")"
rm -f "$OUT.code"
wait_exit 4
check "12. その後、終了コード 0 で終わる" 0 "$RESULT"
check "13. 止める途中で終わった /slow も、ステータスつきでログに書かれる" yes "$(logged /slow 200)"

start PORT=$PORT SESSION_SECRET=$SECRET SHUTDOWN_DELAY_MS=0 SHUTDOWN_TIMEOUT_MS=1000
wait_up
curl -s -o /dev/null --max-time 6 "$URL/hang" &
sleep 0.3
kill -TERM "$PID"
sleep 0.5
wait_exit 3
check "14. 終わらないリクエストがあっても、時間（SHUTDOWN_TIMEOUT_MS）が来たら終了コード 1 で終わる" 1 "$RESULT"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 個の確認が失敗しました"
  exit 1
fi
