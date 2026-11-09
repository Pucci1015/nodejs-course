#!/usr/bin/env bash
# dotfiles のインストールスクリプト（第1部の成果物 6節「発展」1〜3 まで入れた完成例）
# このリポジトリの設定ファイルを、ホームフォルダの決まった場所に、シンボリックリンクで置く。
#
# 使い方:
#   bash install.sh             リンクを作る
#   bash install.sh --dry-run   何をする予定かを表示するだけで、何も変えない
#
# 方針:
#   - 何度動かしても同じ結果になる（既に正しいリンクがあれば何もしない）
#   - 既にあるファイルは消さず、~/.dotfiles-backup/日時/ に移してからリンクを作る
#   - macOS に最初から入っている bash 3.2 で動く（第1章と、成果物の README 2節の書き方だけを使う）

DOTFILES="$HOME/dev/dotfiles"
BACKUP_DIR="$HOME/.dotfiles-backup/$(date +%Y%m%d-%H%M%S)"

dry_run="no"
if [[ "$1" == "--dry-run" ]]; then
  dry_run="yes"
  echo "（dry-run: 何も変えません）"
fi

# link リポジトリの中のファイルの名前 リンクを置く場所
link() {
  src="$DOTFILES/$1"
  dest="$2"

  if [[ ! -e "$src" ]]; then
    echo "[skip] $1 がリポジトリにありません"
    return
  fi

  # 既に正しいリンクがある → 何もしない（発展1）
  if [[ -L "$dest" ]]; then
    if [[ "$(readlink "$dest")" == "$src" ]]; then
      echo "[ok]   $dest"
      return
    fi
  fi

  # 何かがある（ふつうのファイル、または別の場所を指すリンク）→ バックアップに移す（発展2）
  # -e はリンクの先を調べるので、切れたリンクのときは -L でも調べる
  something="no"
  if [[ -e "$dest" ]]; then
    something="yes"
  fi
  if [[ -L "$dest" ]]; then
    something="yes"
  fi
  if [[ "$something" == "yes" ]]; then
    echo "[backup] $dest -> $BACKUP_DIR/"
    if [[ "$dry_run" == "no" ]]; then
      mkdir -p "$BACKUP_DIR"
      mv "$dest" "$BACKUP_DIR/"
    fi
  fi

  echo "[link] $dest -> $src"
  if [[ "$dry_run" == "no" ]]; then
    mkdir -p "$(dirname "$dest")"
    ln -s "$src" "$dest"
  fi
}

link zshrc "$HOME/.zshrc"
link zprofile "$HOME/.zprofile"
link gitconfig "$HOME/.gitconfig"
link gitignore_global "$HOME/.config/git/ignore"
link ssh_config "$HOME/.ssh/config"
link vscode-settings.json "$HOME/Library/Application Support/Code/User/settings.json"

# 名前とメールアドレスは公開するリポジトリに入れず、~/.gitconfig.local に置く（gitconfig の [include]）
if [[ ! -e "$HOME/.gitconfig.local" ]]; then
  echo
  echo "次のコマンドで、Git の名前とメールアドレスを ~/.gitconfig.local に書いてください:"
  echo "  git config --file ~/.gitconfig.local user.name \"あなたの名前\""
  echo "  git config --file ~/.gitconfig.local user.email \"GitHub の noreply アドレス\""
fi

echo
echo "終わりました。新しいターミナルを開くか、exec zsh -l で反映してください。"
