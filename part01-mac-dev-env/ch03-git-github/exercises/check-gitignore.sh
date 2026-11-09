#!/usr/bin/env bash
# 練習問題8 用: .gitignore が要件どおりかを確認する
# 使い方: bash check-gitignore.sh [確認するフォルダ]   既定: ~/dev/git-ignore-practice
set -uo pipefail

dir="${1:-$HOME/dev/git-ignore-practice}"
cd "$dir" || exit 1

ng=0
# expect ignored|tracked パス
expect() {
  local want="$1" path="$2" got
  # git check-ignore -q: 無視されるなら終了ステータス 0、されないなら 1
  if git check-ignore -q --no-index "$path"; then got=ignored; else got=tracked; fi
  if [[ "$got" == "$want" ]]; then
    printf '[OK] %-30s %s\n' "$path" "$want"
  else
    printf '[NG] %-30s 期待: %s / 実際: %s\n' "$path" "$want" "$got"
    ng=$((ng + 1))
  fi
}

expect ignored node_modules/express/index.js
expect ignored docs/node_modules/readme.txt
expect ignored build/bundle.js
expect tracked src/build/helper.js
expect ignored .env
expect ignored .env.local
expect tracked .env.example
expect ignored logs/app.log
expect ignored debug.log
expect tracked logs/keep/important.log
expect ignored coverage/index.html
expect tracked config/settings.json
expect ignored config/settings.local.json
expect ignored secret/server.pem
expect tracked src/app.js
expect tracked package.json
expect tracked package-lock.json
expect tracked .gitignore

echo "NG の数: $ng"
exit "$ng"
