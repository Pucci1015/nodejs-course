# 第4章 エディタとデバッガ

この章では、コードを書く道具（VS Code）と、動かないコードの原因を突き止める道具（デバッガ）を、実際に使いながら整えます。
デバッガは「上級者の道具」と思われがちですが、実は初めて学ぶ人ほど役に立ちます。**プログラムを途中で止めて、変数の中身を自分の目で見る**ことができれば、「たぶんこうなっているはず」という思い込みを、その場で確かめられるからです。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 3〜4時間 |
| 前提 | 第1〜3章（`code` コマンドの設定に PATH の知識を、変更の確認に Git を使います） |
| この章のゴール | VS Code の設定の階層を理解し、プロジェクトの設定を書いて共有できる / エディタの機能で安全に書き換えられる / ブレークポイントとステップ実行で Node.js のバグを見つけられる / Chrome DevTools でブラウザ側の問題を調べられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | VS Code の設定の例、編集とデバッガの練習用のプログラム、ファイルを配信する小さな Web サーバ |
| [exercises/](exercises/) | 練習問題（書き換えるプログラム、バグの入ったプログラムとページ） |
| [solutions/](solutions/) | 模範解答（直したプログラムと解説） |

> **読み方**
> - 「**手を動かす**」の所は、実際に打って動かしてください。練習問題は、そこで書いた設定や、そこで使ったデバッガの操作を広げていく問題です。
> - 実習は `~/dev/ch04/` で行います（第1章2.5節）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします。
>
>   ```sh
>   $ mkdir -p ~/dev/ch04 && cd ~/dev/ch04
>   $ cp -R （ここに Finder から samples と exercises のフォルダをドラッグ） .
>   $ ls
>   exercises	samples
>   ```
>
>   `cp -R ` まで打ってから、Finder で教材の `part01-mac-dev-env/ch04-editor-debugger` を開き、`samples` と `exercises` の2つのフォルダをターミナルにドラッグし、最後に ` .` を打って Return を押します。
> - この章では、VS Code で `~/dev/ch04` を開いて作業します（1.1節）。コマンドは、ターミナルでも VS Code の統合ターミナル（2節）でも、`~/dev/ch04` で打ちます。
> - `⌘` は Command キー、`⌥` は Option キーです。`⌘ + P` は「⌘ を押したまま P を押す」という意味です。
> - 既に VS Code を使っている人へ: 1節のインストールは飛ばしてかまいません。3節以降の「手を動かす」は、すべて打ちながら読んでください。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場所 |
| --- | --- |
| `code .` でフォルダを開く（1節） | これから先、すべての章で、プロジェクトのフォルダを VS Code で開くのに使います |
| 設定の階層と `.editorconfig`（3節、7節） | 第3部から、プロジェクトに `.vscode/settings.json` を置いて、書式の決まりを共有します。第1部の成果物（dotfiles）では、ユーザー設定を Git で管理します |
| 拡張機能（4節） | 第3部から ESLint と Prettier を使います。第11部で、同じ決まりを CI でも確かめます |
| デバッガ（8節〜10節） | 第3部以降、プログラムが思ったとおりに動かないときに、まず使う道具です。第3部 第13章では、非同期の処理の順番を、ブレークポイントで確かめます |
| Chrome DevTools の Network パネル（11節） | 第2部で、ブラウザとサーバのやり取り（HTTP）を見るのに、毎回使います |
| Elements・Console・Sources パネル（11節） | 第2部 第9章（ブラウザの仕組み）と、第4部でページを作るときに使います |

---

## 1. VS Code のインストール

```sh
$ brew install --cask visual-studio-code     # --cask: GUI アプリを入れる（第2章4.2節）
```

公式サイト（https://code.visualstudio.com/）からダウンロードしてもかまいません。その場合は、ダウンロードした `.app` を「アプリケーション」フォルダに移してから起動します（ダウンロードフォルダのまま起動すると、自動の更新がうまく働かないことがあります）。

日本語で使いたいときは、拡張機能「Japanese Language Pack for Visual Studio Code」を入れます（4節）。この教材では、メニューの名前を英語と日本語の両方で書きます。

### 1.1 手を動かす: code コマンドを入れて、作業フォルダを開く

ターミナルから VS Code を開けるようにします。

1. VS Code を開き、`⌘ + Shift + P` でコマンドパレット（2節）を開く
2. `shell command` と打ち、「Shell Command: Install 'code' command in PATH」を選ぶ

これで、PATH の通ったフォルダ（第1章10.2節）に `code` というコマンドが置かれます。ターミナルを開き直してから、確かめます。

```sh
$ which code
/usr/local/bin/code
$ ls -l /usr/local/bin/code             # l で始まる = シンボリックリンク（第2章4.3節）
lrwxr-xr-x  1 alice  admin  68 11  4 10:00 /usr/local/bin/code -> /Applications/Visual Studio Code.app/Contents/Resources/app/bin/code
$ cd ~/dev/ch04
$ code .                                # 今いるフォルダ（.）を VS Code で開く
```

VS Code の左側に、`exercises` と `samples` のフォルダが表示されれば成功です。`code` の使い方は次のとおりです。

| コマンド | 働き |
| --- | --- |
| `code .` | 今いるフォルダを開く |
| `code ~/dev/ch04` | 指定したフォルダを開く |
| `code ファイル` | ファイルを開く（無ければ新しく作る） |
| `code --wait ファイル` | `--wait`: VS Code でそのファイルのタブを閉じるまで、コマンドを終わらせない |

`--wait` は、第3章で `git config --global core.editor "code --wait"` に使いました。Git は「エディタのコマンドが終わった＝編集が終わった」と判断するので、`--wait` が無いと、すぐに空のメッセージでコミットしようとしてしまいます。

## 2. 画面の構成

| 場所 | 名前 | 主な役割 |
| --- | --- | --- |
| 左端のアイコンの列 | アクティビティバー | エクスプローラー（ファイルの一覧）、検索、ソース管理（Git）、実行とデバッグ、拡張機能の切り替え |
| 左側 | サイドバー | 選んだ機能の画面（ファイルの一覧など） |
| 中央 | エディタ | ファイルを書く場所。タブで複数開ける。`⌘ + \` で左右に分ける |
| 下 | パネル | ターミナル、問題（エラーの一覧）、出力、デバッグコンソール |
| いちばん下 | ステータスバー | ブランチの名前、エラーの数、インデント（`Spaces: 2` など）、改行コード（LF/CRLF）、文字コード、言語 |

**コマンドパレット**（`⌘ + Shift + P`）は、VS Code のすべての機能を、名前で探して実行できる入口です。キーの組み合わせ（ショートカット）を忘れたら、ここで機能の名前を打ちましょう。

### 2.1 手を動かす: 統合ターミナルを開く

**統合ターミナル**は `` Ctrl + ` `` で開いたり閉じたりします（`` ` `` は、Shift + @ のキーです）。開いたら、次を打ちます。

```sh
$ pwd
/Users/alice/dev/ch04
```

統合ターミナルは、VS Code で開いているフォルダを「今いる場所」にして zsh を起動します。動いているのは第1章の zsh そのもので、`.zshrc` も読まれます。この章のコマンドは、ここで打つと便利です。

## 3. 設定の階層

VS Code の設定は、次の順に**後のものが前のものを上書き**します。

| 順 | 種類 | 保存場所 | 用途 |
| --- | --- | --- | --- |
| 1 | 既定の値 | VS Code 本体 | |
| 2 | ユーザー設定 | `~/Library/Application Support/Code/User/settings.json` | 自分の好み（文字の大きさ、色など）。すべてのプロジェクトに効く |
| 3 | ワークスペース設定 | プロジェクトの `.vscode/settings.json` | **そのプロジェクトの決まり**（インデントの幅、整形の道具など）。Git でコミットして共有する |
| 4 | 言語ごとの設定 | 上の2つの中の `"[javascript]": { ... }` | 特定の言語だけに効かせたい設定 |

**ワークスペース**は、VS Code で開いているフォルダのことです。この章では `~/dev/ch04` です。

`settings.json` は、`"名前": 値` を `,` で区切って並べ、全体を `{ }` で囲む **JSON** という形式です。VS Code の設定ファイルは、JSON にコメント（`//`）を書ける **JSONC** という形式で読まれます。ふつうの JSON（`package.json` など）にはコメントを書けないので注意してください。

よく使う設定の名前:

| 設定 | 意味 |
| --- | --- |
| `editor.fontSize` | 文字の大きさ |
| `editor.tabSize` | インデント1段の幅（空白の数） |
| `editor.formatOnSave` | 保存するときに整形するか |
| `editor.defaultFormatter` | 整形に使う拡張機能の ID（4節） |
| `files.trimTrailingWhitespace` | 保存するとき、行の最後の空白を消すか |
| `search.exclude` | 全体の検索（`⌘ + Shift + F`）で探さないフォルダ。例: `{ "node_modules": true }` |

### 3.1 手を動かす: ワークスペース設定を書く

`~/dev/ch04` の決まりとして、「インデントは空白2つ」「Markdown 以外は、行の最後の空白を消す」を書きます。

```sh
$ mkdir -p .vscode                      # ~/dev/ch04 の中に .vscode フォルダを作る
$ code .vscode/settings.json            # 無いファイルは、新しく作って開かれる
```

開いたファイルに、次のように書いて保存します（`⌘ + S`）。

```jsonc
{
  "editor.tabSize": 2,
  "files.trimTrailingWhitespace": true,
  "[markdown]": {
    "files.trimTrailingWhitespace": false   // Markdown は行の最後の空白2つが改行の意味になるので消さない
  }
}
```

| 行 | 意味 |
| --- | --- |
| `"editor.tabSize": 2` | このフォルダでは、インデント1段を空白2つにする |
| `"files.trimTrailingWhitespace": true` | 保存するとき、行の最後の空白を消す |
| `"[markdown]": { ... }` | 言語ごとの設定。`.md` のファイルだけ、上の設定を打ち消す |

`⌘ + ,` で設定の画面を開き、上のタブを「ワークスペース」に切り替えると、今書いた値が表示されます。右上のアイコン（Open Settings (JSON)）を押すと、`settings.json` を直接開けます。この教材では、**何を設定したかが後から分かるように、`settings.json` を直接書く**ことをおすすめします。

ユーザー設定も、同じ形で書きます。コマンドパレットで「Preferences: Open User Settings (JSON)」を選ぶと開きます。[samples/vscode-user-settings.json](samples/vscode-user-settings.json) と [samples/vscode-workspace-settings.json](samples/vscode-workspace-settings.json) に、コメント付きの例があります。

**Settings Sync**（設定の同期）を使うと、GitHub のアカウントなどで、設定や拡張機能を複数の Mac で同期できます。この教材では、第1部の成果物で、ユーザー設定の `settings.json` を dotfiles として Git で管理する方法を扱います。

## 4. 拡張機能

拡張機能は、VS Code に機能を足すプログラムです。`⌘ + Shift + X` で探して入れます。この教材で使うものは次のとおりです。

| 拡張機能 | ID | 役割 | 使い始める部 |
| --- | --- | --- | --- |
| ESLint | `dbaeumer.vscode-eslint` | コードの問題点を指摘する | 第3部（設定は第11部で詳しく） |
| Prettier | `esbenp.prettier-vscode` | コードの書式を自動で整える | 第3部 |
| EditorConfig | `editorconfig.editorconfig` | インデントなどの基本の書式を、エディタの種類に関係なく共有する | 第1部（この章の7節） |
| Japanese Language Pack | `ms-ceintl.vscode-language-pack-ja` | 表示を日本語にする（好みで） | |

**拡張機能は、あなたの Mac の上で、あなたの権限で動くプログラム**です。ファイルを読んだり、ネットワークに接続したりもできます。発行元（Publisher）が確かなもの、使っている人の多いものを選び、むやみに増やさないようにしましょう。同じ理由で、VS Code は、ダウンロードしたフォルダを初めて開くときに「このフォルダの作成者を信頼しますか？」（Workspace Trust）と確かめます。知らない人のリポジトリは、まず「制限モード」で開いて中身を確かめます。

### 4.1 手を動かす: ターミナルから拡張機能を入れる

```sh
$ code --list-extensions                              # --list-extensions: 入っている拡張機能の ID の一覧
$ code --install-extension dbaeumer.vscode-eslint     # --install-extension ID: その拡張機能を入れる
$ code --install-extension esbenp.prettier-vscode
$ code --install-extension editorconfig.editorconfig
$ code --list-extensions | wc -l                      # 1行に1つなので、行の数 = 拡張機能の数（第1章6節）
       3
```

数は、ほかに入れている拡張機能の分だけ多くなります。

プロジェクトの `.vscode/extensions.json` におすすめの拡張機能を書いておくと、そのフォルダを開いた人に「おすすめの拡張機能があります」と表示されます。`"recommendations"` に、ID の文字列の配列を書きます（例: [samples/extensions.json](samples/extensions.json)）。

```jsonc
{
  "recommendations": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
}
```

## 5. 覚えておきたい操作（Mac）

### 5.1 移動と検索

| キー | 働き |
| --- | --- |
| `⌘ + P` | ファイルの名前で開く（名前の一部だけ打てばよい） |
| `⌘ + Shift + P` | コマンドパレット |
| `⌘ + F` | このファイルの中を検索する |
| `⌘ + Shift + F` | プロジェクト全体を検索する（置換もできる） |
| `Ctrl + G` | 行の番号を打って、その行へ移動する |
| `Ctrl + -` | 直前にいた場所へ戻る |
| `⌘ + B` | サイドバーを表示する・隠す |

### 5.2 編集

| キー | 働き |
| --- | --- |
| `⌘ + D` | 選んでいる単語と同じものを、次々に追加で選ぶ（複数カーソル） |
| `⌥ + クリック` | クリックした場所に、カーソルを追加する |
| `⌥ + ↑` / `⌥ + ↓` | 行を上下に移動する |
| `⌥ + Shift + ↓` | 行を下に複製する |
| `⌘ + Shift + K` | 行を消す |
| `⌘ + /` | コメントにする / 戻す |
| `⌥ + Shift + F` | ファイル全体を整形する |
| `⌘ + Z` / `⌘ + Shift + Z` | 元に戻す / やり直す |

**複数カーソル**は、同じ書き換えを何か所にもまとめて行う機能です。`Esc` で、カーソルを1つに戻します。

### 5.3 コードを理解する・直す

| キー | 働き |
| --- | --- |
| `F12` | 定義へ移動（関数を使っている場所から、その関数を書いた場所へ） |
| `Shift + F12` | その関数や変数を使っているすべての場所を表示する |
| `F2` | 名前の変更（使っている場所も、すべて一緒に変わる） |
| `⌘ + .` | クイックフィックス（直し方や書き換え方の候補を表示する） |

`F2` の名前の変更は、`⌘ + Shift + F` の置換と違い、**JavaScript の意味を理解したうえで**変えます。たまたま同じ綴りの、別の変数や、文字列の中の単語は変わりません。

`⌘ + .` で表示される候補には、次のようなものがあります（カーソルの位置や、選んでいる範囲によって変わります）。

| 候補 | 働き |
| --- | --- |
| Convert to template string | `'a' + b + 'c'` のような `+` のつなぎを、`` `a${b}c` `` の形に書き換える |
| Extract to function in module scope | 選んでいる式や文を、新しい関数に切り出す。切り出した後、関数の名前を打てる |

### 5.4 書き換える前後の出力を比べる: diff

コードを書き換えたとき、「動きが変わっていないこと」を確かめるには、書き換える前と後の出力をファイルに保存して比べます。`diff` は、2つのファイルの違いを表示するコマンドです。**同じなら何も表示せず、終了ステータスは 0** です。

違いがあると、`<` の付いた行（1つ目のファイルにだけある行）と、`>` の付いた行（2つ目のファイルにだけある行）が表示され、終了ステータスは 1 になります。

### 5.5 手を動かす: 名前の変更・複数カーソル・書き換えの候補

[samples/practice-edit.js](samples/practice-edit.js) を、手で打ち直さずに読みやすく書き換えます。まず、書き換える前の出力を保存します。

```sh
$ node samples/practice-edit.js
1個 120円 × 3個
合計: 360円
$ node samples/practice-edit.js > before.txt   # 書き換える前の出力を保存する（第1章5.2節）
$ code samples/practice-edit.js
```

次の順に書き換えて、最後に `⌘ + S` で保存します。

| 手順 | 操作 | 何が起きるか |
| --- | --- | --- |
| 1 | `var p` の `p` にカーソルを置いて `F2` → `price` と打って Return | `p` を使っている所が、すべて `price` に変わる。`'円 × '` の中の文字などは変わらない |
| 2 | 同じように `q` を `count`、`t` を `total` に変える | |
| 3 | `var` をダブルクリックで選び、`⌘ + D` を2回押して3つとも選んでから、`const` と打つ。`Esc` | 3か所が一度に `const` に変わる |
| 4 | `'1個 ' + ...` の行にカーソルを置いて `⌘ + .` →「Convert to template string」。次の行も同じ | `` `1個 ${price}円 × ${count}個` `` の形になる |
| 5 | `price * count` を選んで `⌘ + .` →「Extract to function in module scope」→ `calcTotal` と打って Return | `function calcTotal() { return price * count; }` が作られ、元の場所は `calcTotal()` になる |
| 6 | `⌥ + Shift + F` | ファイル全体を整形する（どの整形の道具を使うか聞かれたら、Prettier を選ぶ） |

書き換えたら、出力が変わっていないことを確かめます。

```sh
$ node samples/practice-edit.js > after.txt
$ diff before.txt after.txt                    # 何も出なければ同じ
$ diff before.txt after.txt && echo 同じです   # 同じなら終了ステータスが 0 なので、echo が動く（第1章7.2節）
同じです
```

書き換えた後の形は [samples/practice-edit-done.js](samples/practice-edit-done.js) です。うまくいかないときは見比べてください（5 の関数の位置や形は、少し違ってもかまいません）。

## 6. VS Code と Git

アクティビティバーの「ソース管理」（`Ctrl + Shift + G`）で、第3章の操作を画面で行えます。

- 変えたファイルをクリックすると、変える前と後が左右に並んで表示される
- ファイルの横の `+` で `git add`、上の入力欄にメッセージを書いて `⌘ + Return` で `git commit`
- エディタの行番号の横に、変えた行の印（緑: 足した、青: 変えた、赤い三角: 消した）が表示される
- コンフリクトのあるファイルを開くと、「Accept Current Change（今のブランチの方を使う）」「Accept Incoming Change（取り込む方を使う）」「Accept Both Changes（両方）」のボタンが使える

画面での操作は便利ですが、**裏で動いているのは第3章の git コマンド**です。うまくいかないときは、統合ターミナルで `git status` を見ましょう。第3章の `~/dev/ch03/hello-git` を `code ~/dev/ch03/hello-git` で開き、README.md を1行変えて、ソース管理の画面に表示されることを確かめてみてください。

## 7. EditorConfig

`.editorconfig` は「インデントは空白2つ」「改行コードは LF」のような基本の書式を、エディタの種類に関係なく共有するためのファイルです。VS Code では、EditorConfig の拡張機能（4.1節で入れました）が読みます。

VS Code の設定（`.vscode/settings.json`）は VS Code を使う人にしか効きませんが、`.editorconfig` はほかのエディタでも読まれます。**チームで共有する基本の書式は `.editorconfig`、VS Code だけの設定は `.vscode/settings.json`** と使い分けます（例: [samples/editorconfig.sample](samples/editorconfig.sample)）。

### 7.1 手を動かす: .editorconfig を書いて確かめる

```sh
$ code .editorconfig                    # ~/dev/ch04/.editorconfig を作って開く
```

次のように書いて保存します。

```ini
# プロジェクトのいちばん上のフォルダに置く .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

| 書き方 | 意味 |
| --- | --- |
| `root = true` | ここより上のフォルダの `.editorconfig` は探さない |
| `[*]` | すべてのファイルに効く設定（`*` はグロブ。第1章4.1節） |
| `[*.md]` | `.md` のファイルだけに効く設定 |
| `charset = utf-8` | 文字コードは UTF-8 |
| `end_of_line = lf` | 改行コードは LF（第1章9.5節） |
| `indent_style = space` / `indent_size = 2` | インデントは空白で、2つ分 |
| `insert_final_newline = true` | 保存するとき、ファイルの最後に改行を入れる |

確かめます。`code test.js` で新しいファイルを作り、`Tab` を押してみてください。空白が2つ入り、ステータスバーに `Spaces: 2` と `LF` が表示されます。確かめ終わったら、`rm test.js` で消しておきます。

## 8. デバッグの考え方

バグを直すときの基本の手順は、次のとおりです。

1. **再現する**: どんな入力・操作で、何が起きるか（期待と実際の違い）をはっきりさせる
2. **予想する**: 「この変数が、この時点でおかしいのでは」と予想する
3. **確かめる**: 実際の値を見る
4. **直して、もう一度確かめる**: 1 の手順で、直ったことを確かめる

3 で `console.log` を使う方法は手軽ですが、見たい変数を前もって決めて書く必要があり、見終わったら消す必要があり、「この時点で、ほかの変数はどうなっているか」を後から見られません。**デバッガ**を使うと、プログラムを好きな行で一時停止し、その瞬間のすべての変数を見て、1行ずつ進めながら値の変化を追えます。

### 8.1 この章の練習で読む JavaScript

練習問題のプログラムで使う JavaScript の書き方です。HTML・CSS・JavaScript の基本を学んだときに見たものがほとんどですが、念のためまとめておきます。

| 書き方 | 意味 |
| --- | --- |
| `const a = [1, 2, 3]` / `a.length` | 配列 / 配列の要素の数 |
| `{ name: 'alice', scores: [80, 92] }` | オブジェクト。`s.name` で値を取り出す |
| `for (let i = 0; i < a.length; i++) { ... }` | `i` を 0 から1ずつ増やしながら繰り返す。`a[i]` が i 番目の要素（最初は `a[0]`） |
| `for (const x of a) { ... }` | 配列の要素を1つずつ `x` に入れて繰り返す |
| `a.map((x) => x * 2)` | 各要素を変換した、新しい配列を作る（`[2, 4, 6]`） |
| `a.filter((x) => x >= 2)` | 条件に合う要素だけの、新しい配列を作る（`[2, 3]`） |
| `a.forEach((x, i) => { ... })` | 各要素について処理をする。`i` は何番目か |
| `` `${i + 1}位 ${name}` `` | テンプレートリテラル。`${ }` の中の式の値が入る |
| `n.toFixed(1)` | 数を、小数点以下1桁の文字列にする（`70` → `'70.0'`） |
| `[...a]` | 配列のコピーを作る |

**`sort` の比較関数**: `a.sort((x, y) => ...)` は、配列を並べ替えます。`( )` の中の関数（比較関数）は、2つの要素 `x` と `y` を受け取り、**数**を返します。

| 比較関数が返す数 | 並べ方 |
| --- | --- |
| 負の数 | `x` を前にする |
| 正の数 | `y` を前にする |
| 0 | そのまま |

ブラウザの JavaScript では、次の書き方も使います。

| 書き方 | 意味 |
| --- | --- |
| `document.getElementById('list')` | `id="list"` の要素を取り出す |
| `el.addEventListener('submit', 関数)` | `el` で `submit`（フォームの送信）が起きたら、関数を呼ぶように登録する。登録した回数だけ、関数が呼ばれる |
| `input.value` / `checkbox.checked` | 入力欄に打たれた文字列 / チェックボックスにチェックが付いているか（`true` か `false`） |
| `event.preventDefault()` | ブラウザがふつうに行う動き（フォームを送信してページを読み直す）を止める |
| `await fetch('tasks.json')` | サーバにファイルを取りに行く（第2部、第3部で詳しく学びます） |

### 8.2 手を動かす: node -p で式の値を確かめる

デバッガを使う前に、「この式は、どんな値になるか」を1行ずつ確かめる方法です。`node -p "式"` は、式の値を表示します（第2章7.1節）。

```sh
$ node -p "[3, 1, 2].sort((x, y) => x - y)"     # x - y: x が小さいと負の数 → x が前（小さい順）
[ 1, 2, 3 ]
$ node -p "[3, 1, 2].sort((x, y) => y - x)"     # 大きい順
[ 3, 2, 1 ]
$ node -p "[80, 92, 75].filter((x) => x >= 80)"
[ 80, 92 ]
$ node -p "(247 / 3).toFixed(1)"
82.3
```

「思ったとおりの値になるか」を小さく確かめる習慣は、デバッガと同じくらい役に立ちます。練習問題6 のヒントにも使います。

## 9. Node.js のインスペクタ

Node.js には、デバッガとつなぐための**インスペクタ**が入っています。

| オプション | 働き |
| --- | --- |
| `--inspect` | インスペクタを有効にして起動する（すぐに実行が始まる） |
| `--inspect-brk` | 有効にして、最初の行で一時停止して待つ（break） |

Node.js は、`127.0.0.1`（自分の Mac）の **9229番ポート**で、デバッガからの接続を待ちます（ポートについては第2部で学びます）。

> **注意**: インスペクタにつなげる人は、そのプログラムの中で、どんなコードでも実行できます。`--inspect=0.0.0.0:9229` のように、ほかの機器からつなげる形で起動したり、本番のサーバで有効にしたりしてはいけません。既定の `127.0.0.1`（自分の Mac の中からだけつなげる）のまま使います。

### 9.1 手を動かす: Chrome DevTools でつなぐ

```sh
$ node --inspect-brk samples/debug-demo.mjs 3
Debugger listening on ws://127.0.0.1:9229/0f2c...
```

Chrome のアドレスバーに `chrome://inspect` と打ち、「Remote Target」に表示された `inspect` をクリックすると、Chrome DevTools が開き、プログラムの最初で止まっています。`F8`（続行）を押すと最後まで動き、ターミナルに結果が表示されます。終わったら、ターミナルで `Ctrl + C` を押します。

操作は11.2節の Sources パネルと同じで、続行は `F8`、ステップオーバーは `F10`、ステップインは `F11` です。止まっている間の変数は、右側の「Scope」に表示されます。ふだんは、次の VS Code のデバッガを使う方が便利です。仕組みは同じで、VS Code がこのインスペクタにつないでいます。

## 10. VS Code で Node.js をデバッグする

### 10.1 いちばん簡単な方法: JavaScript Debug Terminal

1. コマンドパレットで「Debug: JavaScript Debug Terminal」を選ぶ（ターミナルの「+」の横の「∨」からも開ける）
2. 開いたターミナルで、いつもどおり `node ファイル` を実行する

このターミナルから起動した Node.js には、VS Code のデバッガが自動でつながります。プログラムを書き換えたり、起動の設定を書いたりする必要はありません。

### 10.2 手を動かす: ブレークポイントで止めて、1行ずつ進める

[samples/debug-demo.mjs](samples/debug-demo.mjs) を使います。4つのタスクを表示して、数を数えるだけのプログラムです。`// 行(A)` のような印が付いた行を使います。

1. `code samples/debug-demo.mjs` で開き、行(A)（`const summary = ...` の行）の行番号の左をクリックします。赤い丸（**ブレークポイント**）が付きます。
2. JavaScript Debug Terminal（10.1節）で、`node samples/debug-demo.mjs 3` を実行します。
3. 行(A) で止まり、その行が黄色く表示されます。ブレークポイントは、その行を**実行する直前**で止まります。

止まると、画面の上に、次のボタンの並んだ小さなバーが表示されます。

| 操作 | キー | 働き |
| --- | --- | --- |
| 続行（Continue） | `F5` | 次のブレークポイントまで実行する |
| ステップオーバー（Step Over） | `F10` | 次の行へ進む。関数を呼んでいる行は、関数の中に入らずに1行として実行する |
| ステップイン（Step Into） | `F11` | 呼んでいる関数の中に入る |
| ステップアウト（Step Out） | `Shift + F11` | 今の関数の残りを実行して、呼んだ側に戻る |
| 再起動 / 停止 | `⌘ + Shift + F5` / `Shift + F5` | |

Mac では `F5` などのキーが、画面の明るさなどの別の機能になっていることがあります。そのときは `fn` キーを押しながら押すか、バーのボタンをクリックします。

続けて、次を試します。

4. 左の「実行とデバッグ」の画面の「変数」（Variables）で、`tasks` の `▶` をクリックし、4つのタスクを見ます。
5. `F10` を何回か押し、`summary` の `total`・`done` がいつ増えるかを見ます。
6. 行(B)（`console.log(formatTask(task))` の行）まで来たら、`F11` で `formatTask` の中に入ります。「コールスタック」（Call Stack）に `formatTask` と `main` が並びます。`Shift + F11` で戻ります。
7. 「ウォッチ式」（Watch）の `+` を押して `summary.total` を登録します。`F10` で進むたびに、値が計算し直されます。
8. 下のパネルの「デバッグコンソール」に `tasks.filter((t) => t.done)` と打ちます。止まっている時点の変数を使って、式を実行できます。
9. ブレークポイントをクリックして外し、`F5` で最後まで動かします。

| 表示 | 中身 |
| --- | --- |
| 変数（Variables） | その時点の変数の値。`▶` をクリックすると、配列やオブジェクトの中身も見られる |
| ウォッチ式（Watch） | 自分で登録した式の値。1行進むたびに計算し直される |
| コールスタック（Call Stack） | 今の関数が、どの関数から呼ばれたか。クリックすると、呼んだ側の時点の変数も見られる |
| ブレークポイント（Breakpoints） | 一覧と、有効・無効の切り替え。「Uncaught Exceptions」にチェックすると、処理されなかったエラーが起きた瞬間に止まる |
| デバッグコンソール | 止まっている時点の変数を使って、JavaScript の式を実行できる |

コードの中に `debugger;` と書いても、デバッガがつながっているときは、そこで止まります。

### 10.3 手を動かす: 条件付きブレークポイントとログポイント

ブレークポイントを右クリックして「Edit Breakpoint」を選ぶと、特別なブレークポイントにできます（ブレークポイントの無い行番号の左を右クリックすると、最初から選べます）。

| 種類 | 働き | 使いどころ |
| --- | --- | --- |
| 条件付き（Conditional Breakpoint） | 式が true のときだけ止まる。例: `i === 99` | ループの100回目だけを見たい |
| ヒットカウント（Hit Count） | 指定した回数目に止まる | 何回目かでおかしくなるとき |
| ログポイント（Logpoint） | 止まらずに、メッセージを出す。`{ }` の中に変数を書くと、値が入る。例: `合計={total}` | コードを書き換えずに `console.log` したい |

試します。

1. 行(C)（`if (task.priority >= 3) ...` の行）の行番号の左を右クリック →「Add Conditional Breakpoint」→ `task.done === false` と打って Return。
2. JavaScript Debug Terminal で `node samples/debug-demo.mjs 3` を実行します。止まるたびに「変数」で `task.title` を見て、`F5` で続けます。`done: true` の「牛乳を買う」では止まりません。
3. そのブレークポイントを右クリック →「Edit Breakpoint」→ 種類を「Log Message」に変えて `{task.title} は未完了` と打って Return。もう一度実行すると、止まらずに、デバッグコンソールに3行表示されます。
4. 終わったらブレークポイントを外しておきます。

### 10.4 手を動かす: launch.json を書く

毎回同じ方法で起動したい場合は、`.vscode/launch.json` に起動の設定を書きます。`F5` を押すだけで、ターミナルで打たずにデバッグを始められます。

```sh
$ code .vscode/launch.json              # ~/dev/ch04/.vscode/launch.json を作って開く
```

次のように書いて保存します。

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "デモを実行（3）",
      "program": "${workspaceFolder}/samples/debug-demo.mjs",
      "args": ["3"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

| 項目 | 意味 |
| --- | --- |
| `"type": "node"` / `"request": "launch"` | Node.js のプログラムを、VS Code が起動する |
| `"name"` | 「実行とデバッグ」の画面の、設定を選ぶ欄に表示される名前 |
| `"program"` | 動かすファイル。`${workspaceFolder}` は開いているフォルダ（ここでは `~/dev/ch04`）。`${file}` と書くと、今エディタで開いているファイル |
| `"args"` | コマンドライン引数（`node ファイル 3` の `3`）。文字列の配列で書く |
| `"skipFiles"` | ステップインしたときに、入らないファイル。`<node_internals>/**` は Node.js 自身のコード |
| `"configurations"` | 設定の配列。`{ ... }` を `,` で区切って、いくつも並べられる |

行(A) にブレークポイントを置いて、「実行とデバッグ」の画面（`⌘ + Shift + D`）の上の欄で「デモを実行（3）」を選び、`F5` を押します。行(A) で止まれば成功です。ほかの例は [samples/launch.json](samples/launch.json) にあります。

## 11. Chrome DevTools でブラウザ側を調べる

Web アプリのバグは、サーバ（Node.js）側とブラウザ側のどちらでも起きます。ブラウザ側は **Chrome DevTools** で調べます。Chrome で `⌘ + ⌥ + I`（または、ページを右クリック →「検証」）で開きます。

| パネル | 主な使い方 |
| --- | --- |
| Elements | 今の HTML と CSS を見る・その場で書き換える。選んだ要素は、Console で `$0` として使える |
| Console | エラーのメッセージを見る。JavaScript を実行する |
| Sources | ブラウザの JavaScript にブレークポイントを置き、ステップ実行する（操作は VS Code とほぼ同じ） |
| Network | ブラウザが送ったすべてのリクエストと、その結果を見る（第2部で毎回使います） |
| Application | Cookie などの、ブラウザに保存されたデータを見る・消す |

HTML のファイルをダブルクリックして開く（アドレスが `file:///...` になる）と、`fetch` が使えないなど、Web サーバから配信したときと動きが違うことがあります。練習用に、指定したフォルダのファイルを配信するだけの小さなサーバ [samples/serve.mjs](samples/serve.mjs) を用意しました（中身は読まなくてかまいません。第4部で、同じようなものを一から作ります）。

URL の `/` から後ろの部分も、ファイルのパス（第1章2.2節）と同じ考え方です。ページの中で `fetch('/data.json')` のように **`/` で始まる**書き方をすると「サーバのいちばん上から」、`fetch('data.json')` のように **`/` で始まらない**書き方をすると「今のページのある場所から」の位置になります。

### 11.1 手を動かす: ページを配信して、Network パネルを見る

```sh
$ node samples/serve.mjs samples        # samples フォルダを配信する
配信中: http://localhost:8000/  （Ctrl + C で終了）
```

Chrome で `http://localhost:8000/demo.html` を開くと、サンプルのページ [samples/demo.html](samples/demo.html) が表示されます。`⌘ + ⌥ + I` で DevTools を開き、Network パネルを選んで、`⌘ + R` でページを読み直します。

- 1行が、1回のリクエスト（ファイルを1つ取りに行くこと）です。`demo.html` と `demo.js` の2行が表示されます。
- **Status** の列: `200`（成功）、`404`（見つからない）、`500`（サーバのエラー）など。赤い行に注目します。
- 行をクリックすると、**Headers**（送ったリクエストの URL など）、**Response**（返ってきた中身）が見られます。
- **Disable cache**: チェックすると、前に取ってきたものを使わずに、毎回取りに行きます。「直したのに変わらない」ときに使います。

アドレスバーで `http://localhost:8000/nothing.html` を開くと、Status が `404` の赤い行になることも確かめてください。

### 11.2 手を動かす: Elements と Console で要素の値を見る

1. ページのタスク名を入力する欄を右クリック →「検証」。Elements パネルで `<input id="title" ...>` が選ばれます。
2. 欄に「本を返す」と打ちます。
3. Console パネルで `$0.value` と打つと、`'本を返す'` と表示されます。`$0` は Elements パネルで選んでいる要素です。
4. Elements パネルで `<form id="form">` を選び、右側の「Event Listeners」タブを開くと、`submit` のリスナー（イベントの処理）が1つ登録されていることが分かります。

### 11.3 手を動かす: ブラウザのブレークポイント

Sources パネルで、左のファイルの一覧から `demo.js` を開き、`render` 関数の中の `list.innerHTML = '';` の行番号をクリックしてブレークポイントを置きます。ページでタスクを追加すると、そこで止まり、右側の「Scope」で `tasks` の中身が見られます。`F8` で続行します。

ほかに、次のものも便利です。

| 種類 | 場所 | 働き |
| --- | --- | --- |
| Event Listener Breakpoints | Sources パネルの右側 | 「クリックされたとき」などのイベントが起きた瞬間に止まる |
| DOM Breakpoints | Elements パネルで要素を右クリック → Break on | その要素が変えられたときに止まる。「誰がこの表示を書き換えているのか」を探すときに使う |

終わったら、ターミナルで `Ctrl + C` を押してサーバを止めます。

Safari を使う場合は、設定 →「詳細」→「Web 開発者用の機能を表示」をオンにすると、Web インスペクタ（`⌘ + ⌥ + I`）が使えます。この教材では Chrome DevTools で説明します。

---

## まとめ

- `code .` で、ターミナルから VS Code を開ける。Git のエディタには `code --wait` を使う。
- 設定は「既定 < ユーザー < ワークスペース < 言語ごと」。プロジェクトの決まりは `.vscode/settings.json` と `.editorconfig` に書いてコミットする。
- 拡張機能は自分の権限で動くプログラム。信頼できるものだけを入れる。
- `F2`（名前の変更）、`⌘ + D`（複数カーソル）、`⌘ + .`（書き換えの候補）で、手で打ち直さずに書き換え、`diff` で出力が変わらないことを確かめる。
- デバッグは「再現 → 予想 → 確認 → 直して確認」。思い込みではなく、デバッガで実際の値を見る。
- 条件付きブレークポイント・ログポイント・`launch.json` で、見たいところだけを手早く見る。
- ブラウザ側の問題は Chrome DevTools。特に Network パネルで、リクエストとその結果を見る習慣をつける。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4・応用3・発展2）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- VS Code ドキュメント: https://code.visualstudio.com/docs
  - Node.js のデバッグ: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
  - キーボードショートカット（macOS 版の PDF あり）: https://code.visualstudio.com/docs/getstarted/keybindings
- EditorConfig: https://editorconfig.org/
- Node.js のデバッグガイド: https://nodejs.org/en/learn/getting-started/debugging
- Chrome DevTools: https://developer.chrome.com/docs/devtools

前の章: [第3章 Git と GitHub](../ch03-git-github/README.md) ／ 次: [第1部の成果物 dotfiles](../project-dotfiles/README.md)
