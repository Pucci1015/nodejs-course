#!/usr/bin/env bash
# 練習問題4 用: buggy-server.mjs（または自分で直したサーバ）が正しく動くか確かめる
# 使い方: bash check-server.sh [ポート]   既定: 8090
#   先に別のターミナルでサーバを起動しておく。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

PORT="${1:-8090}"
BASE="http://127.0.0.1:$PORT"
DIR="$(cd "$(dirname "$0")" && pwd)"
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

if ! curl -s --max-time 2 -o /dev/null "$BASE/"; then
  echo "サーバに接続できません。先に node buggy-server.mjs $PORT を起動してください" >&2
  exit 2
fi

check "1. GET /hello が日本語を最後まで返す" \
  "こんにちは" "$(curl -s --max-time 2 "$BASE/hello")"

check "2. POST /echo（curl から）" \
  "受け取りました: name=ねこ" "$(curl -s --max-time 2 -d 'name=ねこ' "$BASE/echo")"

check "3. POST /echo（ヘッダ名が小文字）" \
  "受け取りました: name=ねこ" "$(node "$DIR/tricky-client.mjs" lowercase "$PORT")"

check "4. POST /echo（リクエストが分かれて届く）" \
  "受け取りました: name=ねこ" "$(node "$DIR/tricky-client.mjs" slow "$PORT")"

check "5. 存在しないパスは 404" \
  "404" "$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' "$BASE/nothing")"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
