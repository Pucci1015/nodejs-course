#!/usr/bin/env bash
# 練習問題5 用: 「やってしまった」状態のリポジトリを作る
# 使い方: bash exercises/ex-undo-setup.sh [作成先]   既定: ~/dev/ch03/git-undo
set -euo pipefail

dest="${1:-$HOME/dev/ch03/git-undo}"
if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest（確認してから削除してください）" >&2
  exit 1
fi

mkdir -p "$dest/src"
cd "$dest"
git init -q -b main
git config user.name "Sample Author"
git config user.email "sample@example.com"
git config commit.gpgsign false

n=0
commit() {
  n=$((n + 1))
  local date="2026-11-03T10:0${n}:00+09:00"
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -q -m "$1"
}

printf 'console.log("タスク一覧");\n' > src/app.js
git add -A
commit "最初のコミット"

printf 'export function add(a, b) {\n  return a + b;\n}\n' > src/feature-a.js
git add -A
commit "機能Aを追加"

# 設定ファイルと一緒に、秘密情報の .env もコミットしてしまった
printf 'export const config = { port: 3000 };\n' > src/config.js
printf 'API_KEY=sk-test-1234567890abcdef\n' > .env
git add -A
commit "設定を追加"

# 作業中の状態: app.js を書き換え中、notes.txt を誤ってステージした
printf 'console.log("タスク一覧");\nconsole.log("デバッグ用の出力");\n' > src/app.js
printf '自分用のメモ（コミットしない）\n' > notes.txt
git add notes.txt

echo "作成しました: $dest"
git log --oneline
git status --short
