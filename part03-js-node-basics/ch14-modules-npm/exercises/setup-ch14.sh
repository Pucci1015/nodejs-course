#!/usr/bin/env bash
# 練習問題3・4・6 用: npm install を試すための練習用フォルダを作る
# 使い方: bash setup-ch14.sh [作成先]     既定: ~/dev/ch14
#   作成先が既にあれば、何もせずに終了する（上書き・削除はしない）。作り直したいときは、自分で消してから実行する。
#   OneDrive の中に node_modules を作らないよう、教材のフォルダではなく ~/dev の下に作る（第1部 第1章）。
set -euo pipefail

DEST="${1:-$HOME/dev/ch14}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SJIS="$DIR/../../../part02-web-basics/ch07-http-details/samples/sjis.mjs"

if [[ -e "$DEST" ]]; then
  echo "$DEST は既にあります。何もしません（作り直すなら、中身を確かめてから消してください）"
  exit 0
fi
if [[ ! -f "$SJIS" ]]; then
  echo "第2部 第7章の sjis.mjs が見つかりません: $SJIS" >&2
  exit 1
fi

mkdir -p "$DEST/packages/data" "$DEST/deps/local/hello-postinstall"

# ---- packages: 練習問題3（iconv-lite）と4（tldts） ----------------------
cat > "$DEST/packages/package.json" <<'JSON'
{
  "name": "ch14-packages",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
JSON

cat > "$DEST/packages/README.md" <<'MD'
# ch14-packages

第14章 練習問題3（iconv-lite）と練習問題4（tldts）で使うフォルダです。教材の `setup-ch14.sh` が作りました。

- `data/members-sjis.csv` … Shift_JIS・CRLF の CSV（Windows の Excel で保存した想定）
- `data/order-utf8.csv` … Mac で作った UTF-8 の CSV。Shift_JIS にできない文字が1つある
- `data/order-utf8-ok.csv` … 上から、Shift_JIS にできない文字を取り除いたもの
MD

# Shift_JIS の CSV は、第2部 第7章の encodeShiftJis で作る（まだ iconv-lite を入れていないため）
node --input-type=module -e "
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const { encodeShiftJis } = await import(pathToFileURL(process.argv[1]).href);
const csv = ['名前,ふりがな,メモ', '髙橋 一郎,たかはし いちろう,会員番号①', '渡辺 花子,わたなべ はなこ,10～20日に連絡', '佐藤 次郎,さとう じろう,'].join('\\r\\n') + '\\r\\n';
fs.writeFileSync(process.argv[2], encodeShiftJis(csv));
" "$SJIS" "$DEST/packages/data/members-sjis.csv"

# Mac で作った UTF-8 の CSV（〜 は U+301C、− は U+2212。Mac の日本語入力で打つとこちらになる）
printf '\xef\xbb\xbf品名,数量,備考\n鉛筆,10〜20,\xe2\x88\x92 5%% 割引\n𠮷野家の箸,3,\n' > "$DEST/packages/data/order-utf8.csv"
printf '品名,数量,備考\n鉛筆,10〜20,\xe2\x88\x92 5%% 割引\n消しゴム,3,\n' > "$DEST/packages/data/order-utf8-ok.csv"

# ---- deps: 練習問題6（依存関係を調べる） ---------------------------------
cat > "$DEST/deps/package.json" <<'JSON'
{
  "name": "ch14-deps",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "debug": "^4.3.0",
    "hello-postinstall": "file:./local/hello-postinstall",
    "minimist": "1.2.5",
    "ms": "2.0.0"
  }
}
JSON

cat > "$DEST/deps/local/hello-postinstall/package.json" <<'JSON'
{
  "name": "hello-postinstall",
  "version": "1.0.0",
  "description": "npm install のときにスクリプトを実行するパッケージの例（第14章 練習問題6）",
  "scripts": {
    "postinstall": "node postinstall.cjs"
  }
}
JSON

cat > "$DEST/deps/local/hello-postinstall/postinstall.cjs" <<'JS'
// npm install のときに実行される。ここでは、npm を実行したフォルダに小さなファイルを書くだけ。
// 本物の悪意あるパッケージなら、ここで秘密の情報（~/.ssh、環境変数のトークン）を盗むこともできる。
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(process.env.INIT_CWD ?? process.cwd(), 'POSTINSTALL-RAN.txt');
fs.writeFileSync(file, `postinstall が ${new Date().toISOString()} に実行された\n`);
console.log('hello-postinstall: postinstall が実行された');
JS

cat > "$DEST/deps/README.md" <<'MD'
# ch14-deps

第14章 練習問題6（依存関係を調べる）で使うフォルダです。教材の `setup-ch14.sh` が作りました。
`package.json` には、わざと古いバージョンや、install のときにスクリプトを実行するパッケージを入れてあります。
MD

echo "作りました: $DEST"
find "$DEST" -type f | sed "s#^$DEST/#  #" | sort
