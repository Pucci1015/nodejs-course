#!/usr/bin/env bash
# 第11部の作業用フォルダを作る: 第11部のフォルダを丸ごとコピーして、npm ci で Vitest・Testing Library・Playwright・ESLint などを入れる
# 使い方: bash setup-part11.sh [作成先]     既定: ~/dev/part11
#   作成先が既にあれば、何もせずに終了する（上書き・削除はしない）。作り直したいときは、別の名前を指定するか、
#   中身を確かめてから自分で消してから実行する。
#   教材のフォルダは見本として残すので、node_modules は教材のフォルダではなく ~/dev の下に作る。
#   成果物（project-task-quality）は、~/dev/task-api で進めるので、ここでは npm ci しない。
#   Playwright が動かすブラウザは、別に npx playwright install chromium で入れる（第58章 8.1節）。
set -euo pipefail

DEST="${1:-$HOME/dev/part11}"
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
# node_modules（どの深さのものも）と、テストやビルドが作るもの（dist・coverage・test-results・playwright-report・.vite）は、
# 教材のフォルダにあってもコピーしない
mkdir "$DEST"
( cd "$SRC" && tar --exclude node_modules --exclude dist --exclude coverage --exclude test-results \
    --exclude playwright-report --exclude .vite -cf - . ) | ( cd "$DEST" && tar -xf - )
# コピーやダウンロードで実行の許可が外れていることがあるので、付け直す
find "$DEST" -name '*.sh' -exec chmod +x {} +

cd "$DEST"
# package-lock.json のとおりに入れる（第3部 第14章 9節）。install scripts は動かさない
npm ci --ignore-scripts

echo
echo "作りました: $DEST"
echo "  次は: cd $DEST/ch56-testing-basics"
echo "  （第58章で Playwright を使うときに、npx playwright install chromium でブラウザを入れます）"
