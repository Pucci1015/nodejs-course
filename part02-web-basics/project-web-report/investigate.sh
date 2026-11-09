#!/usr/bin/env bash
# 第2部の成果物: Web サイトの通信を dig・curl・Node.js で調べて、レポートの材料を集める
# 使い方（~/dev/web-report で）: bash investigate.sh ホスト名 [HTTPS のポート] [HTTP のポート]   既定: 443 80
#   例: bash investigate.sh www.example.com | tee notes-www.example.com.txt
#       CA_FILE=~/dev/ch08/certs/cert.pem bash investigate.sh localhost 8443 8080   （第8章のサーバで試す）
#   証明書を調べるのに、第8章の cert-inspect.mjs を使う。このスクリプトと同じフォルダか、
#   ~/dev/ch08/samples/（第8章でコピーしたもの）にあれば、それを使う。
#
#   調べるのは、ふつうのブラウザが1ページを開くときと同じ程度のリクエスト（10回ほど）だけ。
#   それでも、何度も繰り返し実行したり、自分に関係の無いサイトを大量に調べたりはしないこと。
#   Cookie の値は表示しない（名前と属性だけを表示する）。
set -uo pipefail

HOST="${1:-}"
HTTPS_PORT="${2:-443}"
HTTP_PORT="${3:-80}"
CA_FILE="${CA_FILE:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CERT_INSPECT="$HERE/cert-inspect.mjs"
[ -f "$CERT_INSPECT" ] || CERT_INSPECT="$HOME/dev/ch08/samples/cert-inspect.mjs"
[ -f "$CERT_INSPECT" ] || CERT_INSPECT="$HERE/../ch08-https-tls/samples/cert-inspect.mjs"

if [ -z "$HOST" ]; then
  echo "使い方: bash investigate.sh ホスト名 [HTTPS のポート] [HTTP のポート]" >&2
  exit 2
fi

# URL を作る（既定のポートなら書かない）
https_url="https://$HOST"
[ "$HTTPS_PORT" != "443" ] && https_url="$https_url:$HTTPS_PORT"
https_url="$https_url/"
http_url="http://$HOST"
[ "$HTTP_PORT" != "80" ] && http_url="$http_url:$HTTP_PORT"
http_url="$http_url/"

CURL=(curl -sS --max-time 15 -A 'web-report-investigate/1.0 (learning)')
[ -n "$CA_FILE" ] && CURL+=(--cacert "$CA_FILE")

section() {
  echo
  echo "## $1"
  echo
}

# ヘッダの一覧から、指定した名前のヘッダを取り出す（大文字・小文字は区別しない）
pick() { grep -i "^$1:" | tr -d '\r'; }

# Set-Cookie の値を隠す: 「Set-Cookie: 名前=値; 属性」→「Set-Cookie: 名前=（値は省略）; 属性」
mask_cookies() { sed -E 's/^([Ss]et-[Cc]ookie: *[^=]+=)[^;]*/\1（値は省略）/'; }

echo "# $HOST の調査メモ"
echo
echo "- 調べた日時: $(date '+%Y-%m-%d %H:%M:%S %z')"
echo "- 調べた URL: $https_url （HTTP: $http_url）"
echo "- curl: $(curl --version | head -1 | cut -d' ' -f1-2)、Node.js: $(node --version 2>/dev/null || echo 'なし')"

# ---------------------------------------------------------------------------
section "1. DNS（第5章5節）"
is_ip=0
case "$HOST" in
  localhost | *[!0-9.]*) ;;
  *) is_ip=1 ;;
esac
case "$HOST" in *:*) is_ip=1 ;; esac

if [ "$HOST" = "localhost" ] || [ "$is_ip" = 1 ]; then
  echo "（$HOST は DNS で調べる名前ではないので、省略します。localhost は /etc/hosts で 127.0.0.1 と ::1 になります）"
elif ! command -v dig >/dev/null 2>&1; then
  echo "（dig がありません。macOS には最初から入っています）"
else
  echo '```'
  echo "\$ dig +noall +answer $HOST A"
  dig +noall +answer "$HOST" A
  echo "\$ dig +noall +answer $HOST AAAA"
  dig +noall +answer "$HOST" AAAA
  echo '```'
  # NS は、ホスト名から左のラベルを1つずつ外して、最初に見つかったものを表示する
  name="$HOST"
  while [ -n "$name" ]; do
    ns="$(dig +noall +answer "$name" NS | awk '$4 == "NS" { print $5 }')"
    if [ -n "$ns" ]; then
      echo
      echo "ネームサーバ（$name の NS）:"
      echo '```'
      echo "$ns"
      echo '```'
      break
    fi
    case "$name" in *.*) name="${name#*.}" ;; *) name="" ;; esac
  done
fi

# ---------------------------------------------------------------------------
section "2. HTTP から HTTPS へ（第7章4節、第8章7節）"
echo '```'
echo "\$ curl -sS -o /dev/null -D - $http_url"
"${CURL[@]}" -o /dev/null -D - "$http_url" 2>&1 | tr -d '\r' | grep -iE '^HTTP/|^location:|^strict-transport-security:|^curl:' || true
echo '```'
echo
echo "リダイレクトをたどった結果（最大10回）:"
echo '```'
"${CURL[@]}" -L --max-redirs 10 -o /dev/null -w 'リダイレクトの回数: %{num_redirects}\n最後の URL: %{url_effective}\n最後のステータス: %{http_code}\n' "$http_url" 2>&1 || true
echo '```'

# ---------------------------------------------------------------------------
section "3. 接続にかかった時間と HTTP のバージョン（第5章4節、第7章9節）"
echo '```'
"${CURL[@]}" -o /dev/null -w '接続した IP アドレス: %{remote_ip} ポート %{remote_port}
HTTP のバージョン: %{http_version}
ステータス: %{http_code}
DNS が終わるまで:       %{time_namelookup} 秒
TCP の接続まで:         %{time_connect} 秒
TLS のハンドシェイクまで: %{time_appconnect} 秒
最初の1バイトまで:      %{time_starttransfer} 秒
全部を受け取るまで:      %{time_total} 秒
' "$https_url" 2>&1 || true
echo '```'
echo
echo "（時間は「始めてからの累計」です。差を取ると、それぞれにかかった時間になります）"

# ---------------------------------------------------------------------------
section "4. 証明書（第8章3節・6節）"
if command -v node >/dev/null 2>&1 && [ -f "$CERT_INSPECT" ]; then
  echo '```'
  if [ -n "$CA_FILE" ]; then
    node "$CERT_INSPECT" "$HOST" "$HTTPS_PORT" --ca "$CA_FILE" 2>&1
  else
    node "$CERT_INSPECT" "$HOST" "$HTTPS_PORT" 2>&1
  fi
  echo '```'
else
  echo "（Node.js か、第8章の cert-inspect.mjs が見つかりません。教材の ch08-https-tls/samples/cert-inspect.mjs を、このスクリプトと同じフォルダにコピーしてください）"
fi

# ---------------------------------------------------------------------------
section "5. レスポンスのヘッダ（第6章、第7章）"
headers="$("${CURL[@]}" -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$https_url" 2>&1 | tr -d '\r')"
echo '```'
echo "$headers" | grep -iE '^HTTP/|^(content-type|content-encoding|content-length|cache-control|expires|etag|last-modified|age|vary|strict-transport-security|content-security-policy|x-content-type-options|x-frame-options|referrer-policy|set-cookie|alt-svc|server|via|x-cache|cf-cache-status|x-served-by|access-control-allow-origin):' | mask_cookies
echo '```'
echo
echo "（ほかのヘッダも含めた全体は: curl -sS -o /dev/null -D - $https_url）"

# ---------------------------------------------------------------------------
section "6. 圧縮（第7章6節）"
echo '```'
for enc in identity gzip br; do
  size="$("${CURL[@]}" -o /dev/null -H "Accept-Encoding: $enc" -w '%{size_download}' "$https_url" 2>/dev/null)"
  used="$("${CURL[@]}" -o /dev/null -D - -H "Accept-Encoding: $enc" "$https_url" 2>/dev/null | tr -d '\r' | pick content-encoding | cut -d' ' -f2-)"
  printf 'Accept-Encoding: %-9s → 受け取ったバイト数 %8s（Content-Encoding: %s）\n' "$enc" "$size" "${used:-なし}"
done
echo '```'

# ---------------------------------------------------------------------------
section "7. 条件付きリクエスト（第7章5節）"
etag="$(echo "$headers" | pick etag | cut -d' ' -f2-)"
lastmod="$(echo "$headers" | pick last-modified | cut -d' ' -f2-)"
echo '```'
if [ -n "$etag" ]; then
  echo "\$ curl -sS -o /dev/null -w '%{http_code}' -H 'If-None-Match: $etag' $https_url"
  "${CURL[@]}" -o /dev/null -w '%{http_code}\n' -H 'Accept-Encoding: br, gzip' -H "If-None-Match: $etag" "$https_url" 2>&1
elif [ -n "$lastmod" ]; then
  echo "\$ curl -sS -o /dev/null -w '%{http_code}' -H 'If-Modified-Since: $lastmod' $https_url"
  "${CURL[@]}" -o /dev/null -w '%{http_code}\n' -H "If-Modified-Since: $lastmod" "$https_url" 2>&1
else
  echo "（ETag も Last-Modified も無いので、条件付きリクエストは試せません）"
fi
echo '```'

# ---------------------------------------------------------------------------
section "8. HTTP/3 の案内（第7章9節）"
altsvc="$(echo "$headers" | pick alt-svc)"
if [ -n "$altsvc" ]; then
  echo "$altsvc"
  echo
  echo "（h3 があれば、このサイトは HTTP/3 にも対応しています。curl が HTTP/3 に対応していれば curl --http3 で試せます）"
else
  echo "（Alt-Svc ヘッダはありません）"
fi

echo
echo "---"
echo "この結果は、調べた日時・場所（回線や DNS のリゾルバ）によって変わります。"
