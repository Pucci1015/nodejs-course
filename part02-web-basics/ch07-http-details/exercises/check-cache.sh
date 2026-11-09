#!/usr/bin/env bash
# 練習問題6・10 用: 静的ファイルのサーバが、ETag などのキャッシュの決まりを守っているか確かめる
# 使い方: bash check-cache.sh サーバのファイル
#   例: bash check-cache.sh cached-static-server.mjs
# サーバは「node サーバ フォルダ ポート」で起動できること（static-server.mjs と同じ）。
# public/ を一時フォルダにコピーし、そこを配信するサーバを 8119番で起動して試す（public/ 自体は変更しない）。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

SERVER="${1:?使い方: bash check-cache.sh サーバのファイル}"
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8119
BASE="http://127.0.0.1:$PORT"
WORK="$(mktemp -d)"
failures=0

cp -R "$DIR/public/." "$WORK/"
node "$SERVER" "$WORK" "$PORT" > "$WORK.log" 2>&1 &
SERVER_PID=$!
# 終わるとき（途中で失敗しても）に、サーバを止めて一時フォルダを消す
trap 'kill "$SERVER_PID" 2> /dev/null; rm -rf "$WORK" "$WORK.log"' EXIT

for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null "$BASE/" && break
  sleep 0.3
done

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '[OK] %s\n' "$name"
  else
    printf '[NG] %s\n     期待: %s\n     実際: %s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

# ヘッダを1つ取り出す（大文字・小文字を区別せず、末尾の \r を取る）
header() { grep -i "^$1:" | head -1 | cut -d' ' -f2- | tr -d '\r'; }
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

HEAD_OUT="$(curl -s -D - -o /dev/null "$BASE/")"
ETAG="$(printf '%s' "$HEAD_OUT" | header ETag)"
LAST_MODIFIED="$(printf '%s' "$HEAD_OUT" | header Last-Modified)"

check "1. ETag が \"...\" の形で付いている" "yes" "$([[ "$ETAG" =~ ^\"[^\"]+\"$ ]] && echo yes || echo "no（$ETAG）")"
check "2. Last-Modified が付いている" "yes" "$([[ -n "$LAST_MODIFIED" ]] && echo yes || echo no)"
check "3. HTML の Cache-Control は no-cache" "no-cache" "$(printf '%s' "$HEAD_OUT" | header Cache-Control)"
check "4. CSS の Cache-Control は max-age=60" "max-age=60" "$(curl -s -D - -o /dev/null "$BASE/style.css" | header Cache-Control)"
check "5. 同じ ETag で 304" "304" "$(status -H "If-None-Match: $ETAG" "$BASE/")"
check "6. 304 にはボディが無い" "0" "$(curl -s -H "If-None-Match: $ETAG" "$BASE/" | wc -c | tr -d ' ')"
check "7. 304 にも ETag が付いている" "$ETAG" "$(curl -s -D - -o /dev/null -H "If-None-Match: $ETAG" "$BASE/" | header ETag)"
check "8. W/ 付き（弱い比較）でも 304" "304" "$(status -H "If-None-Match: W/$ETAG" "$BASE/")"
check "9. 複数並んだうちの1つが合えば 304" "304" "$(status -H "If-None-Match: \"abc\", $ETAG" "$BASE/")"
check "10. * なら 304" "304" "$(status -H 'If-None-Match: *' "$BASE/")"
check "11. 違う ETag なら 200" "200" "$(status -H 'If-None-Match: "abc"' "$BASE/")"
check "12. If-Modified-Since が Last-Modified と同じなら 304" "304" "$(status -H "If-Modified-Since: $LAST_MODIFIED" "$BASE/")"
check "13. If-None-Match があれば If-Modified-Since は見ない" "200" \
  "$(status -H 'If-None-Match: "abc"' -H "If-Modified-Since: $LAST_MODIFIED" "$BASE/")"
check "14. HEAD でも同じ ETag" "$ETAG" "$(curl -s -I "$BASE/" | header ETag)"
check "15. HEAD でも 304" "304" "$(status -I -H "If-None-Match: $ETAG" "$BASE/")"

# ファイルを書き換えると、ETag が変わり、古い ETag では 200 になる
sleep 1
printf '<!-- 書き換えました -->\n' >> "$WORK/index.html"
NEW_ETAG="$(curl -s -D - -o /dev/null "$BASE/" | header ETag)"
check "16. 中身が変わると ETag が変わる" "yes" "$([[ -n "$NEW_ETAG" && "$NEW_ETAG" != "$ETAG" ]] && echo yes || echo "no（$NEW_ETAG）")"
check "17. 古い ETag では 200" "200" "$(status -H "If-None-Match: $ETAG" "$BASE/")"
check "18. 古い Last-Modified では 200" "200" "$(status -H "If-Modified-Since: $LAST_MODIFIED" "$BASE/")"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
