#!/usr/bin/env bash
# 練習問題5の確認スクリプト。サーバを 127.0.0.1:9178 で何度か起動し、SIGTERM を送って止まり方を確かめる
# 使い方: bash check-shutdown.sh [確かめるファイル]   （既定は graceful-server.mjs）
#         bash check-shutdown.sh ../solutions/graceful-server.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/graceful-server.mjs"
fi
PORT=9178
URL="http://127.0.0.1:$PORT"
TMP="$(mktemp -d)"
PID=""; CLIENT=""
trap 'kill -9 $PID $CLIENT 2> /dev/null; rm -rf "$TMP"' EXIT

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
# date +%s%N は Mac では使えないので、時刻（ミリ秒）は node に聞く
now_ms() { node -e 'console.log(Date.now())'; }

start() {
  PORT=$PORT SHUTDOWN_TIMEOUT_MS=1000 node "$SERVER" > "$TMP/server.log" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$TMP/server.log"; exit 1
}
# 最大 $1 秒、サーバが終わるのを待つ。終わったら終了コードを、終わらなければ timeout を EXIT_CODE に入れる
wait_exit() {
  local i
  for i in $(seq 1 $(($1 * 10))); do
    if ! kill -0 "$PID" 2> /dev/null; then
      wait "$PID" 2> /dev/null; EXIT_CODE=$?; return
    fi
    sleep 0.1
  done
  EXIT_CODE=timeout
  kill -9 "$PID" 2> /dev/null; wait "$PID" 2> /dev/null
}
within() { [ "$1" -le "$2" ] && echo yes || echo "no（${1}ms）"; } # within 実際ms 上限ms

echo "--- 1. 処理中のリクエストがあるときに SIGTERM"
start
curl -s -o "$TMP/slow.txt" -w '%{http_code}' "$URL/slow" > "$TMP/slow.code" &
SLOW=$!
sleep 0.3
kill -TERM "$PID" 2> /dev/null
sleep 0.2
check "止め始めた後の新しい接続は断られる" 000 "$(curl -s -o /dev/null -w '%{http_code}' "$URL/" 2> /dev/null)"
wait "$SLOW"
check "処理中の /slow は最後まで返る（200）" 200 "$(cat "$TMP/slow.code")"
check "/slow の本文" "/slow done" "$(cat "$TMP/slow.txt" 2> /dev/null)"
wait_exit 3
check "/slow を返した後、終了コード 0 で終わる" 0 "$EXIT_CODE"

echo "--- 2. 何もしていない keep-alive の接続があるときに SIGTERM"
start
# 1回リクエストして、接続を開いたまま 10 秒待つ客（ブラウザのまね）
node -e "
  const http = require('node:http');
  const agent = new http.Agent({ keepAlive: true });
  http.get({ host: '127.0.0.1', port: $PORT, path: '/', agent }, (r) => { r.resume(); r.on('end', () => console.log('got')); })
    .on('error', (e) => console.log('エラー ' + e.code));
  setTimeout(() => {}, 10000);
" > "$TMP/client.log" 2>&1 &
CLIENT=$!
for _ in $(seq 1 30); do grep -q got "$TMP/client.log" && break; sleep 0.1; done
t0=$(now_ms)
kill -TERM "$PID" 2> /dev/null
wait_exit 8
elapsed=$(( $(now_ms) - t0 ))
check "終了コード 0 で終わる" 0 "$EXIT_CODE"
check "keep-alive の接続を待たずに、すぐ（1 秒以内に）終わる" yes "$(within "$elapsed" 1000)"
kill "$CLIENT" 2> /dev/null; wait "$CLIENT" 2> /dev/null; CLIENT=""

echo "--- 3. keep-alive の客の /slow を処理している途中に SIGTERM"
start
node -e "
  const http = require('node:http');
  const agent = new http.Agent({ keepAlive: true });
  http.get({ host: '127.0.0.1', port: $PORT, path: '/slow', agent }, (r) => { r.resume(); r.on('end', () => console.log(r.statusCode)); })
    .on('error', (e) => console.log('エラー ' + e.code));
  setTimeout(() => {}, 10000);
" > "$TMP/client.log" 2>&1 &
CLIENT=$!
sleep 0.3
t0=$(now_ms)
kill -TERM "$PID" 2> /dev/null
wait_exit 8
elapsed=$(( $(now_ms) - t0 ))
check "客は /slow の返事を受け取れる" 200 "$(cat "$TMP/client.log")"
check "終了コード 0 で終わる" 0 "$EXIT_CODE"
check "返した後、接続が開いたままになるのを待たずに終わる（2 秒以内）" yes "$(within "$elapsed" 2000)"
kill "$CLIENT" 2> /dev/null; wait "$CLIENT" 2> /dev/null; CLIENT=""

echo "--- 4. 終わらないリクエストがあるときに SIGTERM（SHUTDOWN_TIMEOUT_MS=1000）"
start
curl -s -o /dev/null -w '%{http_code}' "$URL/hang" > "$TMP/hang.code" 2> /dev/null &
HANG=$!
sleep 0.3
t0=$(now_ms)
kill -TERM "$PID" 2> /dev/null
wait_exit 5
elapsed=$(( $(now_ms) - t0 ))
check "待ちきれずに、終了コード 1 で終わる" 1 "$EXIT_CODE"
check "およそ 1 秒で（2 秒以内に）終わる" yes "$(within "$elapsed" 2000)"
check "待ちすぎない（0.8 秒は待つ）" yes "$( [ "$elapsed" -ge 800 ] && echo yes || echo "no（${elapsed}ms）")"
wait "$HANG"
check "/hang の客は、返事をもらえずに切られる" 000 "$(cat "$TMP/hang.code")"

echo "--- 5. 止めている途中に、もう一度 SIGTERM"
start
curl -s -o /dev/null "$URL/hang" 2> /dev/null &
HANG=$!
sleep 0.3
kill -TERM "$PID" 2> /dev/null
sleep 0.2
t0=$(now_ms)
kill -TERM "$PID" 2> /dev/null
wait_exit 3
elapsed=$(( $(now_ms) - t0 ))
check "2回目は、終了コード 1 ですぐに終わる" 1 "$EXIT_CODE"
check "待たない（0.5 秒以内）" yes "$(within "$elapsed" 500)"
wait "$HANG" 2> /dev/null

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 件失敗しました"
  exit 1
fi
