#!/usr/bin/env bash
# マージのコンフリクトを練習するためのリポジトリを作る（第3章 8節・練習問題7・12）
# 使い方: bash make-conflict-repo.sh [作成先]   既定: ~/dev/git-conflict
#
# main と feature/default-name の2つのブランチが、src/greet.js の同じ行を別々に変更している。
set -euo pipefail

dest="${1:-$HOME/dev/git-conflict}"
if [[ -e "$dest" ]]; then
  echo "既に存在します: $dest（確認してから削除してください）" >&2
  exit 1
fi

mkdir -p "$dest/src"
cd "$dest"
git init -q -b main
git config user.name "Sample Author"
git config user.email "sample@example.com"
git config commit.gpgsign false   # 署名の設定をしていても、同じハッシュになるように

n=0
commit() {
  n=$((n + 1))
  local date="2026-11-02T10:0${n}:00+09:00"
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" git commit -q -m "$1"
}

cat > src/greet.js <<'JS'
export function greet(name) {
  return 'Hello, ' + name + '!';
}
JS
printf '# greet\n\nあいさつ文を作る関数です。\n' > README.md
git add -A
commit "greet 関数を追加"

# feature ブランチ: 名前の既定値を追加し、テンプレートリテラルに書き換える
git switch -q -c feature/default-name
cat > src/greet.js <<'JS'
export function greet(name = 'ゲスト') {
  return `Hello, ${name}!`;
}
JS
git add -A
commit "名前を省略したときの既定値を追加"

# main ブランチ: あいさつを日本語にし、README も更新する
git switch -q main
cat > src/greet.js <<'JS'
export function greet(name) {
  return 'こんにちは、' + name + 'さん！';
}
JS
printf '# greet\n\nあいさつ文を作る関数です。\n\n## 例\n\ngreet("alice") → こんにちは、aliceさん！\n' > README.md
git add -A
commit "あいさつを日本語にする"

echo "作成しました: $dest"
git log --oneline --graph --all
