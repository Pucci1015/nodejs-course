#!/usr/bin/env bash
# 練習問題5 用: packages/convert.mjs が要件どおりに変換するか確かめる
# 使い方（exercises フォルダで）: bash check-convert.sh [ファイル名]   既定: convert.mjs
#   確かめるファイルは、このスクリプトの隣の packages フォルダ（data/ と node_modules/iconv-lite がある所）に置く。
#   模範解答を試す: cp ../solutions/convert.mjs packages/convert-answer.mjs && bash check-convert.sh convert-answer.mjs
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)/packages"
FILE="${1:-convert.mjs}"
failures=0
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '[OK] %s\n' "$name"
  else
    printf '[NG] %s\n     期待: %s\n     実際: %s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

if [[ ! -f "$DIR/$FILE" || ! -f "$DIR/data/items-sjis.csv" ]]; then
  echo "$DIR に $FILE と data/items-sjis.csv がありません" >&2
  exit 2
fi
if [[ ! -d "$DIR/node_modules/iconv-lite" ]]; then
  echo "$DIR に iconv-lite が入っていません。そのフォルダで npm install iconv-lite を実行してください" >&2
  exit 2
fi

# バイト列を16進数で表示する（macOS にも Linux にもある od を使う）
hex() { od -An -tx1 "$1" | tr -d ' \n'; }
utf8_of() { printf '%s' "$1" | od -An -tx1 | tr -d ' \n'; }

cd "$DIR" || exit 2

# --- to-utf8 ---
node "$FILE" to-utf8 data/items-sjis.csv "$OUT/a/items.csv" > /dev/null 2>&1
check "1. to-utf8 が成功する（終了コード 0）" "0" "$?"
expected=$(printf '品名,よみ,メモ\n髙菜の漬物,たかなのつけもの,棚番号①\n抹茶の羊羹,まっちゃのようかん,10～20日に入荷\n白い茶碗,しろいちゃわん,\n')
check "2. UTF-8 で、改行は LF、BOM なし（出力先のフォルダも作る）" "$(utf8_of "$expected"; printf '0a')" "$(hex "$OUT/a/items.csv" 2>/dev/null)"

# --- to-sjis（成功） ---
node "$FILE" to-sjis data/order-utf8-ok.csv "$OUT/order.csv" > /dev/null 2>&1
check "3. to-sjis が成功する（終了コード 0）" "0" "$?"
# 出力を、iconv-lite とは別の仕組み（Node.js の TextDecoder）で読み直して確かめる
sjis_text() { node -e 'process.stdout.write(JSON.stringify(new TextDecoder("shift_jis").decode(require("fs").readFileSync(process.argv[1]))))' "$1" 2>/dev/null; }
check "4. Shift_JIS（CP932）で、改行は CRLF。〜 は ～ に、− は － に置き換える" \
  '"品名,数量,備考\r\n鉛筆,10～20,－ 5% 割引\r\n消しゴム,3,\r\n"' "$(sjis_text "$OUT/order.csv")"

# --- to-sjis（失敗） ---
err=$(node "$FILE" to-sjis data/order-utf8.csv "$OUT/bad.csv" 2>&1 > /dev/null)
code=$?
check "5. Shift_JIS にできない文字があれば、終了コード 1" "1" "$code"
check "6. どこの何という文字かを、標準エラー出力に書く" "3行目 1文字目: 𠮷（U+20BB7）は Shift_JIS にできません" "$err"
check "7. 失敗したときは、出力ファイルを作らない" "なし" "$([[ -e "$OUT/bad.csv" ]] && echo あり || echo なし)"

# --- 使い方 ---
node "$FILE" to-xxx a b > /dev/null 2>&1
check "8. 知らないコマンドなら、終了コード 2" "2" "$?"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
