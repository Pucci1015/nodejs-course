#!/usr/bin/env bash
# 練習問題2 用: report-server.mjs が、重い計算の最中も /health に素早く応えるか確かめる
# 使い方: bash check-report-server.sh
#   模範解答を試す: TARGET=../solutions/report-server.mjs bash check-report-server.sh
# サーバは、このスクリプトが起動して、最後に止める（先に起動したものは止めておく）。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${TARGET:-$DIR/report-server.mjs}"
PORT="${PORT:-9131}"
BASE="http://127.0.0.1:$PORT"
TMP="$(mktemp -d)"
failures=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '[OK] %s\n' "$name"
  else
    printf '[NG] %s\n     期待: %s\n     実際: %s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

PORT="$PORT" node "$TARGET" > "$TMP/server.log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null; wait "$server_pid" 2>/dev/null; rm -rf "$TMP"' EXIT
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -s --max-time 1 -o /dev/null "$BASE/health" && break
  sleep 0.2
done

check "1. GET /health" '{"ok":true}' "$(curl -s --max-time 2 "$BASE/health")"
check "2. GET /report?n=100" '{"n":100,"primes":25}' "$(curl -s --max-time 5 "$BASE/report?n=100")"
check "3. n が正しくなければ 400" "400" "$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' "$BASE/report?n=abc")"

# 重い計算（環境によって 0.5〜2秒）を始め、その 200ms 後に /health を送る
curl -s --max-time 20 "$BASE/report?n=5000000" > "$TMP/report.txt" &
report_pid=$!
sleep 0.2
health_ms=$(curl -s --max-time 20 -o /dev/null -w '%{time_total}' "$BASE/health" | awk '{ printf "%d", $1 * 1000 }')
check "4. 計算の最中でも /health は 100ms 以内に返る" "yes" "$([[ $health_ms -lt 100 ]] && echo yes || echo "no（${health_ms}ms）")"
wait "$report_pid"
check "5. 重い計算の結果も正しい" '{"n":5000000,"primes":348513}' "$(cat "$TMP/report.txt")"

# 3つ同時に頼むと、3つ目は 503 で断られる（同時に動かすのは2つまで）
pids=""
for i in 1 2 3; do
  curl -s --max-time 20 -o /dev/null -w '%{http_code}\n' "$BASE/report?n=3000000" > "$TMP/code$i.txt" &
  pids="$pids $!"
  sleep 0.05
done
wait $pids
check "6. 同時に3つ頼むと、2つは 200、1つは 503" "200 200 503 " "$(cat "$TMP"/code[123].txt | sort | tr '\n' ' ')"
check "7. 503 には Retry-After を付ける" "yes" "$(
  curl -s --max-time 20 -o /dev/null "$BASE/report?n=3000000" &
  curl -s --max-time 20 -o /dev/null "$BASE/report?n=3000000" &
  sleep 0.1
  curl -s --max-time 2 -D - -o /dev/null "$BASE/report?n=3000000" | grep -qi '^retry-after:' && echo yes || echo no
  wait
)"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
