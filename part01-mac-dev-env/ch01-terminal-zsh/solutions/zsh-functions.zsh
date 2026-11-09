# 練習問題9 の模範解答（~/.zshrc に足す）

# 1. エイリアス
alias ll='ls -lahF'

# 2. 本文11.3節の mkcd: フォルダを作って、そこへ移動する
mkcd() {
  mkdir -p "$1" && cd "$1"
}

# 3. bak ファイル: ファイル名.YYYY-MM-DD.bak という名前でコピーを作る
bak() {
  if [[ $# -lt 1 ]]; then
    echo "使い方: bak ファイル" >&2
    return 1   # 関数を終わらせるのは exit ではなく return（exit だとシェルごと終わってしまう）
  fi
  cp -i "$1" "$1.$(date +%Y-%m-%d).bak"
}
