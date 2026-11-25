# 第4章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。
模範解答は [../solutions/README.md](../solutions/README.md) にあります。

問題は **基本 → 応用 → 発展** の順に並んでいます。基本は、本文の「手を動かす」で書いた設定や、試した操作を少し変える問題です。応用は、それらを組み合わせてファイルを書いたり、バグを直したりします。発展は少し考える問題なので、できなくても次に進んでかまいません。

問題5と6は「バグを直す」問題です。**コードを眺めて推理するのではなく、必ずデバッガや DevTools で実際の値を見て**原因を突き止めてください。答えを当てることより、「どの機能を使って、何を見て、原因が分かったか」を説明できることが目的です。プログラムで使っている JavaScript の書き方は、本文8.1節にまとめてあります。

| 問題 | 種類 | テーマ | ファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 設定を書く場所を選んで書く | なし | 3.1, 7.1 |
| 2 | 基本 | エディタの機能で書き換える | [refactor-me.js](refactor-me.js) | 5.5 |
| 3 | 基本 | 特別なブレークポイントで値を見る | [../samples/debug-demo.mjs](../samples/debug-demo.mjs) | 10.2, 10.3 |
| 4 | 基本 | launch.json に設定を足す | [../samples/debug-demo.mjs](../samples/debug-demo.mjs) | 10.2, 10.4 |
| 5 | 応用 | ステップ実行でバグを直す | [bug-grades.mjs](bug-grades.mjs) | 8, 10 |
| 6 | 応用 | DevTools でブラウザ側のバグを直す | [buggy-page.html](buggy-page.html)、[buggy-page.js](buggy-page.js)、[tasks.json](tasks.json) | 8.1, 11 |
| 7 | 応用 | 新しいプロジェクトの設定を用意してコミットする | なし | 3.1, 4.1, 7.1、第3章 |
| 8 | 発展 | 設定がぶつかったとき、どれが使われるか | なし | 3, 7 |
| 9 | 発展 | Chrome DevTools で Node.js をデバッグする | [../samples/debug-demo.mjs](../samples/debug-demo.mjs) | 9.1, 11.3 |

すべて、作業フォルダ `~/dev/ch04`（本文の「読み方」）で行います。VS Code で開いておきます。

```sh
$ cd ~/dev/ch04
$ code .
```

---

## 問題1 設定を書く場所を選んで書く（基本）

`~/dev/ch04/settings-practice` というフォルダを作り、`code settings-practice` で開いてください（新しいウィンドウが開きます）。次の状態になるように、**ユーザー設定**・**ワークスペース設定**（`.vscode/settings.json`）・**`.editorconfig`** のどれかに書いてください。どこに書いたか、なぜそこに書いたかも答えます。

1. 自分の VS Code では、どのプロジェクトでも文字の大きさを 15 にする。
2. このプロジェクトでは、インデントを空白2つにする。VS Code 以外のエディタを使う人にも守ってもらう。
3. このプロジェクトでは、JavaScript のファイルだけ、保存するときに Prettier で整形する。
4. このプロジェクトでは、`node_modules` フォルダを、全体の検索（`⌘ + Shift + F`）で探さないようにする。

ヒント: 使う設定の名前は、本文3節の「よく使う設定の名前」の表にあります。3 は、本文3.1節の `"[markdown]": { ... }` と同じ書き方で、`"[javascript]"` に書きます。整形の道具を決める設定には、Prettier の ID（本文4節の表）を書きます。

## 問題2 エディタの機能で書き換える（基本）

[refactor-me.js](refactor-me.js) を、本文5.5節と同じように、**手で文字を打ち直すのをできるだけ減らして**書き換えてください。使った機能（キー）をメモしておきましょう。

書き換える前に、出力を保存しておきます。

```sh
$ node exercises/refactor-me.js > before.txt
$ code exercises/refactor-me.js
```

1. 変数 `d` の名前を `tasks` に変える。
2. オブジェクトの `t`・`p`・`f` の名前を、それぞれ `title`・`priority`・`done` に変える（オブジェクトを書いている所で `F2`）。
3. `var` を、すべて `let` に変える。
4. `+` で文字列をつないでいる3か所を、テンプレートリテラル（`` `...${}...` ``）に変える。
5. 「優先度3以上か」の条件（`tasks[i].priority >= 3`）を、`isHighPriority` という名前の関数に切り出す。
6. ファイル全体を整形する。

最後に、出力が変わっていないことを確かめます。

```sh
$ node exercises/refactor-me.js > after.txt
$ diff before.txt after.txt && echo 同じです
同じです
```

追加の問い: 1 を `⌘ + Shift + F` の「すべて置換」で `d` → `tasks` としていたら、どうなっていたでしょうか。

## 問題3 特別なブレークポイントで値を見る（基本）

本文10.3節と同じ [../samples/debug-demo.mjs](../samples/debug-demo.mjs) を、JavaScript Debug Terminal（本文10.1節）で `node samples/debug-demo.mjs 3` と動かします。各問いの前に、前の問いのブレークポイントは外しておきます。

1. 行(C) に、条件 `task.priority >= 3` の**条件付きブレークポイント**を置いて実行してください。何回止まりましたか。止まったときの `task.title` は何でしたか。
2. 同じ行に**ログポイント** `{task.title}: {task.priority}` を置いて実行してください。どこに、何が表示されましたか。
3. 行(B) に、**ヒットカウント** `3` のブレークポイントを置いて実行してください（右クリック →「Add Conditional Breakpoint」→ 左の欄で「Hit Count」を選ぶ）。止まったときの `task.title` と `summary.total` は何でしたか。
4. 3 で止まったとき、ウォッチ式に `tasks.filter((t) => !t.done).length` を登録してください。値はいくつですか。それは何を表していますか。

## 問題4 launch.json に設定を足す（基本）

本文10.4節で書いた `~/dev/ch04/.vscode/launch.json` に、設定を2つ足してください。`"configurations"` の配列に `{ ... }` を `,` で区切って足します。

| name | 動かすファイル | 引数 |
| --- | --- | --- |
| `デモを実行（99）` | `samples/debug-demo.mjs` | `99` |
| `成績の集計` | `exercises/bug-grades.mjs` | なし（`"args"` を書かない） |

書けたら、次を確かめてください。

1. 「実行とデバッグ」の画面の上の欄に、3つの名前が並ぶ。
2. 「ブレークポイント」の画面で「Uncaught Exceptions」にチェックを入れ、「デモを実行（99）」を `F5` で始める。どの行で止まりましたか。そのときのコールスタックには、どの関数が並んでいますか。
3. 2 で止まったとき、デバッグコンソールで `id` と `tasks.map((t) => t.id)` を実行してください。エラーになった理由を説明してください。
4. 「成績の集計」を `F5` で始めると、デバッグコンソールに問題5 の「直す前の出力」が表示される。

## 問題5 ステップ実行でバグを直す（応用）

[bug-grades.mjs](bug-grades.mjs) は、生徒の平均点を計算して、順位と合格者を表示するプログラムです。期待する出力は、ファイルの最初のコメントにあります。

```sh
$ node exercises/bug-grades.mjs
1位 alice 55.7
2位 bob 61.0
3位 carol 48.3
4位 dave 61.7
5位 eve 39.3
合格者（平均70点以上）: （0人）
```

**バグが3つあります。** 次の手順で見つけて、`exercises/bug-grades.mjs` を直してください。デバッガは、問題4 の「成績の集計」の設定か、JavaScript Debug Terminal で動かします。

1. まず手で計算しておきます。alice さん（80, 92, 75）の平均は、いくつになるべきですか（本文8.2節のように `node -p` で計算してもかまいません）。
2. `average` 関数の中（`sum += scores[i];` の行）にブレークポイントを置き、ステップ実行しながら `i` と `sum` の変化を見てください。1回目に足されたのは、どの点数でしたか。1つ目のバグを直してください。
3. 直して動かし直すと、平均は正しくなりますが、順位が点数の高い順になりません。`rank` 関数の `sort` の比較関数の中（`a.avg < b.avg`）にブレークポイントを置き、比較関数が何を返しているかを見てください。本文8.1節の `sort` の説明と比べて、2つ目のバグを直してください。`node -p "[3, 1, 2].sort((a, b) => a < b)"` を試すのも手がかりになります。
4. まだ、合格者の人数が期待と合いません。`filter` の中（`r.avg > 70` の部分）に、条件 `r.name === 'carol'` の条件付きブレークポイントを置いて、carol さんの `r.avg` と、条件の結果を確かめてください。3つ目のバグを直してください。
5. 3つのバグそれぞれについて「何が原因で、デバッガで何を見て気づいたか」を1〜2行で書いてください。

直したら、出力が期待どおりか確かめます。

```sh
$ node exercises/bug-grades.mjs
1位 bob 94.3
2位 dave 91.7
3位 alice 82.3
4位 carol 70.0
5位 eve 57.7
合格者（平均70点以上）: bob, dave, alice, carol（4人）
```

## 問題6 DevTools でブラウザ側のバグを直す（応用）

`exercises` フォルダを配信して、ブラウザでページを開きます（本文11.1節）。

```sh
$ node samples/serve.mjs exercises
配信中: http://localhost:8000/  （Ctrl + C で終了）
# → Chrome で http://localhost:8000/buggy-page.html を開き、⌘ + ⌥ + I で DevTools を開く
```

本当は、[tasks.json](tasks.json) の3件のタスクが表示され、フォームで追加でき、「完了したものを隠す」で完了済みのタスクを隠せるページです。ところが、次の3つの問題があります。

1. ページを開くと「読み込みに失敗しました（404）」と表示され、タスクが1件も出ない。
2. 「完了したものを隠す」のチェックを付けても外しても、表示が変わらない（タスクを読み込めるように直してから確かめること）。
3. タスクを何件か追加すると、2件目からは、追加するたびに名前が空のタスクも増えていく。

それぞれ、次の DevTools の機能を使って原因を突き止め、`exercises/buggy-page.js` を直してください。

| 問題 | 使う機能 |
| --- | --- |
| 1 | Network パネル（本文11.1節）。どの URL にリクエストし、何が返ってきたか。`tasks.json` は、ページと同じフォルダにあります（本文11節の URL の説明） |
| 2 | Elements パネルでチェックボックスを選び、Console で `$0.value` と `$0.checked` を、チェックを付けたときと外したときで比べる（本文11.2節、8.1節の表） |
| 3 | Elements パネルでフォーム（`<form id="form">`）を選び、右側の「Event Listeners」タブで `submit` のリスナーの数を見る（本文11.2節）。タスクを追加するたびに、数がどうなるか |

直したら、ブラウザで `⌘ + Shift + R`（前に取ってきたものを使わずに読み直す）で確かめます。終わったら、ターミナルで `Ctrl + C` を押してサーバを止めます。

## 問題7 新しいプロジェクトの設定を用意してコミットする（応用）

第3部からは、プロジェクトを作るたびに、書式の決まりを最初に用意します。その練習です。`~/dev/ch04/my-project` を作り、Git のリポジトリにして（第3章4.1節）、次の4つのファイルを書いてください。

| ファイル | 書くこと |
| --- | --- |
| `.editorconfig` | すべてのファイルで、文字コード UTF-8・改行コード LF・インデントは空白2つ・最後に改行。Markdown だけ、行の最後の空白を消さない |
| `.vscode/settings.json` | 保存するときに整形する。整形の道具は Prettier。`node_modules` を全体の検索で探さない |
| `.vscode/extensions.json` | ESLint・Prettier・EditorConfig の3つをおすすめにする |
| `.gitignore` | `node_modules/` を無視する（第3章13節） |

書けたら、次を確かめてから、`"書式の設定を追加"` というメッセージでコミットしてください。

```sh
$ cd ~/dev/ch04/my-project
$ mkdir -p node_modules && echo "x" > node_modules/a.js   # 無視されるかを確かめるためのファイル
$ git status --short
?? .editorconfig
?? .gitignore
?? .vscode/
$ git check-ignore -v node_modules/a.js
.gitignore:1:node_modules/	node_modules/a.js
```

1. `git status --short` に、`node_modules` が表示されないのはなぜですか。
2. `.vscode/` フォルダごとコミットしてよいのはなぜですか。逆に、コミットしてはいけない VS Code の設定は、どこに書かれていますか。
3. コミットした後、`code ~/dev/ch04/my-project` で開き直すと、拡張機能について何と表示されますか（3つとも入っていれば、何も表示されないこともあります）。

## 問題8 設定がぶつかったとき、どれが使われるか（発展）

問題1 の `settings-practice` を使います。

1. **ユーザー設定**に `"editor.tabSize": 4` を書いてください。
2. このプロジェクトで新しい `.js` のファイルを作ると、インデントの幅はいくつになりますか。問題1 の 2 で `.editorconfig` に書いた設定と、ユーザー設定の `4` の、どちらが使われるかを**予想してから**確かめてください（ステータスバーの `Spaces: 2` のような表示で分かります）。
3. `.editorconfig` の `indent_size = 2` の行を消して保存し、新しいファイルを作ると、どうなりますか。
4. 確かめ終わったら、ユーザー設定の `"editor.tabSize": 4` を消しておきます。

## 問題9 Chrome DevTools で Node.js をデバッグする（発展）

VS Code ではなく、Chrome DevTools を Node.js のデバッガとして使います（本文9.1節）。

```sh
$ node --inspect-brk samples/debug-demo.mjs 3
```

1. Chrome で `chrome://inspect` を開き、「Remote Target」の `inspect` をクリックしてください。どの行で止まっていますか。それはなぜですか。
2. Sources パネルで、行(C) の行番号をクリックしてブレークポイントを置き（本文11.3節と同じ操作）、`F8`（続行）を押してください。止まったら、右側の「Scope」で `task` の値を見てください。
3. 終わったら、ターミナルで `Ctrl + C` を押して Node.js を止めてください。
4. ターミナルに表示された `Debugger listening on ws://127.0.0.1:9229/...` の `127.0.0.1` は、何を意味していますか。本文9節の「注意」を読んで、`--inspect=0.0.0.0:9229` で起動してはいけない理由を説明してください。
