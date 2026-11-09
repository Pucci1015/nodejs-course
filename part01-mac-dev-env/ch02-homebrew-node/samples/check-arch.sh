#!/usr/bin/env bash
# CPU アーキテクチャ、Rosetta、Homebrew の場所をまとめて表示する（第2章）
# 使い方: bash check-arch.sh
set -uo pipefail

echo "OS:            $(uname -s) $(uname -r)"
if command -v sw_vers > /dev/null; then
  echo "macOS:         $(sw_vers -productVersion)"
fi
echo "アーキテクチャ: $(uname -m)"

# sysctl.proc_translated は Apple Silicon でのみ存在する。1 なら Rosetta で動いている
translated=$(sysctl -n sysctl.proc_translated 2> /dev/null || echo "（取得できません）")
echo "Rosetta:       $translated  (0=ネイティブ, 1=Rosetta)"

if command -v brew > /dev/null; then
  echo "brew:          $(command -v brew)"
  echo "brew --prefix: $(brew --prefix)"
else
  echo "brew:          見つかりません"
fi

echo "node:          $(command -v node || echo 見つかりません)"
