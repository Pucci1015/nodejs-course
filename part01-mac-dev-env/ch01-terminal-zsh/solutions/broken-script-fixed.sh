#!/usr/bin/env bash
# 練習問題7 の模範解答（直した後の fixed.sh）
# 直したところ:
#   1. 改行コードを CRLF（Windows の形）から LF にした（tr -d '\r'）
#   2. 1行目に shebang を足した
#   3. 実行権限を付けた（chmod +x）。これはファイルの中身ではなく、ファイルの属性
# ここから下は、元のスクリプトと同じ（コメントだけ日本語のまま）
cd ~
today=$(date +%Y-%m-%d)
count=$(ls | wc -l)
echo "今日は $today です"
echo "ホームには $count 個のファイル/フォルダがあります"
