#!/usr/bin/env bash
# 本文9.3節「手を動かす」の完成形: ファイルの行を数える
# 使い方: bash count.sh ファイル
if [[ $# -lt 1 ]]; then
  echo "使い方: $0 ファイル" >&2
  exit 1
fi
if [[ ! -f "$1" ]]; then
  echo "ファイルがありません: $1" >&2
  exit 1
fi
echo "$1 は $(wc -l < "$1" | tr -d ' ') 行です"
