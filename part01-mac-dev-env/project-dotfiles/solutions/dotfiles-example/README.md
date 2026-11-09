# dotfiles

自分の Mac（Apple Silicon）の開発環境の設定です。設定ファイルの実体をこのリポジトリに置き、ホームディレクトリにはシンボリックリンクを置いています。

| ファイル | リンクの場所 |
| --- | --- |
| `zprofile` | `~/.zprofile` |
| `zshrc` | `~/.zshrc` |
| `gitconfig` | `~/.gitconfig` |
| `gitignore_global` | `~/.config/git/ignore` |
| `ssh_config` | `~/.ssh/config` |
| `vscode-settings.json` | `~/Library/Application Support/Code/User/settings.json` |
| `Brewfile` | （`brew bundle` で使う） |

このリポジトリに入れていないもの（Mac ごとに作る）:

- `~/.gitconfig.local`: Git の名前とメールアドレス
- `~/.zshrc.local`: その Mac だけの設定、API キーなど
- `~/.ssh/id_ed25519`: SSH の秘密鍵

## 新しい Mac での手順

1. macOS をアップデートし、ターミナルが Rosetta で動いていないことを確かめる（`uname -m` が `arm64`）
2. Xcode Command Line Tools を入れる: `xcode-select --install`
3. Homebrew を入れる（https://brew.sh/ja/ のコマンド）。表示される「Next steps」の `eval "$(/opt/homebrew/bin/brew shellenv)"` を、今のシェルで実行する
4. このリポジトリを clone する（この時点では SSH 鍵がないので HTTPS で）

   ```sh
   $ mkdir -p ~/dev && cd ~/dev
   $ git clone https://github.com/ユーザー名/dotfiles.git
   $ cd dotfiles
   ```

   Private リポジトリの場合は、先に `brew install gh && gh auth login` でログインしてから `gh repo clone ユーザー名/dotfiles` を使う

5. リンクを作り、Brewfile のものを入れる

   ```sh
   $ bash install.sh --dry-run
   $ bash install.sh
   $ brew bundle --file=Brewfile
   ```

6. Git の名前とメールアドレスを設定する

   ```sh
   $ git config --file ~/.gitconfig.local user.name "名前"
   $ git config --file ~/.gitconfig.local user.email "GitHub の noreply アドレス"
   ```

7. 新しいターミナルを開き、Node.js を入れる: `mise use --global node@lts`
8. SSH 鍵を作って GitHub に登録する（`ssh-keygen -t ed25519 -C "メールアドレス"` → `pbcopy < ~/.ssh/id_ed25519.pub` → GitHub の Settings → SSH and GPG keys）。`ssh -T git@github.com` で確認
9. このリポジトリのリモートを SSH に切り替える: `git remote set-url origin git@github.com:ユーザー名/dotfiles.git`
10. VS Code を開き、「Shell Command: Install 'code' command in PATH」を実行する

## 設定を変えるとき

`~/.zshrc` などを編集すると、このリポジトリの中のファイルが変わります。`git diff` で確認して、理由をメッセージに書いてコミットします。
