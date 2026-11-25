#!/usr/bin/env bash
# GitHub を使わずに、push / fetch / pull を練習する環境を作る（第3章 10節・練習問題10）
# 使い方: bash samples/make-remote-practice.sh [作成先]   既定: ~/dev/ch03/git-remote-practice
#
# 作られるもの:
#   origin.git/  … GitHub の代わりになる「ベアリポジトリ」（作業ツリーを持たない、共有専用のリポジトリ）
#   alice/       … Alice さんの手元のリポジトリ（origin.git を clone したもの）
#   bob/         … Bob さんの手元のリポジトリ（同上）
set -euo pipefail

dest="${1:-$HOME/dev/ch03/git-remote-practice}"
if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest（確認してから削除してください）" >&2
  exit 1
fi

mkdir -p "$dest"
cd "$dest"
git init -q --bare -b main origin.git

git clone -q origin.git alice 2> /dev/null
cd alice
git config user.name "Alice"
git config user.email "alice@example.com"
printf '# 共有メモ\n\n- 買い物: 牛乳\n' > memo.md
git add memo.md
git commit -q -m "共有メモを作成"
git push -q -u origin main
cd ..

git clone -q origin.git bob
cd bob
git config user.name "Bob"
git config user.email "bob@example.com"
cd ..

echo "作成しました: $dest"
echo "  リモート: $dest/origin.git"
echo "  Alice:   $dest/alice"
echo "  Bob:     $dest/bob"
