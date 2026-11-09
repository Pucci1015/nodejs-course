#!/usr/bin/env bash
# stdout と stderr に1行ずつ出力し、終了ステータス 3 で終わるスクリプト。
# リダイレクトの練習に使う。
echo "これは stdout（標準出力）です"
echo "これは stderr（標準エラー出力）です" >&2
exit 3
