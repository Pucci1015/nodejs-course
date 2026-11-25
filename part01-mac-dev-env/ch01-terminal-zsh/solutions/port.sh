#!/usr/bin/env bash
# 練習問題8 の模範解答: 環境変数 PORT を読む
# 使い方: PORT=8080 bash port.sh
port="${PORT:-3000}"                   # PORT が無いか空なら 3000（本文10.1節）

# 数字を消して何か残れば、数字以外が混ざっている（本文6.2節の tr -d '0-9'）
if [[ -n "$(echo "$port" | tr -d '0-9')" ]]; then
  echo "PORT は数字にしてください: $port" >&2
  exit 1
fi

echo "ポート $port で待ち受けます"
