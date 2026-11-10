#!/usr/bin/env bash
# 練習問題8の確認スクリプト。サーバを 127.0.0.1:9318 で起動して確かめ、最後に止める
# 使い方: bash check-session.sh [確かめるファイル]   （既定は session-app.mjs）
#         bash check-session.sh ../solutions/session-app.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/session-app.mjs"
fi
PORT=9318
URL="http://127.0.0.1:$PORT"
SECRET="check-only-secret-0123456789abcdefghij" # 確認スクリプトのためだけの値（38文字）
LOG="$(mktemp)"
JAR="$(mktemp)"
OLD="$(mktemp)"
PID=""
trap 'kill "$PID" 2> /dev/null; rm -f "$LOG" "$JAR" "$OLD"' EXIT

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

start() { # start [SESSION_SECRET の値]
  env -u NODE_ENV PORT=$PORT SESSION_SECRET="$1" node "$SERVER" >> "$LOG" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$URL/me" && return 0
    kill -0 "$PID" 2> /dev/null || return 1
    sleep 0.1
  done
  return 1
}

JSONH=(-H 'Content-Type: application/json')
# Set-Cookie ヘッダ（無ければ空）
setcookie() { curl -s -D - -o /dev/null --max-time 2 "$@" | tr -d '\r' | grep -i '^set-cookie:' | head -1 | cut -d' ' -f2-; }
# クッキーの入れ物（curl の -c で作るファイル）から、sid の値を取り出す
sid_of() { awk '$6 == "sid" { print $7 }' "$1" | tail -1; }
json() { node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{const d=JSON.parse(s);console.log(JSON.stringify(eval(process.argv[1])))}catch{console.log("JSON ではない")}})' "$1"; }

echo "--- 秘密の鍵"
if start ""; then r=started; else r=refused; fi
check "1. SESSION_SECRET が無ければ起動しない" refused "$r"
kill "$PID" 2> /dev/null; wait "$PID" 2> /dev/null
if start "short"; then r=started; else r=refused; fi
check "2. SESSION_SECRET が 32 文字より短ければ起動しない" refused "$r"
kill "$PID" 2> /dev/null; wait "$PID" 2> /dev/null
start "$SECRET" || { echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1; }

echo "--- Cookie"
check "3. ログインもかごも使っていない客には、Set-Cookie を送らない" "" "$(setcookie "$URL/me")"
c="$(setcookie "${JSONH[@]}" -d '{"item":"りんご"}' "$URL/cart")"
check "4. Cookie の名前は sid（connect.sid にしない）" sid "$(echo "$c" | cut -d= -f1)"
check "5. HttpOnly が付いている" 1 "$(echo "$c" | grep -ci 'httponly')"
check "6. SameSite=Lax が付いている" 1 "$(echo "$c" | grep -ci 'samesite=lax')"

echo "--- ログインで ID を作り直す"
curl -s -c "$JAR" -b "$JAR" "${JSONH[@]}" -d '{"item":"りんご"}' "$URL/cart" > /dev/null
before="$(sid_of "$JAR")"
curl -s -c "$JAR" -b "$JAR" "${JSONH[@]}" -d '{"name":"alice","password":"dev-only-password"}' "$URL/login" > /dev/null
after="$(sid_of "$JAR")"
check "7. ログインの前と後で、セッションの ID が変わる" yes "$([ -n "$before" ] && [ -n "$after" ] && [ "$before" != "$after" ] && echo yes || echo no)"
check "8. ログインの後も、かごの中身は残っている" '["りんご"]' "$(curl -s -b "$JAR" "$URL/me" | json 'd.cart')"
check "9. ログインの後は user が入っている" '"alice"' "$(curl -s -b "$JAR" "$URL/me" | json 'd.user && d.user.name')"
# ログイン前の ID（攻撃者が先に渡しておいた ID のつもり）で、ログインした状態を使えないか
printf '127.0.0.1\tFALSE\t/\tFALSE\t0\tsid\t%s\n' "$before" > "$OLD"
check "10. ログイン前の ID では、ログインした状態にならない" null "$(curl -s -b "$OLD" "$URL/me" | json 'd.user')"
check "11. パスワードが違えば 401" 401 "$(curl -s -o /dev/null -w '%{http_code}' "${JSONH[@]}" -d '{"name":"alice","password":"x"}' "$URL/login")"

echo "--- ログアウト"
cp "$JAR" "$OLD"
lc="$(setcookie -b "$JAR" -c "$JAR" -X POST "$URL/logout")"
check "12. ログアウトで Cookie を消す（sid=; と過去の Expires）" 1 "$(echo "$lc" | grep -c '^sid=;.*Expires=Thu, 01 Jan 1970')"
check "13. ログアウトの前の Cookie を送っても、user も かごも 空" '{"user":null,"cart":[]}' "$(curl -s -b "$OLD" "$URL/me" | json 'd')"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 個の確認が失敗しました"
  exit 1
fi
