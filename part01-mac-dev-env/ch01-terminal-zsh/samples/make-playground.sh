#!/usr/bin/env bash
# 練習用のフォルダ一式を作るスクリプト（第1章で使用）
# 使い方: bash make-playground.sh [作成先]   既定: ~/dev/ch01/playground
set -euo pipefail

dest="${1:-$HOME/dev/ch01/playground}"

if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest" >&2
  echo "作り直す場合は、中身を確認してから削除してください: rm -ri \"$dest\"" >&2
  exit 1
fi

mkdir -p "$dest"/{docs,photos,logs/old,"My Documents",src/{routes,models}}

# 拡張子がばらばらのファイル
touch "$dest"/{memo,todo,"meeting notes"}.txt
touch "$dest"/docs/{report.pdf,slides.key,README.md}
touch "$dest"/photos/{IMG_0001,IMG_0002,IMG_0103}.jpg "$dest"/photos/screenshot.png
touch "$dest"/src/routes/{index,tasks}.js "$dest"/src/models/task.js "$dest/src/app.js"
touch "$dest/My Documents/履歴書.docx" "$dest/My Documents/写真 一覧.txt"
touch "$dest/.hidden-config"

# 同じ行を n 回出力する関数
repeat_line() {
  local text="$1" n="$2" j
  for ((j = 0; j < n; j++)); do
    echo "$text"
  done
}

# ログファイル（中身あり。サイズに差をつける）
for i in 1 2 3; do
  repeat_line "log line from day $i" $((i * 200)) > "$dest/logs/app-$i.log"
done
repeat_line "old log" 50 > "$dest/logs/old/app-0.log"
echo "error: something failed" > "$dest/logs/error.log"

# 拡張子のないファイルと、名前にスペースを含むファイル
echo "no extension" > "$dest/LICENSE"
echo "draft" > "$dest/draft final v2.txt"

echo "作成しました: $dest"
echo "中身を見るには: ls -laR \"$dest\""
