#!/usr/bin/env bash
# 練習問題7 用: API のサーバが CORS の要件を満たしているか、curl で確かめる
# 使い方（~/dev/ch09 で）: bash exercises/check-cors.sh [ポート]   既定: 8401
#   先に別のターミナルで API のサーバ（cors-api-server.mjs）を起動しておく。
#   curl は CORS の確認をしないので、ブラウザの代わりに Origin ヘッダを付けて送り、返ってきたヘッダを調べる。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

PORT="${1:-8401}"
API="http://127.0.0.1:$PORT"
GOOD='http://localhost:8400'
EVIL='http://evil.example'
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

# レスポンスのヘッダを1つ取り出す（無ければ空文字）
header() { grep -i "^$1:" | head -1 | cut -d' ' -f2- | tr -d '\r'; }
headers() { curl -s -D - -o /dev/null "$@"; }
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

if ! curl -s --max-time 2 -o /dev/null "$API/api/tasks"; then
  echo "API に接続できません。先に node cors-api-server.mjs を起動してください" >&2
  exit 2
fi

H="$(headers -H "Origin: $GOOD" "$API/api/tasks")"
check "1. 許可したオリジンの GET に Allow-Origin" "$GOOD" "$(printf '%s' "$H" | header Access-Control-Allow-Origin)"
check "2. Vary に Origin が含まれる" "yes" "$(printf '%s' "$H" | header Vary | grep -qi origin && echo yes || echo no)"
check "3. Allow-Credentials: true" "true" "$(printf '%s' "$H" | header Access-Control-Allow-Credentials)"

H="$(headers -H 'Origin: http://127.0.0.1:8400' "$API/api/tasks")"
check "4. 127.0.0.1:8400 も許可（一覧のもう1つ）" "http://127.0.0.1:8400" "$(printf '%s' "$H" | header Access-Control-Allow-Origin)"

H="$(headers -H "Origin: $EVIL" "$API/api/tasks")"
check "5. 許可していないオリジンには Allow-Origin を付けない" "" "$(printf '%s' "$H" | header Access-Control-Allow-Origin)"
check "6. 許可していないオリジンでも Vary: Origin は付ける" "yes" "$(printf '%s' "$H" | header Vary | grep -qi origin && echo yes || echo no)"
check "7. 許可していないオリジンでも GET の処理自体はする（200）" "200" "$(status -H "Origin: $EVIL" "$API/api/tasks")"

H="$(headers -H 'Origin: http://localhost:8400.evil.example' "$API/api/tasks")"
check "8. 前方一致で許可しない（localhost:8400.evil.example）" "" "$(printf '%s' "$H" | header Access-Control-Allow-Origin)"

PRE=(-X OPTIONS -H "Origin: $GOOD" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type')
check "9. プリフライトは 204" "204" "$(status "${PRE[@]}" "$API/api/tasks")"
H="$(headers "${PRE[@]}" "$API/api/tasks")"
check "10. プリフライトに Allow-Origin" "$GOOD" "$(printf '%s' "$H" | header Access-Control-Allow-Origin)"
check "11. プリフライトの Allow-Methods に POST" "yes" "$(printf '%s' "$H" | header Access-Control-Allow-Methods | grep -q POST && echo yes || echo no)"
check "12. プリフライトの Allow-Headers に Content-Type" "yes" "$(printf '%s' "$H" | header Access-Control-Allow-Headers | grep -qi content-type && echo yes || echo no)"
check "13. プリフライトの Max-Age は 600" "600" "$(printf '%s' "$H" | header Access-Control-Max-Age)"

check "14. DELETE のプリフライトも 204" "204" \
  "$(status -X OPTIONS -H "Origin: $GOOD" -H 'Access-Control-Request-Method: DELETE' "$API/api/tasks/1")"
check "15. 許可していないメソッド（PATCH）のプリフライトは 403" "403" \
  "$(status -X OPTIONS -H "Origin: $GOOD" -H 'Access-Control-Request-Method: PATCH' "$API/api/tasks/1")"
check "16. 許可していないヘッダ（X-Admin）のプリフライトは 403" "403" \
  "$(status -X OPTIONS -H "Origin: $GOOD" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type, x-admin' "$API/api/tasks")"
check "17. 許可していないオリジンのプリフライトは 403" "403" \
  "$(status -X OPTIONS -H "Origin: $EVIL" -H 'Access-Control-Request-Method: POST' "$API/api/tasks")"

check "18. POST 自体も動く（201）" "201" \
  "$(status -X POST -H "Origin: $GOOD" -H 'Content-Type: application/json' -d '{"title":"テスト"}' "$API/api/tasks")"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
