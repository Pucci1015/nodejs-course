#!/usr/bin/env bash
# 練習問題10 の模範解答: アクセスログを要約する
# 使い方: log-summary ログファイル
#   終了ステータス: 0 = 5xx なし / 1 = 引数かファイルの間違い / 2 = 5xx がある

# 引数が無いとき（本文9.4節の $#）
if [[ $# -lt 1 ]]; then
  echo "使い方: $0 ログファイル" >&2
  exit 1
fi

log="$1"

# ファイルが無いとき
if [[ ! -f "$log" ]]; then
  echo "ファイルがありません: $log" >&2
  echo "使い方: $0 ログファイル" >&2
  exit 1
fi

# 件数は「条件に合う行だけを通す → wc -l で数える」（本文6.4節）
# Mac の wc は数字の前に空白を付けるので、tr -d ' ' で空白を消す（本文6.2節の tr -d）
total=$(wc -l < "$log" | tr -d ' ')
count_4xx=$(awk '$9 >= 400 && $9 < 500' "$log" | wc -l | tr -d ' ')
count_5xx=$(awk '$9 >= 500' "$log" | wc -l | tr -d ' ')

echo "ファイル: $log"
echo "リクエスト数: $total"
echo "4xx の件数: $count_4xx"
echo "5xx の件数: $count_5xx"
echo "アクセスの多いパス（上位3件）:"
awk '{print $7}' "$log" | sort | uniq -c | sort -rn | head -n 3

if [[ $count_5xx -gt 0 ]]; then
  echo "警告: 5xx が $count_5xx 件あります" >&2
  exit 2
fi
