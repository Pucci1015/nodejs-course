#!/usr/bin/env bash
# 練習問題6 用: fetch-all.mjs が要件どおりに動くか確かめる
# 使い方: ./check-fetch-all.sh
#   模範解答を試す: TARGET=../solutions/fetch-all.mjs ./check-fetch-all.sh
# flaky-server.mjs は、このスクリプトが確かめるたびに起動し直す（id ごとの回数を最初からにするため）。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${TARGET:-$DIR/fetch-all.mjs}"
PORT="${PORT:-9121}"
BASE="http://127.0.0.1:$PORT"
TMP="$(mktemp -d)"
failures=0
server_pid=""

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '[OK] %s\n' "$name"
  else
    printf '[NG] %s\n     期待: %s\n     実際: %s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

stop_server() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null
    wait "$server_pid" 2>/dev/null
    server_pid=""
  fi
}

start_server() {
  stop_server
  PORT="$PORT" node "$DIR/flaky-server.mjs" > "$TMP/server.log" 2>&1 &
  server_pid=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -s --max-time 1 -o /dev/null "$BASE/stats" && return 0
    sleep 0.2
  done
  echo "flaky-server.mjs を起動できません（ポート $PORT が使われていないか確かめてください）" >&2
  cat "$TMP/server.log" >&2
  exit 2
}

trap 'stop_server; rm -rf "$TMP"' EXIT

stat_of() { # /stats の JSON から1つの値を取り出す
  curl -s --max-time 2 "$BASE/stats" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[process.argv[1]]))' "$1"
}
now_ms() { node -e 'console.log(Date.now())'; }

# --- 1〜30 をまとめて取る -------------------------------------------------
start_server
t0=$(now_ms)
node "$TARGET" --base "$BASE" 1-30 > "$TMP/out.txt" 2> "$TMP/err.txt"
code=$?
t1=$(now_ms)

check "1. 失敗したものがあるので、終了コードは 1" "1" "$code"
check "2. 30行出力し、指定した id の順に並ぶ" "$(seq 1 30 | tr '\n' ' ')" "$(cut -f1 "$TMP/out.txt" | tr '\n' ' ')"
check "3. 503 が2回続く id 7 も、やり直して成功する" "7	ok	商品 7" "$(sed -n 7p "$TMP/out.txt")"
check "4. 最初は返事が来ない id 5 も、時間切れの後にやり直して成功する" "5	ok	商品 5" "$(sed -n 5p "$TMP/out.txt")"
check "5. 404 の id 13 は not-found" "13	not-found" "$(sed -n 13p "$TMP/out.txt")"
check "6. いつも 503 の id 29 は、4回試して failed" "29	failed	HTTP 503（4回試した）" "$(sed -n 29p "$TMP/out.txt")"
max=$(stat_of maxConcurrent)
check "7. サーバが同時に受けたのは4つまで（--limit の既定）" "yes" "$([[ "$max" -le 4 && "$max" -ge 2 ]] && echo yes || echo "no（最大 $max）")"
elapsed=$((t1 - t0))
check "8. 3秒待たずに時間切れにしている（全体で 4秒未満）" "yes" "$([[ $elapsed -lt 4000 ]] && echo yes || echo "no（${elapsed}ms）")"
check "9. 最後に集計を標準エラー出力に出す" "成功 28 / 見つからない 1 / 失敗 1" "$(tail -n 1 "$TMP/err.txt" | sed 's/（.*//')"

# --- --limit 2 -----------------------------------------------------------
start_server
node "$TARGET" --base "$BASE" --limit 2 1-12 > /dev/null 2>&1
check "10. --limit 2 なら、同時に2つまで" "2" "$(stat_of maxConcurrent)"

# --- 404 はやり直さない --------------------------------------------------
start_server
node "$TARGET" --base "$BASE" 13 > /dev/null 2>&1
check "11. 404 はやり直さない（リクエストは1回だけ）" "1" "$(stat_of requests)"

# --- サーバが無いとき ----------------------------------------------------
stop_server
node "$TARGET" --base "$BASE" --retries 1 1 > "$TMP/out.txt" 2> /dev/null
code=$?
check "12. サーバが無ければ failed になり、終了コードは 1" "1 1	failed" "$code $(cut -f1,2 "$TMP/out.txt")"

# --- Ctrl+C で止める -----------------------------------------------------
start_server
t0=$(now_ms)
node "$TARGET" --base "$BASE" --timeout 10000 1-30 > /dev/null 2> "$TMP/err.txt" &
cli_pid=$!
sleep 0.5
kill -INT "$cli_pid"
wait "$cli_pid"
code=$?
t1=$(now_ms)
check "13. Ctrl+C（SIGINT）で止めると、終了コードは 130" "130" "$code"
elapsed=$((t1 - t0))
check "14. Ctrl+C の後、すぐに終わる（3秒待っているリクエストも切る）" "yes" "$([[ $elapsed -lt 1500 ]] && echo yes || echo "no（${elapsed}ms）")"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
