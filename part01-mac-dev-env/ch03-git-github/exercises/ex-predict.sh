#!/usr/bin/env bash
# 練習問題6 用: README の手順をまとめて実行し、最後に履歴のグラフを表示する
# 先に README の問題で結果を予想してから実行すること。
# 使い方: bash exercises/ex-predict.sh [作成先]   既定: ~/dev/ch03/git-predict
set -euo pipefail

dest="${1:-$HOME/dev/ch03/git-predict}"
if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest（確認してから削除してください）" >&2
  exit 1
fi
mkdir -p "$dest"
cd "$dest"
git init -q -b main
git config user.name "Sample Author"
git config user.email "sample@example.com"
git config commit.gpgsign false

# c メッセージ: そのメッセージ名のファイルを作ってコミットする
c() { echo "$1" > "$1.txt"; git add "$1.txt"; git commit -q -m "$1"; }

c base                                   # (0)
git switch -q -c feature-a               # (1)
c A1
git switch -q main                       # (2)
echo "--- (3) git merge feature-a"
git merge feature-a                      # (3)

git switch -q -c feature-b               # (4)
c B1
git switch -q main                       # (5)
c M1                                     # (6)
echo "--- (7) git merge feature-b"
git merge --no-edit feature-b            # (7)

git switch -q -c feature-c               # (8)
c C1
git switch -q main                       # (9)
echo "--- (10) git merge --no-ff feature-c"
git merge --no-ff --no-edit feature-c    # (10)

echo "--- 結果"
git log --oneline --graph --all --format='%s'
