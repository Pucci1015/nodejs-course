#!/usr/bin/env bash
# 第62章 3.1節: 練習用の自己署名の証明書を作る（第2部 第8章 5節と同じもの）
# 使い方: bash samples/make-cert.sh [作成先のフォルダ]   （既定は certs）
# 作成先に cert.pem があれば、何もせずに終わる（上書きしない）
set -euo pipefail

dir="${1:-certs}"
if [ -e "$dir/cert.pem" ]; then
  echo "$dir/cert.pem はもうあります。何もしません"
  exit 0
fi
mkdir -p "$dir"

# req -x509: 証明書の申請ではなく、自分で署名した証明書をすぐ作る
# -newkey ec ... : 新しい鍵（楕円曲線 P-256）を一緒に作る
# -nodes: 秘密鍵をパスワードで暗号化しない（練習用。本物の鍵はこうしない）
# -days 30: 30 日で期限切れ
# -subj: 証明書の名前（CN）。-addext: 名前（SAN）に localhost と 127.0.0.1 を入れる
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
  -keyout "$dir/key.pem" -out "$dir/cert.pem" -days 30 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null
chmod 600 "$dir/key.pem" # 秘密鍵は自分だけが読める
echo "$dir/cert.pem と $dir/key.pem を作りました（30 日で期限切れ）"
