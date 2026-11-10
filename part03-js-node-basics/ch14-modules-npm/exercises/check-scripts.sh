#!/usr/bin/env bash
# 練習問題3 用: scripts-practice/package.json の scripts が要件どおりか確かめる
# 使い方（exercises フォルダで）: bash check-scripts.sh [フォルダ]   既定: このスクリプトの隣の scripts-practice
#   模範解答を試す: bash check-scripts.sh ../solutions/scripts-practice
# npm run はインターネットにつながなくても動く。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$(cd "${1:-$DIR/scripts-practice}" && pwd)"
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

cd "$TARGET" || exit 2

# --silent を付けると、npm 自身の「> scripts-practice@1.0.0 start」のような表示が出ない
check "1. npm start で、こんにちは、world" "こんにちは、world" "$(npm start --silent 2>&1)"
check "2. npm run greet で、こんにちは、alice" "こんにちは、alice" "$(npm run greet --silent 2>&1)"
out=$(npm test 2>&1)
code=$?
check "3. npm test が成功する（終了コード 0）" "0" "$code"
check "4. npm test で、テストが2つ通る" "ℹ pass 2" "$(printf '%s\n' "$out" | grep -E '^(ℹ|#) pass' | sed 's/^# /ℹ /')"
check "5. npm test の前に「テストを始めます」と表示される（pretest）" "あり" "$(printf '%s\n' "$out" | grep -q '^テストを始めます$' && echo あり || echo なし)"
out=$(npm run check 2>&1)
code=$?
check "6. npm run check が成功する（テストの後に start）" "0" "$code"
check "7. npm run check の最後の行は、こんにちは、world" "こんにちは、world" "$(printf '%s\n' "$out" | tail -1)"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
