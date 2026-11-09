#!/usr/bin/env bash
# 練習問題8 用: いろいろなファイルがあるプロジェクトを作る
# 使い方: bash ex-gitignore-setup.sh [作成先]   既定: ~/dev/git-ignore-practice
set -euo pipefail

dest="${1:-$HOME/dev/git-ignore-practice}"
if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest（確認してから削除してください）" >&2
  exit 1
fi
mkdir -p "$dest"
cd "$dest"
git init -q -b main

mkdir -p node_modules/express src/build build logs/keep coverage config secret docs/node_modules
touch node_modules/express/index.js docs/node_modules/readme.txt
touch src/app.js src/build/helper.js build/bundle.js
touch .env .env.local .env.example
touch logs/app.log logs/keep/important.log debug.log
touch coverage/index.html
touch config/settings.json config/settings.local.json
touch secret/server.pem
touch package.json package-lock.json

echo "作成しました: $dest"
echo "ここに .gitignore を作り、次で確認してください:"
echo "  bash $(cd "$(dirname "$0")" && pwd)/check-gitignore.sh \"$dest\""
