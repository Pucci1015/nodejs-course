#!/usr/bin/env bash
# localhost 用の「自己署名証明書」と秘密鍵を作る（第8章 5.1節）
# 使い方: bash make-self-signed.sh [作成先] [有効日数]   既定: ~/dev/ch08/certs 30
#   作成先に cert.pem（証明書）と key.pem（秘密鍵）を作る。作成先が既にあれば何もしない。
# macOS 標準の openssl（LibreSSL）でも、Homebrew の OpenSSL でも動くように、設定ファイルを使う。
set -euo pipefail

DEST="${1:-$HOME/dev/ch08/certs}"
DAYS="${2:-30}"

if [[ -e "$DEST" ]]; then
  echo "$DEST は既にあります。作り直すときは、中身を確かめてから別の場所を指定してください" >&2
  exit 1
fi
mkdir -p "$DEST"

# 証明書に書き込む内容。subjectAltName（SAN）に、この証明書を使ってよい名前と IP アドレスを並べる。
# 今のブラウザは CN ではなく SAN だけを見る。
cat > "$DEST/openssl.cnf" << '__END__'
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no

[dn]
CN = localhost
O = nodejs-course self-signed

[v3]
subjectAltName = DNS:localhost, IP:127.0.0.1, IP:::1
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
__END__

# -x509: 証明書の申請書ではなく、証明書そのものを作る（自分で自分に署名する）
# -nodes: 秘密鍵をパスワードで暗号化しない（開発用。本番の鍵は厳重に扱う）
openssl req -x509 -newkey rsa:2048 -nodes -sha256 \
  -days "$DAYS" \
  -keyout "$DEST/key.pem" -out "$DEST/cert.pem" \
  -config "$DEST/openssl.cnf" 2> /dev/null

chmod 600 "$DEST/key.pem" # 秘密鍵は自分だけが読めるようにする

echo "作成しました:"
echo "  証明書: $DEST/cert.pem（有効期間 $DAYS 日）"
echo "  秘密鍵: $DEST/key.pem（他人に渡さない。Git に入れない）"
echo
openssl x509 -in "$DEST/cert.pem" -noout -subject -issuer -dates
