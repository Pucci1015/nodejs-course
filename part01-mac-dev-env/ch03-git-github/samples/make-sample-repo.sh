#!/usr/bin/env bash
# Git の中身を観察するための小さなリポジトリを作る（第3章 5節・練習問題11）
# 使い方: bash samples/make-sample-repo.sh [作成先]   既定: ~/dev/ch03/git-sample
#
# 作者と日時を固定しているので、誰が作っても同じコミットID（ハッシュ）になる。
set -euo pipefail

dest="${1:-$HOME/dev/ch03/git-sample}"
if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest（確認してから削除してください）" >&2
  exit 1
fi

mkdir -p "$dest"
cd "$dest"
git init -q -b main
git config user.name "Sample Author"
git config user.email "sample@example.com"
git config commit.gpgsign false   # 署名の設定をしていても、同じハッシュになるように

# commit 関数: 日時を固定してコミットする
n=0
commit() {
  n=$((n + 1))
  local date="2026-11-01T10:0${n}:00+09:00"
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -q -m "$1"
}

printf '# タスク管理アプリ\n\nNode.js の練習用です。\n' > README.md
git add README.md
commit "README を追加"

mkdir -p src
printf 'console.log("hello");\n' > src/app.js
git add src/app.js
commit "app.js を追加"

printf '# タスク管理アプリ\n\nNode.js の練習用です。\n\n## 使い方\n\nnode src/app.js\n' > README.md
printf 'console.log("hello");\n' > src/hello.js   # app.js と同じ内容のファイル
git add -A
commit "使い方を追記し、hello.js を追加"

echo "作成しました: $dest"
git log --oneline
