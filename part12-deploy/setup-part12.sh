#!/usr/bin/env bash
# 第12部の作業用フォルダを作る: 第12部のフォルダを丸ごとコピーして、npm ci で AWS SDK・BullMQ・ESLint などを入れる
# 使い方: bash setup-part12.sh [作成先]     既定: ~/dev/part12
#   作成先が既にあれば、何もせずに終了する（上書き・削除はしない）。作り直したいときは、別の名前を指定するか、
#   中身を確かめてから自分で消してから実行する。
#   教材のフォルダは見本として残すので、node_modules は教材のフォルダではなく ~/dev の下に作る。
#   成果物（project-task-deploy）は、~/dev/task-api で進めるので、ここでは npm ci しない。
set -euo pipefail

DEST="${1:-$HOME/dev/part12}"
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
# node_modules（どの深さのものも）と、テストやビルドが作るもの（dist・coverage・test-results・playwright-report・.vite・.mini-s3）は、
# 教材のフォルダにあってもコピーしない（第65章の samples/dist だけは見本なので、後でコピーする）
mkdir "$DEST"
( cd "$SRC" && tar --exclude node_modules --exclude dist --exclude coverage --exclude test-results \
    --exclude playwright-report --exclude .vite --exclude .mini-s3 -cf - . ) | ( cd "$DEST" && tar -xf - )
# 第65章の samples/dist は、ビルドした画面の見本（教材の一部）なので、上で除いた後にコピーする
cp -R "$SRC/ch65-cdn-cache/samples/dist" "$DEST/ch65-cdn-cache/samples/dist"
# コピーやダウンロードで実行の許可が外れていることがあるので、付け直す
find "$DEST" -name '*.sh' -exec chmod +x {} +

cd "$DEST"
# package-lock.json のとおりに入れる（第3部 第14章 9節）。install scripts は動かさない
npm ci --ignore-scripts

echo
echo "作りました: $DEST"
echo "  次は: cd $DEST/ch60-production"
