#!/usr/bin/env bash
# 練習問題1 の模範解答: 自分の Mac を調べる
# 使い方: bash my-mac.sh
# 調べられない項目があっても止まらないように、set -e は使わない（2> /dev/null で失敗のメッセージを捨てる）
echo "CPU: $(uname -m)"
echo "Rosetta: $(sysctl -n sysctl.proc_translated 2> /dev/null)"
echo "brew: $(which brew 2> /dev/null)"
echo "CLT: $(xcode-select -p 2> /dev/null)"
echo "node: $(node -v 2> /dev/null)"
