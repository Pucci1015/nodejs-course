#!/usr/bin/env bash
# 練習問題8の確認スクリプト。サーバを 127.0.0.1:9215 で起動して確かめ、最後に止める
# 使い方: bash check-views.sh [確かめるファイル]   （既定は buggy-views.mjs）
#         bash check-views.sh ../solutions/views-server.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  SERVER="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SERVER="$(cd "$(dirname "$0")" && pwd)/buggy-views.mjs"
fi
PORT=9215
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

get() { curl -s --max-time 2 "$URL$1"; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$URL$1"; }
header() { curl -s -D - -o /dev/null --max-time 2 "$URL$2" | tr -d '\r' | grep -i "^$1:" | head -1 | cut -d' ' -f2-; }
# ページに、その文字がそのまま入っているか（grep -F は正規表現として読まない）
has() { get "$1" | grep -qF -- "$2" && echo yes || echo no; }
# メモへのリンクの数と、最初・最後のリンク先
count() { get "$1" | grep -o 'href="/notes/[0-9]*"' | wc -l | tr -d ' '; }
first() { get "$1" | grep -o 'href="/notes/[0-9]*"' | head -1; }
lastl() { get "$1" | grep -o 'href="/notes/[0-9]*"' | tail -1; }

start

echo "--- 一覧"
check "1. Content-Type に charset がある" 'text/html; charset=utf-8' "$(header Content-Type /)"
check "2. & は &amp; で送る" yes "$(has / 'Tom &amp; Jerry の作り方')"
check "3. < > は &lt; &gt; で送る" yes "$(has / 'HTML の &lt;p&gt; と &lt;div&gt;')"
check "4. 1ページ目は 10 件" 10 "$(count /)"
check "5. 1ページ目は 1番から" 'href="/notes/1"' "$(first /)"
check "6. 2ページ目は 11番から" 'href="/notes/11"' "$(first '/?page=2')"
check "7. 3ページ目（最後）は 21〜23番" '3 href="/notes/21" href="/notes/23"' "$(count '/?page=3') $(first '/?page=3') $(lastl '/?page=3')"
check "8. ページの番号に 3 がある" yes "$(has / '<a href="/?page=3">3</a>')"
check "9. 範囲の外のページは、最後のページ" 'href="/notes/23"' "$(lastl '/?page=99')"
check "10. 数でないページは、1ページ目" 'href="/notes/1"' "$(first '/?page=abc')"
restart_if_dead

echo "--- 検索"
check "11. 検索の言葉を見出しに出すとき、エスケープする" yes "$(has '/?q=%3Cp%3E' '「&lt;p&gt;」の検索結果（1件）')"
check "12. 検索の言葉を入力欄に戻す" yes "$(has '/?q=%22%E5%BC%95%E7%94%A8%22' 'value="&quot;引用&quot;"')"
check "13. ページのリンクに、検索の言葉を URL 用にエンコードして残す" yes "$(has '/?q=%E3%83%A1%E3%83%A2' 'href="/?q=%E3%83%A1%E3%83%A2&amp;page=2"')"
restart_if_dead

echo "--- 1件のページ"
check "14. 題名を二重にエスケープしない" yes "$(has /notes/1 '<h1>Tom &amp; Jerry の作り方</h1>')"
check "15. メモが無いときは「メモはありません」" yes "$(has /notes/2 'メモはありません')"
check "16. メモが無いとき null と出さない" no "$(has /notes/2 'null')"
check "17. メモの < もエスケープする" yes "$(has /notes/5 '1 &lt; 2 のような比較')"
check "18. https の出典はリンクにする" yes "$(has /notes/1 'href="https://example.com/tom"')"
check "19. http・https・mailto・相対 URL 以外の出典は # にする" yes "$(has /notes/4 'href="#"')"
check "20. script に渡す JSON の < は \\u003c にする" yes "$(has /notes/4 '"title":"\u003c/script\u003e の書き方"')"
check "21. 無いメモは 404" 404 "$(code /notes/999)"
restart_if_dead
check "22. 無いメモの直すページも 404" 404 "$(code /notes/999/edit)"
restart_if_dead

echo "--- 直すページ"
check "23. 入力欄の値を引用符で囲む" yes "$(has /notes/1/edit 'value="Tom &amp; Jerry の作り方"')"
check "24. textarea の中身もエスケープする" yes "$(has /notes/3/edit '<textarea name="memo">&lt;/textarea&gt; というタグの説明</textarea>')"
check "25. その後もサーバが動いている" yes "$(sleep 0.2; alive)"

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
