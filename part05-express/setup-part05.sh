#!/usr/bin/env bash
# 第5部の作業用フォルダを作る: 第5部のフォルダを丸ごとコピーして、npm ci で Express などを入れる
# 使い方: bash setup-part05.sh [作成先]     既定: ~/dev/part05
#   作成先が既にあれば、何もせずに終了する（上書き・削除はしない）。作り直したいときは、別の名前を指定するか、
#   中身を確かめてから自分で消してから実行する。
#   OneDrive の中に node_modules を作らないよう、教材のフォルダではなく ~/dev の下に作る（第1部 第1章）。
#   教材のフォルダ（OneDrive）は「読む場所」、~/dev/part05 は「動かして書き換える場所」と考える。
set -euo pipefail

DEST="${1:-$HOME/dev/part05}"
SRC="$(cd "$(dirname "$0")" && pwd)"

if [[ -e "$DEST" ]]; then
  echo "$DEST は既にあります。何もしません（作り直すなら、別の名前を指定するか、中身を確かめてから消してください）"
  exit 0
fi
if ! command -v node > /dev/null || ! command -v npm > /dev/null; then
  echo "node と npm が見つかりません。第1部 第2章の手順で mise から Node.js を入れてください" >&2
  exit 1
fi
major="$(node -p 'process.versions.node.split(".")[0]')"
if (( major < 24 )); then
  echo "Node.js 24 以降が必要です（今は $(node -v)）。mise で入れ直してください" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
# node_modules が教材のフォルダにあっても、コピーしない
mkdir "$DEST"
( cd "$SRC" && tar --exclude ./node_modules -cf - . ) | ( cd "$DEST" && tar -xf - )
# OneDrive の同期で実行の許可が外れていることがあるので、付け直す
find "$DEST" -name '*.sh' -exec chmod +x {} +

cd "$DEST"
# package-lock.json のとおりに入れる（第3部 第14章 9節）。install scripts は動かさない
npm ci --ignore-scripts

echo
echo "作りました: $DEST"
echo "  次は: cd $DEST/ch23-express-intro/samples && node hello-express.mjs"
