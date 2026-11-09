#!/usr/bin/env bash
# PATH を1行に1つずつ、検索される順番と存在の有無つきで表示する。
# 使い方: bash show-path.sh
set -euo pipefail

i=1
# IFS を ":" にして PATH を分割し、配列 dirs に入れる
IFS=':' read -r -a dirs <<< "$PATH"
for dir in "${dirs[@]}"; do
  if [[ -d "$dir" ]]; then
    mark="  "
  else
    mark="✗ "   # 存在しないフォルダ（設定ミスの可能性）
  fi
  printf '%2d %s%s\n' "$i" "$mark" "$dir"
  i=$((i + 1))
done
