#!/usr/bin/env bash
# 練習問題9 の模範解答: mkcert がしていることを openssl で再現する
#   (1) ローカルの認証局（CA）の鍵と証明書を作る
#   (2) その CA で、localhost 用のサーバ証明書に署名する
# 使い方: bash make-local-ca.sh [作成先] [サーバ証明書の有効日数]   既定: ~/dev/ch08/local-ca 30
# 作成先が既にあれば何もしない。Mac のキーチェーンには登録しない（mkcert -install との違い）。
set -euo pipefail

DEST="${1:-$HOME/dev/ch08/local-ca}"
DAYS="${2:-30}"

if [[ -e "$DEST" ]]; then
  echo "$DEST は既にあります。別の場所を指定してください" >&2
  exit 1
fi
mkdir -p "$DEST"
cd "$DEST"

# ---- (1) CA ----
cat > ca.cnf << '__END__'
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
CN = nodejs-course local CA
O = nodejs-course

[v3_ca]
# CA:TRUE が「この証明書の鍵で、他の証明書に署名してよい」という印。
# pathlen:0 は「この CA の下に、さらに CA を作ってはいけない」
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
__END__

openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
  -keyout ca-key.pem -out ca.pem -config ca.cnf 2> /dev/null

# ---- (2) サーバ証明書 ----
cat > server.cnf << '__END__'
[req]
distinguished_name = dn
prompt = no

[dn]
CN = localhost
O = nodejs-course

[v3_server]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:localhost, IP:127.0.0.1, IP:::1
authorityKeyIdentifier = keyid
__END__

# 鍵と「証明書署名要求」（CSR: この公開鍵と名前で証明書を作ってください、という申請書）を作る
openssl req -newkey rsa:2048 -nodes -sha256 \
  -keyout server-key.pem -out server.csr -config server.cnf 2> /dev/null
# CA の秘密鍵で、CSR に署名して証明書にする（本物の認証局がしていること）
openssl x509 -req -sha256 -days "$DAYS" \
  -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -extfile server.cnf -extensions v3_server -out server.pem 2> /dev/null

chmod 600 ca-key.pem server-key.pem
rm server.csr

echo "作成しました（$DEST）:"
echo "  ca.pem          CA の証明書（信頼するときに使う。配ってよい）"
echo "  ca-key.pem      CA の秘密鍵（これがあれば何の証明書でも作れる。絶対に渡さない）"
echo "  server.pem      localhost の証明書（$DAYS 日）"
echo "  server-key.pem  localhost の秘密鍵"
echo
openssl verify -CAfile ca.pem server.pem
