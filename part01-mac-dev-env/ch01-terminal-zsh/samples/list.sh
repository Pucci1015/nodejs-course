#!/usr/bin/env bash
# 本文9.4節「手を動かす」の完成形: フォルダの中のファイルを、行数つきで並べる
# 使い方: bash list.sh [フォルダ]   既定: 今いる場所
set -euo pipefail
target="${1:-.}"                 # 1つ目の引数。無ければ "."（今いる場所）
for f in "$target"/*; do
  if [[ -f "$f" ]]; then
    echo "$(basename "$f"): $(wc -l < "$f" | tr -d ' ') 行"
  fi
done
