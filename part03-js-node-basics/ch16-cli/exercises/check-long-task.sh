#!/usr/bin/env bash
# 練習問題5の確認スクリプト
# 使い方: bash check-long-task.sh [確かめるファイル]   （既定は long-task.mjs）
#         bash check-long-task.sh ../solutions/long-task.mjs
set -uo pipefail

if [ -n "${1:-}" ]; then
  TASK="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  TASK="$(cd "$(dirname "$0")" && pwd)/long-task.mjs"
fi
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
now_ms() { node -e 'console.log(Date.now())'; }
tmp_count() { find . -name '*.tmp' | wc -l | tr -d ' '; }

# 1. 最後まで終われば、全部書いて終了コード 0
node "$TASK" out.txt --items 5 --delay 20 2> /dev/null
code=$?
check "1a. 最後まで終われば終了コード 0" "0" "$code"
check "1b. 5件すべて書いてある" "5" "$(wc -l < out.txt | tr -d ' ')"
check "1c. 一時ファイルが残っていない" "0" "$(tmp_count)"

# 2. 途中で SIGINT（Ctrl+C）: 元のファイルはそのまま、終了コード 130
echo "前のデータ" > keep.txt
node "$TASK" keep.txt --items 50 --delay 100 2> err.txt &
pid=$!
sleep 0.6
kill -INT "$pid" 2> /dev/null
wait "$pid"
code=$?
check "2a. SIGINT で終了コード 130" "130" "$code"
check "2b. 元のファイルが変わっていない" "前のデータ" "$(cat keep.txt)"
check "2c. 一時ファイルが残っていない" "0" "$(tmp_count)"
check "2d. 止めたことを標準エラー出力に出す" "1" "$(grep -c '中止' err.txt)"

# 3. SIGTERM（kill の既定）: 終了コード 143、元のファイルはそのまま
node "$TASK" keep.txt --items 50 --delay 100 2> /dev/null &
pid=$!
sleep 0.6
kill -TERM "$pid" 2> /dev/null
wait "$pid"
code=$?
check "3a. SIGTERM で終了コード 143" "143" "$code"
check "3b. 元のファイルが変わっていない" "前のデータ" "$(cat keep.txt)"
check "3c. 一時ファイルが残っていない" "0" "$(tmp_count)"

# 4. 1回目の SIGINT では今の1件（1秒）を待つ。待っている間の2回目は、すぐに終わる
node "$TASK" keep.txt --items 5 --delay 1000 2> /dev/null &
pid=$!
sleep 0.3
kill -INT "$pid" 2> /dev/null
sleep 0.1
start=$(now_ms)
kill -INT "$pid" 2> /dev/null
wait "$pid"
code=$?
elapsed=$(( $(now_ms) - start ))
check "4a. 2回目の SIGINT でも終了コード 130" "130" "$code"
check "4b. 2回目の SIGINT から 0.5 秒以内に終わる" "yes" "$([ "$elapsed" -lt 500 ] && echo yes || echo "no（${elapsed}ms）")"
check "4c. 元のファイルが変わっていない" "前のデータ" "$(cat keep.txt)"

echo
if [ "$failed" -eq 0 ]; then
  echo "すべて成功しました"
else
  echo "$failed 件失敗しました"
  exit 1
fi
