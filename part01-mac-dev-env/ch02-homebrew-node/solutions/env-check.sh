#!/usr/bin/env bash
# 練習問題10 の模範解答: Mac の開発環境を診断する
# 使い方: bash env-check.sh
# 終了ステータス: すべて OK なら 0、NG が1つでもあれば 1
#
# set -e は使わない。調べるためのコマンドが失敗するのは「NG」という結果であって、
# そこでスクリプトを止めたいわけではないから。

result=0    # NG が1つでもあれば 1 にする

# 1. CPU
arch=$(uname -m)
if [[ "$arch" == "arm64" ]]; then
  echo "[OK] CPU が arm64"
else
  echo "[NG] CPU が arm64 ではありません（$arch）"
  result=1
fi

# 2. Rosetta。Intel の Mac などで項目が無いと、結果は空になる
translated=$(sysctl -n sysctl.proc_translated 2> /dev/null)
if [[ "$translated" == "0" ]]; then
  echo "[OK] Rosetta で動いていない"
else
  echo "[NG] Rosetta で動いているか、調べられません（結果: $translated）"
  result=1
fi

# 3. brew の場所。見つからなければ which の結果は空になる
brew_path=$(which brew 2> /dev/null)
if [[ "$brew_path" == "/opt/homebrew/bin/brew" ]]; then
  echo "[OK] brew が /opt/homebrew/bin/brew にある"
else
  echo "[NG] brew が /opt/homebrew/bin/brew にありません（見つかった場所: $brew_path）"
  result=1
fi

# 4. mise
mise_path=$(which mise 2> /dev/null)
if [[ -z "$mise_path" ]]; then
  echo "[NG] mise がありません（brew install mise）"
  result=1
else
  echo "[OK] mise がある"
fi

# 5. node が mise のフォルダにあるか。grep で /mise/ を含む行だけを残し、空かどうかで判定する
node_path=$(which node 2> /dev/null)
from_mise=$(echo "$node_path" | grep /mise/)
if [[ -z "$from_mise" ]]; then
  echo "[NG] node が mise で入れたものではありません（見つかった場所: $node_path）"
  result=1
else
  echo "[OK] node が mise で入れたもの"
fi

# 6. LTS。node が無いと結果は空になるので、空のときも NG にする
lts=$(node -p "process.release.lts" 2> /dev/null)
if [[ -z "$lts" ]]; then
  lts="undefined"
fi
if [[ "$lts" != "undefined" ]]; then
  echo "[OK] node が LTS（$lts）"
else
  echo "[NG] node が LTS ではないか、node がありません"
  result=1
fi

if [[ "$result" == "0" ]]; then
  echo "すべて OK です"
else
  echo "NG があります"
fi
exit "$result"
