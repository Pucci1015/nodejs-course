#!/usr/bin/env bash
# 練習問題4の確認スクリプト。サーバを 127.0.0.1:9205 で起動して確かめ、最後に止める
# 使い方: bash check-contact.sh [確かめるファイル]   （既定は buggy-contact.mjs）
#         bash check-contact.sh ../solutions/contact.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-contact.mjs"
fi
PORT=9205
URL="http://127.0.0.1:$PORT"
LOG="$(mktemp)"
TMP="$(mktemp -d)"
PID=""
trap 'kill "$PID" 2> /dev/null; rm -rf "$LOG" "$TMP"' EXIT

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
    curl -s -o /dev/null --max-time 1 "$URL/" && return
    sleep 0.1
  done
  echo "サーバが起動しませんでした:"; cat "$LOG"; exit 1
}
alive() { kill -0 "$PID" 2> /dev/null && echo yes || echo no; }
# サーバが落ちていたら起動し直す（1つのバグで、後の確認がすべて失敗しないように）
restart_if_dead() { [ "$(alive)" = yes ] || { wait "$PID" 2> /dev/null; start; }; }

FORM='Content-Type: application/x-www-form-urlencoded'
JSON='Content-Type: application/json'
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$@"; }
header() { curl -s -D - -o /dev/null --max-time 2 "${@:2}" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
# 最後に保存された伝言の、あるキーの値（JSON）
last() { curl -s --max-time 2 "$URL/api/messages" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);console.log(JSON.stringify(a.at(-1)?.['$1']))})"; }

start

echo "--- フォーム"
check "1. 正しいフォームは 303" 303 "$(code -H "$FORM" -d 'name=ryota&email=a%40example.com&message=hello' "$URL/contact")"
restart_if_dead
check "2. その Location は /thanks" /thanks "$(header Location -H "$FORM" -d 'name=ryota&email=a%40example.com&message=hello' "$URL/contact")"
restart_if_dead
code -H "$FORM" -d 'name=ryota&email=a%40example.com&message=1+%2B+1+%3D+2&topics=node&topics=flask' "$URL/contact" > /dev/null
restart_if_dead
check "3. + は空白、%2B は +、%3D は =" '"1 + 1 = 2"' "$(last message)"
check "4. 同じ名前のチェックボックスは全部" '["node","flask"]' "$(last topics)"
check "5. 名前が無いフォームは 422" 422 "$(code -H "$FORM" -d 'email=a%40example.com&message=hello' "$URL/contact")"
check "6. その後もサーバが動いている" yes "$(sleep 0.2; alive)"
restart_if_dead
check "7. メールの形が違えば 422" 422 "$(code -H "$FORM" -d 'name=ryota&email=bad&message=hello' "$URL/contact")"
restart_if_dead
html=$(curl -s --max-time 2 -H "$FORM" --data-urlencode 'name=<b>太字</b>' -d 'email=bad&message=hello' "$URL/contact")
check "8. 入力をもう一度表示するとき、エスケープしている" no "$(printf '%s' "$html" | grep -q '<b>太字' && echo yes || echo no)"
restart_if_dead

# JSON の中の「あいう」が、チャンクの境目で切れるように、2回に分けて送る客
node -e "
  const net = require('node:net');
  const text = Buffer.from(JSON.stringify({ name: 'ryota', email: 'a@example.com', message: 'あいう' }));
  const cut = text.indexOf(Buffer.from('い')) + 1; // 「い」の 1 バイト目と 2 バイト目の間
  const sock = net.connect($PORT, '127.0.0.1', () => {
    sock.write('POST /api/messages HTTP/1.1\\r\\nHost: x\\r\\nContent-Type: application/json\\r\\nContent-Length: ' + text.length + '\\r\\nConnection: close\\r\\n\\r\\n');
    sock.write(text.subarray(0, cut));
    setTimeout(() => sock.end(text.subarray(cut)), 100);
  });
  sock.resume();
" 2> /dev/null
sleep 0.3
restart_if_dead
check "9. チャンクの境目で切れた文字も、正しく読む" '"あいう"' "$(last message)"
head -c 20000 /dev/zero | tr '\0' 'a' > "$TMP/big.txt"
check "10. 大きすぎるフォーム（20KB）は 413" 413 "$(code -H "$FORM" -H 'Expect:' --data-binary "@$TMP/big.txt" "$URL/contact")"
restart_if_dead

echo "--- JSON の API"
check "11. 正しい JSON は 201" 201 "$(code -H "$JSON" -d '{"name":"ryota","email":"a@example.com","message":"hi"}' "$URL/api/messages")"
restart_if_dead
code -H "$JSON" -d '{"name":"ryota","email":"a@example.com","message":"hi","id":999,"isAdmin":true}' "$URL/api/messages" > /dev/null
restart_if_dead
check "12. id は客に決めさせない" no "$([ "$(last id)" = 999 ] && echo yes || echo no)"
check "13. 決めていないキー（isAdmin）は保存しない" undefined "$(last isAdmin)"
check "14. Content-Type が text/plain なら 415" 415 "$(code -H 'Content-Type: text/plain' -d '{"name":"x"}' "$URL/api/messages")"
restart_if_dead
check "15. 読めない JSON は 400" 400 "$(code -H "$JSON" -d '{"name":' "$URL/api/messages")"
check "16. その後もサーバが動いている" yes "$(sleep 0.2; alive)"
restart_if_dead
check "17. 名前が数（文字列でない）なら 422" 422 "$(code -H "$JSON" -d '{"name":1,"email":"a@example.com","message":"hi"}' "$URL/api/messages")"
check "18. その後もサーバが動いている" yes "$(sleep 0.2; alive)"

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
