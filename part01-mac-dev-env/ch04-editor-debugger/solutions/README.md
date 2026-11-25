# 第4章 模範解答

[練習問題](../exercises/README.md) の解答と解説です。動かすときは、`solutions` フォルダを `~/dev/ch04` にコピーしてから（`cp -R （Finder から solutions をドラッグ） ~/dev/ch04`）、`~/dev/ch04` で動かします。

| ファイル | 内容 |
| --- | --- |
| [refactored.js](refactored.js) | 問題2 の書き換えた後のファイル |
| [launch.json](launch.json) | 問題4 の `.vscode/launch.json` |
| [grades-fixed.mjs](grades-fixed.mjs) | 問題5 の直したもの |
| [fixed-page.html](fixed-page.html)、[fixed-page.js](fixed-page.js)、[tasks.json](tasks.json) | 問題6 の直したもの（`node samples/serve.mjs solutions` で配信し、`/fixed-page.html` を開く） |

直したファイルには、直した場所に「修正」というコメントを付けています。

---

## 問題1 設定を書く場所を選んで書く

| # | 書く場所 | 内容 | 理由 |
| --- | --- | --- | --- |
| 1 | ユーザー設定 | `"editor.fontSize": 15` | 自分の好みで、どのプロジェクトにも効かせたい |
| 2 | `.editorconfig` | `[*]` に `indent_style = space` と `indent_size = 2` | プロジェクトの決まりで、VS Code 以外のエディタでも守ってほしい |
| 3 | ワークスペース設定 | 下の例 | プロジェクトの決まりだが、VS Code だけの設定 |
| 4 | ワークスペース設定 | `"search.exclude": { "node_modules": true }` | 同じ |

`.editorconfig`（`~/dev/ch04/settings-practice/.editorconfig`）:

```ini
root = true

[*]
indent_style = space
indent_size = 2
```

`.vscode/settings.json`（3 と 4 をまとめたもの）:

```jsonc
{
  "[javascript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "search.exclude": {
    "node_modules": true
  }
}
```

`.vscode` フォルダは、本文3.1節のように `mkdir -p .vscode` で作るか、設定画面の「ワークスペース」のタブで何か1つ設定すると、自動で作られます。

ユーザー設定に書く 1 は、ほかのプロジェクトにも効きます。プロジェクトの決まり（2〜4）をユーザー設定に書くと、自分の VS Code でだけ守られ、ほかの人には伝わりません。

## 問題2 エディタの機能で書き換える

解答: [refactored.js](refactored.js)

| 手順 | 使う機能 | ポイント |
| --- | --- | --- |
| 1 | `d` の上で `F2` → `tasks` と打って Return | 検索して置換すると、ほかの単語の中の `d`（`done` など）まで変わってしまう。`F2` は、同じ変数だけを変える |
| 2 | 配列の中の `t:` の上で `F2` → `title`。`p`・`f` も同じ | オブジェクトを書いている所で変えると、`tasks[i].t` のように使っている所もすべて変わる |
| 3 | `var` をダブルクリックで選び、`⌘ + D` を何回か押してすべて選んでから、`let` と打つ | 複数カーソル。`Esc` で1つのカーソルに戻す |
| 4 | `'- ' + ...` の上で `⌘ + .` →「Convert to template string」 | 手で書き換えると、空白や `'` の消し忘れが起きやすい |
| 5 | `tasks[i].priority >= 3` を選んで `⌘ + .` →「Extract to function in module scope」→ `isHighPriority` と打つ | 切り出した関数の引数は、VS Code が自動で決める（ここでは `i`） |
| 6 | `⌥ + Shift + F` | 初めて使うときは、どの整形の道具を使うかを聞かれることがある。Prettier を選ぶ |

```sh
$ node exercises/refactor-me.js > after.txt
$ diff before.txt after.txt && echo 同じです
同じです
```

追加の問い: `d` という1文字は、`done` や `undefined`、文字列の中の言葉など、ほかの所にも出てきます。「すべて置換」は文字の並びだけを見るので、それらも `tasks` に変わり、プログラムが壊れます（`done` が `tasksone` になる、など）。`F2` は JavaScript の変数としての `d` だけを変えます。

名前を変えただけで、`d[i].f == false` が `tasks[i].done == false` になり、何をしているかが読めるようになりました。`n` や `h` のような1文字の名前は、書いた直後は分かっても、数週間後の自分には分かりません。

`== false` や `var` の使い分けなど、JavaScript としてのよりよい書き方は、第3部 第11章で学びます。

## 問題3 特別なブレークポイントで値を見る

1. **2回**止まります。止まったときの `task.title` は「レポートを書く」（priority 3）と「発表の準備」（priority 5）です。条件付きブレークポイントは、条件が true のときだけ止まるので、ループの全部の回を見なくて済みます。

2. 止まらずに、**デバッグコンソール**に次のように表示されます。

   ```
   牛乳を買う: 1
   レポートを書く: 3
   部屋を掃除する: 2
   発表の準備: 5
   ```

   コードに `console.log` を書き足さずに、値を出せます。ログポイントは「止まらない、消し忘れない `console.log`」です。

3. ループの3回目で止まります。`task.title` は「部屋を掃除する」、`summary.total` は **3** です。行(B) より前の `summary.total += 1;` は、3回目の分も既に実行されているからです。ヒットカウントは「何回目かでおかしくなる」ときに、そこまで `F5` を押し続けなくて済みます。

4. **3** です。`done` が `false` のタスク（未完了のタスク）の数を表しています。`tasks` はループの中で変わらないので、何回目で止めても同じ値です。ウォッチ式には、変数だけでなく、このような式も書けます。

## 問題4 launch.json に設定を足す

解答: [launch.json](launch.json)

`"configurations"` は配列なので、`{ ... }` の後に `,` を付けて、次の `{ ... }` を書きます。`,` を忘れると、VS Code が `launch.json` の文字に赤い波線を付け、「問題」パネルにエラーが表示されます。

2. `findTask` の中の `throw new Error(...)` の行で止まります。コールスタックは、上から `findTask`、`main`、（ファイルそのもの）です。「`main` から `findTask` を呼び、その中でエラーが起きた」ことが分かります。

3. `id` は `99`、`tasks.map((t) => t.id)` は `[1, 2, 3, 4]` です。`99` という `id` のタスクは無いので、`tasks.find(...)` が何も見つけられず（`undefined`）、`if (!task)` の中の `throw` に進みました。`"args": ["99"]` の `"99"` が、`Number(...)` で数の `99` になって `id` に入っていることも、デバッガで確かめられます。

4. `"console"` を書かない launch の設定では、プログラムの出力はデバッグコンソールに表示されます。ターミナルに出したいときは、`"console": "integratedTerminal"` を足します（[../samples/launch.json](../samples/launch.json) にはありませんが、公式のドキュメントに説明があります）。

## 問題5 ステップ実行でバグを直す

解答: [grades-fixed.mjs](grades-fixed.mjs)

1. (80 + 92 + 75) ÷ 3 = 247 ÷ 3 = **82.3**（小数点以下1桁）です。

| # | 原因 | デバッガで見たもの |
| --- | --- | --- |
| 1 | `average` のループが `i = 1` から始まっていて、最初の点数が足されていない | ステップ実行すると、`i` が 1 から始まり、1回目に足される値が `scores[1]`（92）だった。alice さんの `sum` は 167（92 + 75）で終わり、本当の 247 にならない |
| 2 | `sort` の比較関数が `a.avg < b.avg`（true か false）を返している | 比較関数の中で止めると、返している値が `true` か `false` だった。`sort` は比較関数が返す**数**（負・0・正）で並べ方を決めるので（本文8.1節）、true と false では正しく並ばない |
| 3 | 合格の条件が `> 70` になっていて、ちょうど 70.0 点のcarol さんが外れる | 条件付きブレークポイントで止めると、carol さんの `r.avg` は `70` で、`r.avg > 70` は `false` だった |

直し方:

```js
for (let i = 0; i < scores.length; i++) {          // 1: 0 から始める
return [...results].sort((a, b) => b.avg - a.avg);  // 2: 大きい順。b の方が大きいと正の数になり、b が前に来る
const passed = ranked.filter((r) => r.avg >= 70);  // 3: 「70点以上」は >=
```

1 を直した後の出力は、次のようになります。平均は正しくなりましたが、順位がばらばらです。

```
1位 alice 82.3
2位 bob 94.3
3位 carol 70.0
4位 dave 91.7
5位 eve 57.7
合格者（平均70点以上）: alice, bob, dave（3人）
```

`node -p "[3, 1, 2].sort((a, b) => a < b)"` を実行すると、`[ 3, 1, 2 ]` のまま（並ばない）です。

3つとも直すと、期待どおりの出力になります。

```sh
$ node exercises/bug-grades.mjs
1位 bob 94.3
2位 dave 91.7
3位 alice 82.3
4位 carol 70.0
5位 eve 57.7
合格者（平均70点以上）: bob, dave, alice, carol（4人）
```

## 問題6 DevTools でブラウザ側のバグを直す

解答: [fixed-page.js](fixed-page.js)

| # | 原因 | DevTools で見たもの | 直し方 |
| --- | --- | --- | --- |
| 1 | `fetch('/api/tasks.json')` の URL が間違っている。`tasks.json` はページと同じフォルダにあり、`/api/` というフォルダは無い | Network パネルで `tasks.json` の行が赤く、Status が `404`。Headers の Request URL が `http://localhost:8000/api/tasks.json` | `fetch('tasks.json')` にする |
| 2 | チェックボックスの状態を `hideDone.value` で調べている。`value` はいつも文字列 `"on"` なので、`hideDone.value ? ...` はいつも真になる | Console で `$0.value` は、チェックを付けても外しても `"on"`。`$0.checked` は `true` / `false` と変わる | `hideDone.checked` にする |
| 3 | `submit` のリスナーを登録する `addEventListener` が `render` の中にあり、描くたびに1つずつ増える | Event Listeners タブの `submit` が、ページを開いた直後は1つ、タスクを追加するたびに2つ、3つ…と増える | 登録を `render` の外に出し、ページを読み込んだときに1回だけ行う |

3 で「空のタスク」が増えた理由: 1回の送信で、登録されたリスナーが全部呼ばれます（本文8.1節）。2つ目のリスナーが動くときには、1つ目のリスナーが既に入力欄を空にしているので、空の名前のタスクが追加されていました。リスナーが3つになれば、空のタスクは2件ずつ増えます。

1 の補足: `/` で始まる URL は「サーバのいちばん上から」、`/` で始まらない URL は「今のページのある場所から」の位置になります（本文11節）。第2部で URL の形を、第4部でファイルの配信を詳しく学びます。

2 の補足: `<input type="checkbox">` の `value` は「チェックされているときに、フォームで送る値」で、チェックの状態ではありません。HTML の要素のプロパティは、種類によって意味が違うので、迷ったら Console で実際の値を確かめるのが確実です。

## 問題7 新しいプロジェクトの設定を用意してコミットする

```sh
$ mkdir -p ~/dev/ch04/my-project && cd ~/dev/ch04/my-project
$ git init
$ mkdir -p .vscode
$ code .editorconfig .vscode/settings.json .vscode/extensions.json .gitignore   # 4つのファイルをまとめて開く
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

`.vscode/settings.json`:

```jsonc
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "search.exclude": {
    "node_modules": true
  }
}
```

`.vscode/extensions.json`:

```jsonc
{
  "recommendations": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "editorconfig.editorconfig"]
}
```

`.gitignore`:

```
node_modules/
```

```sh
$ git add .
$ git commit -m "書式の設定を追加"
$ git status --short          # 何も出ない（node_modules/a.js は無視されている）
```

1. `.gitignore` の `node_modules/` に当てはまるファイルは、Git が「無いもの」として扱うからです。`git check-ignore -v` は、どのファイルの何行目で無視されたかを表示します（第3章13.2節）。`git add .` でも入りません。
2. `.vscode/settings.json` と `extensions.json` に書いたのは「このプロジェクトの決まり」で、全員に同じものを使ってほしいからです。文字の大きさや色などの**個人の好み**は、ユーザー設定（`~/Library/Application Support/Code/User/settings.json`）に書き、プロジェクトには入れません。
3. 入っていない拡張機能があると、右下に「このリポジトリにおすすめの拡張機能があります」のような知らせが表示されます。拡張機能の画面（`⌘ + Shift + X`）の「RECOMMENDED」（おすすめ）にも、3つが並びます。

## 問題8 設定がぶつかったとき、どれが使われるか

2. インデントの幅は **2** です。EditorConfig の拡張機能は、ファイルを開いたときに `.editorconfig` の値を、**そのファイルの設定として上書き**します。ユーザー設定の `4` より優先されます。

3. `.editorconfig` に `indent_size` が無くなると、ユーザー設定の **4** が使われます。

補足: VS Code には `"editor.detectIndentation": true`（最初から有効）という設定があり、**既にあるファイルを開くと、そのファイルの中身から**インデントの幅を推測して使います。新しいファイルで確かめるのはこのためです。設定どおりにならないと感じたら、ステータスバーの「Spaces: 4」のような表示をクリックして確かめましょう。

## 問題9 Chrome DevTools で Node.js をデバッグする

1. ファイルの**最初の行**で止まっています。`--inspect-brk` は「インスペクタを有効にして、最初の行で一時停止して待つ」オプションだからです（本文9節）。止まっていないと、Chrome をつなぐ前にプログラムが終わってしまいます。

2. 行(C) で止まり、「Scope」の `Local` に `task` が表示されます。1回目は `{ id: 1, title: '牛乳を買う', priority: 1, done: true }` です。VS Code と同じく、`F8` を押すたびに次の回で止まります。

4. `127.0.0.1` は「自分の Mac」を表す特別なアドレスで、**自分の Mac の中からだけ**つなげることを意味します。`0.0.0.0` にすると、同じネットワーク（カフェの Wi-Fi など）のほかの機器からもつなげるようになります。インスペクタにつなげる人は、そのプログラムの中でどんなコードでも実行できるので、他人に Mac を操作されるのと同じ危険があります。
