#!/usr/bin/env bash
# 自分の Mac のネットワークの状態をまとめて表示する（第5章 2節・3節）
# 使い方: bash show-network.sh
# macOS 用のコマンドを使っている。見つからないコマンドは飛ばす。
set -uo pipefail

section() { printf '\n== %s ==\n' "$1"; }

section "Wi-Fi（en0）の IP アドレス"
ipconfig getifaddr en0 2> /dev/null || echo "（取得できません。有線の場合は en1 などを試す: ipconfig getifaddr en1）"

section "デフォルトゲートウェイ（ルーター）"
route -n get default 2> /dev/null | awk '/gateway/ {print $2}'

section "使っている DNS サーバ"
scutil --dns 2> /dev/null | awk '/nameserver\[[0-9]+\]/ {print $3}' | sort -u

section "インターネット側から見た自分の IP アドレス（外部のサービスに問い合わせる）"
curl -s --max-time 5 https://api.ipify.org && echo || echo "（取得できません）"

section "この Mac で待ち受けているポート（TCP）"
lsof -nP -iTCP -sTCP:LISTEN 2> /dev/null | awk 'NR == 1 || !seen[$1 $9]++' | head -20
