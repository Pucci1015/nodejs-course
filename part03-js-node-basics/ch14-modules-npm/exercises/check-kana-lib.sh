#!/usr/bin/env bash
# 練習問題5 用: kana-lib の package.json が要件どおりか確かめる
# 使い方: bash check-kana-lib.sh [kana-lib のフォルダ]   既定: このスクリプトの隣の kana-lib
#   模範解答を試す: bash check-kana-lib.sh ../solutions/kana-lib
# npm pack --dry-run は、パッケージに入るファイルの一覧を表示するだけで、何も作らず、公開もしない。
# テストの失敗を数えて最後に表示したいので、-e は付けない。
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
LIB="$(cd "${1:-$DIR/kana-lib}" && pwd)"
failures=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '[OK] %s\n' "$name"
  else
    printf '[NG] %s\n     期待: %s\n     実際: %s\n' "$name" "$expected" "$actual"
    failures=$((failures + 1))
  fi
}

cd "$LIB" || exit 2

# package.json の値を1つ取り出す（キーは | で区切る。"exports|./romaji" など）
pkg() { node -e 'const p=require("./package.json");const v=process.argv[1].split("|").reduce((o,k)=>o?.[k],p);console.log(v===undefined?"(なし)":typeof v==="object"?JSON.stringify(v):v)' "$1"; }

result=$(node --test test/ 2>&1)
check "1. npm test（自己参照の import・require・exports で隠す）がすべて通る" "ℹ fail 0" "$(printf '%s\n' "$result" | grep -E '^ℹ fail' )"

files=$(npm pack --dry-run --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].files.map(f=>f.path).sort().join(" ")))')
check "2. パッケージに入るのは、本体と README・LICENSE・package.json だけ" \
  "LICENSE README.md package.json src/index.mjs src/internal/table.mjs src/romaji.mjs" "$files"
check "3. .env がパッケージに入らない" "入らない" "$([[ " $files " == *" .env "* ]] && echo 入る || echo 入らない)"

check "4. require(esm) が使える Node.js に限る（engines.node）" ">=22.12.0" "$(pkg 'engines|node')"
check "5. 内部の部品は \"#table\" という名前で読む（imports）" "./src/internal/table.mjs" "$(pkg 'imports|#table')"
check "6. src の中で、内部の部品を相対パスで読んでいない" "0" "$(grep -l "internal/table" src/*.mjs | wc -l | tr -d ' ')"
check "7. exports の \".\" と \"./romaji\" が入り口を決める" "./src/index.mjs ./src/romaji.mjs" "$(pkg 'exports|.') $(pkg 'exports|./romaji')"

echo
if [[ $failures -eq 0 ]]; then
  echo "すべて成功しました"
else
  echo "$failures 件失敗しました"
  exit 1
fi
