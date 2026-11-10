# 第21章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part04/ch21-html-templates/exercises/` で行います。最初に `cd exercises` で移動してください（`cd ~/dev/part04/ch21-html-templates/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | 5つの文字をエスケープする、改行を `<br>` にする | [escape-html.mjs](escape-html.mjs)、[escape-html.test.mjs](escape-html.test.mjs) | 3 | — |
| 2 | 基本 | コメントの一覧を `html` タグで作る | [comment-list.mjs](comment-list.mjs)、[comment-list.test.mjs](comment-list.test.mjs) | 4, 5 | — |
| 3 | 基本 | 選ぶ欄（`<select>`）を `html` タグで作る | [select-box.mjs](select-box.mjs)、[select-box.test.mjs](select-box.test.mjs) | 3, 4 | — |
| 4 | 基本 | `html` タグとエスケープの結果を予想する（調べる問題） | [predict-html.mjs](predict-html.mjs) | 3, 4 | — |
| 5 | 応用 | 属性・URL・`<script>` の中・クエリ文字列に値を入れる道具 | [html-helpers.mjs](html-helpers.mjs)、[html-helpers.test.mjs](html-helpers.test.mjs) | 3, 7 | — |
| 6 | 応用 | 一覧のページを部品の関数で組み立てる（ページ分けつき） | [views.mjs](views.mjs)、[views.test.mjs](views.test.mjs) | 4, 5 | — |
| 7 | 発展 | 小さなテンプレートエンジンを作る | [template.mjs](template.mjs)、[template.test.mjs](template.test.mjs) | 6 | — |
| 8 | 発展 | 読書メモのサイトの表示のバグを直す | [buggy-views.mjs](buggy-views.mjs)、[notes-data.mjs](notes-data.mjs)、[check-views.sh](check-views.sh) | 2〜7 | 9215 |

**発展**（7・8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

- 問題1〜3・5〜7: `○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。
- 問題8は `bash check-views.sh` で確かめます。模範解答は、問題5・6の解答と、第17・18章の模範解答を使います。
- 問題2・3の `html` は、本文で使った [../samples/mini-html.mjs](../samples/mini-html.mjs) を `import` しています。

---

## 基本

### 問題1 5つの文字をエスケープする、改行を `<br>` にする

[escape-html.mjs](escape-html.mjs) に、2つの関数を作ってください（本文3節）。

- **`escapeHtml(value)`**: `&`・`<`・`>`・`"`・`'` を、`&amp;`・`&lt;`・`&gt;`・`&quot;`・`&#39;` にする
  - 数は文字にする（`0` → `'0'`）。`null` と `undefined` は `''`
  - `&lt;` は `&amp;lt;` になる（`&` を置き換えたものを、もう一度置き換えない）
- **`textToHtml(text)`**: 複数行の文字を、改行を保ったまま HTML に入れる形にする。先にエスケープしてから、改行（`\n`）を `<br>\n` にする
  - `textToHtml('a < b\n2行目')` → `'a &lt; b<br>\n2行目'`

```sh
$ node --test escape-html.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文3節の `escape.mjs` の `escapeHtml` に、`null`・`undefined` のときの1行を足したものです。
- `textToHtml` は `escapeHtml(text).replaceAll('\n', '<br>\n')` で書けます。`replaceAll(探す文字, 置き換える文字)` は、見つかったものを全部置き換えます。
- 順番を逆に（`<br>` を入れてからエスケープ）すると、`<br>` まで `&lt;br&gt;` になります。

### 問題2 コメントの一覧を `html` タグで作る

[comment-list.mjs](comment-list.mjs) に、2つの関数を作ってください。どちらも `html` タグで書き、結果は `SafeHtml` にします（本文4・5節）。

- **`commentItem({ name, text, starred })`**: 1件分
  - `{ name: 'alice', text: 'こんにちは', starred: false }` → `<li class="comment"><b>alice</b>: こんにちは</li>`
  - `starred` が `true` なら `class="comment starred"`
- **`commentList(comments)`**: `<ul class="comments">` の中に `commentItem` を並べる。0件なら `<p class="empty">コメントはありません</p>`

```sh
$ node --test comment-list.test.mjs
ℹ pass 6
ℹ fail 0
```

ヒント:

- 本文5節の `book-page.mjs` の `bookItem` と、`` html`<ul>${books.map(bookItem)}</ul>` `` の形です。
- `class` の値は、`const cls = comment.starred ? 'comment starred' : 'comment';` のように先に決めておくと読みやすくなります。
- `.join('')` で文字列にしてはいけません。`SafeHtml` の印が消えて、外側の `html` がもう一度エスケープします（本文4.1節）。配列のまま渡せば、`html` がつないでくれます。

### 問題3 選ぶ欄（`<select>`）を `html` タグで作る

並べ替えの欄のような `<select>` を作る関数 `selectBox(name, options, selected)` を [select-box.mjs](select-box.mjs) に作ってください。結果は `SafeHtml` にします。

```js
selectBox('sort', [{ value: 'new', label: '新しい順' }, { value: 'old', label: '古い順' }], 'old');
// → <select name="sort"><option value="new">新しい順</option><option value="old" selected>古い順</option></select>
```

- `options` の1つずつを `<option value="値">表示</option>` にする
- `value` が `selected` と同じ `<option>` にだけ、` selected` を付ける
- 名前・値・表示の文字は、すべてエスケープする（属性の値は引用符で囲む。本文3.2節）
- `options` が空なら `<select name="sort"></select>`

```sh
$ node --test select-box.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `options.map((o) => ...)` の中で、`o.value === selected` なら `selected` の付いた `html`、違えばふつうの `html` を返します（`? :`）。
- `selected` のような「名前だけの属性」は、値を入れずに、テンプレートの文字として書きます。
- 送られた検索の条件を、フォームに残して見せるときに使います。

### 問題4 `html` タグとエスケープの結果を予想する（調べる問題）

[predict-html.mjs](predict-html.mjs) に 15 個の式があります。[../samples/mini-html.mjs](../samples/mini-html.mjs) を読んでから、**実行する前に**結果を予想して書き出し、`node predict-html.mjs` で確かめてください。

特に、次の4つは理由を説明してください。

- 3番と4番: エスケープを2回すると、何が起きるか。画面にはどう表示されるか
- 7番: `0` だけが表示されるのはなぜか。`0` も出さないようにすると、何が困るか
- 9番と12番: 8番・10番と、どこが違うのか
- 15番: HTML としては正しいが、URL としては困ることがある。何が困るか（ヒント: サーバの `req.query.get('q')` は何を受け取るか）

---

## 応用

### 問題5 値を入れる場所ごとの道具

本文3.3節の表の、「要素の中身」以外の場所に値を入れる道具を、[html-helpers.mjs](html-helpers.mjs) に作ってください。

**`attrs(obj)`**: 属性をまとめて書く。`` html`<input${attrs({ name: 'q', value: q, required: true })}>` `` のように使う。結果は `SafeHtml`。

- 値は引用符で囲み、エスケープする。`0` や空文字も書く
- `true` は名前だけ（`required`）、`false`・`null`・`undefined` は書かない
- `class` だけは、配列（`['task', null, 'done']` → `task done`）と、オブジェクト（`{ task: true, done: false }` → `task`）も受け取る。空になったら書かない
- 名前に、属性名として使えない文字（空白、`"`、`>`、`=` など）があるときや、空の名前は `TypeError`

**`safeUrl(url)`**: `href` などに入れてよい URL だけを通す。

- `http:`・`https:`・`mailto:` と、scheme の無い相対 URL（`/a`、`./a`、`?page=2`、`#top`、`tasks/1`、空文字）はそのまま返す
- それ以外の scheme（`ftp:`、`data:`、`file:` など）は `'#'` を返す。大文字（`HTTPS:`）でも同じ
- ブラウザは、URL の前の空白・制御文字と、途中のタブ・改行を取り除いてから読みます。同じようにしてから scheme を見ること（取り除いた後の文字を返すのではなく、通すなら元の文字を返す）
- `/search?q=a:b` のように、`/` や `?` より後に `:` があるだけなら scheme ではない

**`jsonForScript(value)`**: `<script>` の中に入れる JSON（本文7節）。`<`・`>`・`&`・U+2028・U+2029 を `\u003c` のような形にする。結果は `SafeHtml`（`html` タグに入れても、もう一度エスケープされない）。`undefined` は `null` にする。

**`queryString(params)`**: `{ q: 'a b', page: 2 }` → `'?q=a+b&page=2'`。URL 用にエンコードする。`null`・`undefined` の値は入れない。何も残らなければ `''`。

```sh
$ node --test html-helpers.test.mjs
```

最初は 13 個のうち 10 個が失敗します。すべて通れば完成です。

### 問題6 一覧のページを、部品の関数で組み立てる

タスクの一覧のページを作るつもりで、[views.mjs](views.mjs) に4つの関数を作ってください。どれも `html` タグを使って書き直します（いまは文字列をつないでいて、ページ分けもずれています）。

| 関数 | 返すもの |
| --- | --- |
| `layout({ title, body, flash })` | ページ全体。`<html lang="ja">`、`<meta charset="utf-8">`、`<title>題名 \| タスク</title>`。`flash`（「保存しました」のような知らせ）は、あるときだけ `<p class="flash">` で出す |
| `taskList(tasks)` | `<ul class="tasks">` と、1件ずつ `<li class="task">`（完了なら `class="task done"`）と題名のリンク `/tasks/id`。0件なら `<p class="empty">タスクはありません</p>` |
| `paginate(all, { page, perPage })` | `{ items, page, pages, total, hasPrev, hasNext }`。`page` は 1 から。数でない・範囲の外の `page` は、いちばん近いページにする。`'2'` のような文字列も受け取る（クエリから来るので）。`pages` は 0件でも 1 |
| `pagination({ page, pages, baseUrl, query })` | `<nav class="pagination">`。前のページ（`rel="prev"`、「前へ」）、ページの番号（今のページは `<span aria-current="page">`）、次のページ（`rel="next"`、「次へ」）。`query` の条件はリンクに残す。1ページだけなら空 |

`attrs`・`queryString`（問題5）を使うと楽です。

```sh
$ node --test views.test.mjs
```

最初は 10 個すべてが失敗します。すべて通れば完成です。

---

## 発展

### 問題7 小さなテンプレートエンジンを作る

Jinja2 のごく一部を、[template.mjs](template.mjs) の `compile(source)` に作ってください。`compile` はテンプレートの文字を受け取り、「データを受け取って文字列を返す関数」を返します。

```js
const render = compile('<h1>{{ title }}</h1><ul>{% for t in tasks %}<li>{{ t.title }}</li>{% endfor %}</ul>');
render({ title: '一覧', tasks: [{ title: 'A & B' }] });   // '<h1>一覧</h1><ul><li>A &amp; B</li></ul>'
```

| 書き方 | 意味 |
| --- | --- |
| `{{ 名前 }}`、`{{ 名前.名前 }}` | 値をエスケープして出す。無い名前・`null`・`undefined`・`false` は何も出さない。名前に使えるのは英数字と `_`（数字で始まらない）、それを `.` でつないだものだけ |
| `{{ 名前 \| raw }}`、`\| upper`、`\| length` | フィルタ。`raw` はエスケープしない。`upper` は大文字に、`length` は長さに。いくつでもつなげる |
| `{% if 名前 %}…{% else %}…{% endif %}` | 空の配列も「偽」（Jinja2 と同じ） |
| `{% for x in 名前 %}…{% else %}…{% endfor %}` | `else` は配列が空のとき。中では `loop.index`（1から）・`loop.first`・`loop.last` が使える。内側の名前が、外側の同じ名前より優先 |
| `{# … #}` | コメント。何も出さない |

- 名前は、データの**自分のキー**（`Object.hasOwn`）だけをたどる。`{{ constructor }}` や `{{ user.toString }}` は何も出さない
- 書き方の誤り（閉じていない `{{`、対応しない `endif`・`endfor`、閉じていない `if`・`for`、知らないタグ・フィルタ、名前でないもの）は、`compile` の時点で `TemplateError` を投げる。`line` に行番号を入れる（閉じていないブロックは、開いた行）
- テンプレートの文字を `eval` や `new Function` で動かさない（本文6節）

`tokenize`（トークンに分ける）は、できています。「木にする」と「たどる」を書いてください。

```sh
$ node --test template.test.mjs
```

最初は 11 個のうち 10 個が失敗します。すべて通れば完成です。

### 問題8 読書メモのサイトの表示のバグを直す

[buggy-views.mjs](buggy-views.mjs) は、読書メモの一覧・検索・1件のページ・直すページを表示するサイトです（データは [notes-data.mjs](notes-data.mjs) の 23 件。保存はしません）。確認スクリプトを動かすと、25 個のうち 21 個が失敗します。

```sh
$ bash check-views.sh
```

| パス | 表示するもの |
| --- | --- |
| `GET /?q=…&page=…` | 一覧。`q` があれば、題名に `q` を含むものだけ（見出しは「「q」の検索結果（N件）」）。10件ずつ、ページ分けのリンクつき |
| `GET /notes/:id` | 1件。題名・メモ（無ければ「メモはありません」）・タグ・出典のリンク・`<script>` にメモの id と題名の JSON |
| `GET /notes/:id/edit` | 題名の入力欄と、メモの `<textarea>` |

ブラウザで開いて、崩れているところを探すのも良い練習です。そのときは、本文2節のとおり、ページのソースと DevTools の Elements を見比べてください。

直し方は自由です。問題5・6の関数と、第18章の Router を使って書き直してもかまいません（模範解答はそうしています）。
