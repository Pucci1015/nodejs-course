#!/usr/bin/env bash
# 第1部の成果物 5節（応用）の完成例: dotfiles のリンクを作る
# 使い方: bash install-basic.sh
#
# - 既にシンボリックリンクがあれば、何もしない（[ok]）
# - リンクではないふつうのファイルがあれば、消さずに知らせる（[skip]）
# - 何も無ければ、フォルダを作ってからリンクを作る（[link]）

DOTFILES="$HOME/dev/dotfiles"

# link リポジトリの中のファイルの名前 リンクを置く場所
link() {
  src="$DOTFILES/$1"
  dest="$2"

  if [[ -L "$dest" ]]; then
    echo "[ok]   $dest"
  elif [[ -e "$dest" ]]; then
    echo "[skip] $dest にファイルがあります。中身を確かめて、別の名前に移してから、もう一度動かしてください"
  else
    mkdir -p "$(dirname "$dest")"     # リンクを置くフォルダが無ければ作る
    ln -s "$src" "$dest"
    echo "[link] $dest -> $src"
  fi
}

link zshrc "$HOME/.zshrc"
link zprofile "$HOME/.zprofile"
link gitconfig "$HOME/.gitconfig"
link gitignore_global "$HOME/.config/git/ignore"
link ssh_config "$HOME/.ssh/config"
link vscode-settings.json "$HOME/Library/Application Support/Code/User/settings.json"
