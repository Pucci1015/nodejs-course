# 第1部の成果物 完成例と解説

完成例は [dotfiles-example/](dotfiles-example/) にあります。このフォルダをそのまま自分の dotfiles にするのではなく、**自分で作ったものと比べる**ために使ってください。設定の中身は、人によって違ってかまいません。

| ファイル | 内容 |
| --- | --- |
| [install-basic.sh](install-basic.sh) | 5節（応用）の `install.sh` の完成例 |
| [dotfiles-example/install.sh](dotfiles-example/install.sh) | 6節（発展）の1〜3 まで入れた `install.sh` の完成例 |
| [dotfiles-example/](dotfiles-example/) のほかのファイル | 設定ファイルの例 |

> 完成例の `install.sh` は、リポジトリの場所を `~/dev/dotfiles` に決めています。試すときは、自分のリポジトリ（`~/dev/dotfiles`）にコピーしてから、まず `--dry-run` で動かします。

---

## 5節（応用）の完成例: install-basic.sh

```bash
link() {
  src="$DOTFILES/$1"
  dest="$2"

  if [[ -L "$dest" ]]; then
    echo "[ok]   $dest"
  elif [[ -e "$dest" ]]; then
    echo "[skip] $dest にファイルがあります。…"
  else
    mkdir -p "$(dirname "$dest")"
    ln -s "$src" "$dest"
    echo "[link] $dest -> $src"
  fi
}

link zshrc "$HOME/.zshrc"
...
link vscode-settings.json "$HOME/Library/Application Support/Code/User/settings.json"
```

| 要件 | 完成例でのやり方 |
| --- | --- |
| 1. リンクを作る | 関数 `link` を6回呼ぶ。`ln -s 実体 リンクを置く場所` |
| 2. 何度動かしても安全 | 最初に `[[ -L "$dest" ]]` で「リンクがあるか」を調べ、あれば何もしない |
| 3. ふつうのファイルを壊さない | `elif [[ -e "$dest" ]]` で「リンクではないが、何かある」ときは、表示するだけで何もしない |
| 4. フォルダを作る・空白 | `mkdir -p "$(dirname "$dest")"`。変数は、すべてダブルクォートで囲む |
| 5. リポジトリの場所 | `DOTFILES="$HOME/dev/dotfiles"` |
| 6. bash 3.2 | 関数、`if` / `elif` / `else`、`[[ ]]` だけを使っている |

**`-L` を先に調べる理由**: `-e` は、リンクのときは**リンクの先**があるかを調べます。順番を逆にすると、「切れたリンク」（先が無いリンク）は `-e` で偽になり、`else` に進んで `ln -s` が `File exists` で失敗します。`-L` はリンクそのものがあるかを調べるので、切れたリンクでも正しく見つけられます。

**ダブルクォートの大切さ**: `ln -s $src $dest` と書くと、`$dest` の `Application Support` の空白で引数が分かれ、`ln` に4つの引数が渡ってしまいます（第1章4.3節）。

## 6節（発展）の完成例: dotfiles-example/install.sh

```sh
$ bash install.sh --dry-run    # まず確かめる
（dry-run: 何も変えません）
[ok]   /Users/alice/.zshrc
[backup] /Users/alice/.gitconfig -> /Users/alice/.dotfiles-backup/20261107-152942/
[link] /Users/alice/.gitconfig -> /Users/alice/dev/dotfiles/gitconfig
...
$ bash install.sh
...
$ bash install.sh              # 2回目
[ok]   /Users/alice/.zshrc
[ok]   /Users/alice/.zprofile
[ok]   /Users/alice/.gitconfig
...
```

| 発展 | 完成例でのやり方 |
| --- | --- |
| 1. 正しいリンクか | `[[ -L "$dest" ]]` のとき、さらに `[[ "$(readlink "$dest")" == "$src" ]]` で、指している先がリポジトリの中のファイルかを調べる。違う場所を指すリンクは、2 のバックアップに回す |
| 2. バックアップ | 何かがあれば、`mv` で `~/.dotfiles-backup/日時/` に移してからリンクを作る。日時のフォルダなので、前のバックアップを上書きしない |
| 3. `--dry-run` | 最初に `[[ "$1" == "--dry-run" ]]` を調べて、変数 `dry_run` に `yes` を入れておく。`mkdir`・`mv`・`ln` は、`dry_run` が `no` のときだけ動かす。表示（`echo`）は、どちらのときも行う |

`-e` と `-L` の両方を調べているのは、**切れたリンク**も、バックアップに移したいからです（`-e` だけだと、切れたリンクを見落とします）。

## 設定ファイルの工夫

完成例の設定ファイルには、本文で扱っていない設定もいくつか入っています。ファイルの中のコメントを読んで、**意味が分かったものだけ**を取り入れてください。

- **`zprofile` と `zshrc` の分担**: PATH は `zprofile`、対話用の設定は `zshrc`（第1章11.1節）。
- **ツールが無くてもエラーにならない**: `zshrc` の `mise activate` は、`mise` があるときだけ動くようにしています。新しい Mac で、Homebrew や mise を入れる前に `install.sh` を動かしても、シェルが壊れません。
- **Mac ごとの設定と秘密の情報**: `zshrc` の最後で、`~/.zshrc.local` があれば読み込みます。API キーなど Git に入れたくないものや、その Mac だけの設定はそこに書きます。
- **Git の名前とメールアドレス**: `gitconfig` の `[include]` で、`~/.gitconfig.local` という別のファイルも読みます。リポジトリを Public にしても、メールアドレスが出ません。
- **SSH**: `ssh_config` には鍵の**場所**だけを書き、鍵そのものは入れません。

## よくある失敗

| 症状 | 原因 | 直し方 |
| --- | --- | --- |
| 新しいターミナルで `command not found: brew` | `~/.zprofile` のリンクが無い | `ls -l ~/.zprofile` で確かめる |
| リンクを作ったのに、古い設定のまま | 開いているシェルは、設定を読み直さない | 新しいタブを開くか、`exec zsh -l`（第1章11.2節） |
| `ln: ... File exists` | 既にファイルがある場所に `ln -s` した | 先に別の名前に移す（4節） |
| リンクが `zshrc` のような名前だけを指していて、読めない | `ln -s zshrc ~/.zshrc` と、実体を名前だけで書いた | 実体は `~/dev/dotfiles/zshrc` のように書く（2.1節） |
| `Application Support` の所だけ失敗する | 変数をダブルクォートで囲んでいない | `"$dest"` のように囲む |
| VS Code の設定が、リンクではないふつうのファイルに戻っている | VS Code（や Settings Sync）がファイルを置き換えることがある | ときどき `ls -l` で確かめる。Settings Sync と一緒に使わない |
