#!/usr/bin/env bash
# 練習問題8の確認スクリプト
# 使い方: bash check-grep.sh [確かめるファイル]   （既定は buggy-grep.mjs）
#         bash check-grep.sh ../solutions/grep.mjs
set -uo pipefail

GREP="$(cd "$(dirname "$0")" && pwd)/$(basename "${1:-buggy-grep.mjs}")"
[ -n "${1:-}" ] && GREP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK" || exit 1

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

printf 'apple\nbanana\nApple pie\n' > fruits.txt
ESC=$(printf '\033')

# 1. 見つかった行を出す
check "1. 見つかった行を出す" "apple|Apple pie" "$(node "$GREP" -i --color=never apple fruits.txt | paste -sd '|' -)"

# 2. -c で数を出す
check "2. -c で数を出す" "2" "$(node "$GREP" -c -i apple fruits.txt)"

# 3. 見つからなければ終了コード 1
node "$GREP" zzz fruits.txt > /dev/null 2>&1
check "3. 見つからなければ終了コード 1" "1" "$?"

# 4. 無いファイル: 終了コード 2、メッセージは標準エラー出力、標準出力には結果だけ
node "$GREP" --color=never an nai.txt fruits.txt > out.txt 2> err.txt
code=$?
check "4a. 無いファイルがあれば終了コード 2" "2" "$code"
check "4b. 標準出力には結果だけ" "fruits.txt:banana" "$(cat out.txt)"
check "4c. エラーは標準エラー出力に出す" "1" "$(grep -c 'nai.txt' err.txt)"

# 5. 正しくない正規表現: 終了コード 2、標準出力は空
node "$GREP" '(' fruits.txt > out.txt 2> /dev/null
code=$?
check "5. 正しくない正規表現は終了コード 2、標準出力は空" "2:0" "$code:$(wc -c < out.txt | tr -d ' ')"

# 6. パイプやファイルに出すときは色を付けない
node "$GREP" an fruits.txt > out.txt
check "6. パイプやファイルには色を付けない（--color=auto）" "0" "$(grep -c "$ESC" out.txt)"

# 7. --color=always なら色を付ける
check "7. --color=always なら色を付ける" "1" "$(node "$GREP" --color=always an fruits.txt | grep -c "$ESC")"

# 8. FORCE_COLOR=1 なら、--color=auto でも色を付ける
check "8. FORCE_COLOR=1 なら色を付ける" "1" "$(FORCE_COLOR=1 node "$GREP" an fruits.txt 2> /dev/null | grep -c "$ESC")"

# 9. たくさん出力しても、パイプで途中で切れない
node -e 'for (let i = 0; i < 200000; i++) console.log("match " + i)' > big.txt
check "9. 20万行をパイプに出しても全部届く" "200000" "$(node "$GREP" match big.txt | wc -l | tr -d ' ')"

# 10. | head で途中で閉じられても、エラーを出さずに終わる
node "$GREP" match big.txt 2> err.txt | head -1 > /dev/null
codes="${PIPESTATUS[0]}"
check "10. | head で閉じられても、終了コード 0 でエラーを出さない" "0:0" "$codes:$(wc -c < err.txt | tr -d ' ')"

# 11. 標準入力から読む。チャンクの境目で、行も文字も壊さない
node -e 'let s = ""; for (let i = 0; i < 100000; i++) s += "あいうえお" + i + "\n"; process.stdout.write(s)' > jp.txt
check "11a. 標準入力の 10万行を全部数える" "100000" "$(cat jp.txt | node "$GREP" -c 'お[0-9]+$')"
check "11b. 文字化け（U+FFFD）が無い" "0" "$(cat jp.txt | node "$GREP" -c $'�')"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 件失敗しました"
  exit 1
fi
