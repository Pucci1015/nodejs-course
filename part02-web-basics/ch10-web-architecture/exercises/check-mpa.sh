#!/usr/bin/env bash
# 練習問題6 用: MPA 版のタスク管理が、PRG・安全なメソッド・エスケープ・404 の要件を満たすかを確かめる
# 使い方（~/dev/ch10 で）: bash exercises/check-mpa.sh [サーバのファイル]   既定: fixed-mpa.mjs
#   指定したファイルを 8519 番ポートで起動して確かめ、終わったら止める。
#   ファイルの場所は、コマンドを打ったフォルダから見た場所で指定する。
#   （8519 番を使っている他のプログラムがあれば、先に止めておく）
set -uo pipefail

FILE="${1:-fixed-mpa.mjs}"
PORT=8519
BASE="http://127.0.0.1:$PORT"
PID=""
FAILED=0
LOG="$(mktemp)"

if [ ! -f "$FILE" ]; then
  echo "$FILE がありません。~/dev/ch10 で bad-mpa.mjs をコピーして作ってください: cp exercises/bad-mpa.mjs fixed-mpa.mjs" >&2
  exit 2
fi

start_server() {
  stop_server
  node "$FILE" "$PORT" >>"$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$BASE/" && return 0
    sleep 0.1
  done
  echo "サーバが起動しませんでした。ログ:" >&2
  cat "$LOG" >&2
  exit 2
}

stop_server() {
  if [ -n "$PID" ]; then
    kill "$PID" 2>/dev/null
    wait "$PID" 2>/dev/null
    PID=""
  fi
}
trap 'stop_server; rm -f "$LOG"' EXIT

ok() { echo "[OK] $1"; }
ng() {
  echo "[NG] $1"
  echo "     $2"
  FAILED=$((FAILED + 1))
}

# ステータスコードだけを取る（接続できなければ 000）
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

alive() { [ "$(status "$BASE/")" = "200" ]; }

# 確認ごとにサーバを起動し直す（前の確認でサーバが止まったり、データが変わったりしても影響しないように）
start_server

# 1. 追加は PRG（303 で一覧へ）
headers="$(curl -s -o /dev/null -D - --data-urlencode 'title=パンを買う' "$BASE/tasks" | tr -d '\r')"
if echo "$headers" | grep -q '^HTTP/1.1 303' && echo "$headers" | grep -qi '^location: /$'; then
  ok "1. 追加の POST に 303 と Location: / を返す"
else
  ng "1. 追加の POST に 303 と Location: / を返す" "実際: $(echo "$headers" | head -1)"
fi

# 2. 追加したタスクが一覧に表示される
if curl -s "$BASE/" | grep -q 'パンを買う'; then
  ok "2. 追加したタスクが一覧に表示される"
else
  ng "2. 追加したタスクが一覧に表示される" "GET / に「パンを買う」がない"
fi

start_server
# 3. 空のタイトルは 422 でエラーを表示
body="$(curl -s -w '\n%{http_code}' -d 'title=' "$BASE/tasks")"
if [ "$(echo "$body" | tail -1)" = "422" ] && echo "$body" | grep -q 'タイトルを入力してください'; then
  ok "3. 空のタイトルには 422 とエラーの文を返す"
else
  ng "3. 空のタイトルには 422 とエラーの文を返す" "実際のステータス: $(echo "$body" | tail -1)"
fi

start_server
# 4. 削除のボタンは POST のフォーム
if curl -s "$BASE/" | grep -q 'method="post" action="/tasks/1/delete"'; then
  ok "4. 削除は <form method=\"post\" action=\"/tasks/1/delete\"> で行う"
else
  ng "4. 削除は <form method=\"post\" action=\"/tasks/1/delete\"> で行う" "一覧の HTML に、削除の POST のフォームがない"
fi

start_server
# 5. GET では削除されない
s="$(status "$BASE/tasks/1/delete")"
if [ "$(status "$BASE/tasks/1")" = "200" ] && [ "$s" = "405" ]; then
  ok "5. GET /tasks/1/delete は 405 で、タスクは消えない"
else
  ng "5. GET /tasks/1/delete は 405 で、タスクは消えない" "GET /tasks/1/delete のステータス: $s、その後の GET /tasks/1: $(status "$BASE/tasks/1")"
fi

start_server
# 6. POST で削除できる
headers="$(curl -s -o /dev/null -D - -X POST "$BASE/tasks/1/delete" | tr -d '\r')"
if echo "$headers" | grep -q '^HTTP/1.1 303' && [ "$(status "$BASE/tasks/1")" = "404" ]; then
  ok "6. POST /tasks/1/delete は 303 で、その後 /tasks/1 は 404"
else
  ng "6. POST /tasks/1/delete は 303 で、その後 /tasks/1 は 404" "POST の結果: $(echo "$headers" | head -1)、その後の GET /tasks/1: $(status "$BASE/tasks/1")"
fi

start_server
# 7. 本文のエスケープ
curl -s -o /dev/null --data-urlencode 'title=<b>太字</b>' "$BASE/tasks"
page="$(curl -s "$BASE/")"
if echo "$page" | grep -q '&lt;b&gt;太字&lt;/b&gt;' && ! echo "$page" | grep -q '<b>太字'; then
  ok "7. タイトルの < > をエスケープして表示する"
else
  ng "7. タイトルの < > をエスケープして表示する" "一覧の HTML に <b>太字</b> がそのまま入っている"
fi

start_server
# 8. 属性の値のエスケープ（101文字で 422 にして、入力した値をフォームに戻させる）
long="\"><b>x$(printf 'a%.0s' $(seq 1 100))"
page="$(curl -s --data-urlencode "title=$long" "$BASE/tasks")"
if echo "$page" | grep -q 'value="&quot;&gt;&lt;b&gt;x' && ! echo "$page" | grep -q '<b>x'; then
  ok "8. フォームに戻す値の \" をエスケープする（属性から抜け出せない）"
else
  ng "8. フォームに戻す値の \" をエスケープする（属性から抜け出せない）" "input の value に \"><b> がそのまま入っている"
fi

start_server
# 9. GET /tasks には 405
s="$(status "$BASE/tasks")"
if [ "$s" = "405" ]; then
  ok "9. GET /tasks には 405"
else
  ng "9. GET /tasks には 405" "実際: $s"
fi

# 10〜12. 存在しないタスクでは 404 を返し、サーバは止まらない
check_missing() {
  local label="$1"; shift
  start_server
  local s
  s="$(status "$@")"
  sleep 0.2
  if [ "$s" = "404" ] && alive; then
    ok "$label"
  else
    if alive; then
      ng "$label" "実際のステータス: $s"
    else
      ng "$label" "実際のステータス: $s。その後、サーバが止まった（ログ: $(grep 'Error' "$LOG" | tail -1)）"
    fi
  fi
}
check_missing "10. GET /tasks/999 は 404（サーバは止まらない）" "$BASE/tasks/999"
check_missing "11. POST /tasks/999/toggle は 404（サーバは止まらない）" -X POST "$BASE/tasks/999/toggle"
check_missing "12. POST /tasks/999/delete は 404（サーバは止まらない）" -X POST "$BASE/tasks/999/delete"

echo
if [ "$FAILED" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$FAILED 個の確認が失敗しました"
  exit 1
fi
