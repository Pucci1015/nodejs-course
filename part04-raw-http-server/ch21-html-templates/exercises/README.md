# 第21章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | `html` タグとエスケープの結果を予想する | [predict-html.mjs](predict-html.mjs) | 3, 4 | — |
| 2 | 属性・URL・`<script>` の中・クエリ文字列に値を入れる道具 | [html-helpers.mjs](html-helpers.mjs)、[html-helpers.test.mjs](html-helpers.test.mjs) | 3, 7 | — |
| 3 | 一覧のページを部品の関数で組み立てる（ページ分けつき） | [views.mjs](views.mjs)、[views.test.mjs](views.test.mjs) | 4, 5 | — |
| 4 | 小さなテンプレートエンジンを作る | [template.mjs](template.mjs)、[template.test.mjs](template.test.mjs) | 6 | — |
| 5 | 読書メモのサイトの表示のバグを直す | [buggy-views.mjs](buggy-views.mjs)、[notes-data.mjs](notes-data.mjs)、[check-views.sh](check-views.sh) | 2〜7 | 9215 |

- 問題2・3・4は `node --test ○○.test.mjs` ですべてのテストが通れば完成です
- 問題5は `bash check-views.sh` で確かめます。模範解答は、問題2・3の解答と、第17・18章の模範解答を使います

---

## 問題1 `html` タグとエスケープの結果を予想する

[predict-html.mjs](predict-html.mjs) に 15 個の式があります。[../samples/mini-html.mjs](../samples/mini-html.mjs) を読んでから、**実行する前に**結果を予想して書き出し、`node predict-html.mjs` で確かめてください。

特に、次の4つは理由を説明してください。

- 3番と4番: エスケープを2回すると、何が起きるか。画面にはどう表示されるか
- 7番: `0` だけが表示されるのはなぜか。`0` も出さないようにすると、何が困るか
- 9番と12番: 8番・10番と、どこが違うのか
- 15番: HTML としては正しいが、URL としては困ることがある。何が困るか（ヒント: サーバの `req.query.get('q')` は何を受け取るか）

## 問題2 値を入れる場所ごとの道具

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

**`jsonForScript(value)`**: `<script>` の中に入れる JSON（本文7節）。`<`・`>`・`&`・U+2028・U+2029 を `<` のような形にする。結果は `SafeHtml`（`html` タグに入れても、もう一度エスケープされない）。`undefined` は `null` にする。

**`queryString(params)`**: `{ q: 'a b', page: 2 }` → `'?q=a+b&page=2'`。URL 用にエンコードする。`null`・`undefined` の値は入れない。何も残らなければ `''`。

```sh
$ node --test html-helpers.test.mjs
```

最初は 13 個のうち 10 個が失敗します。すべて通れば完成です。

## 問題3 一覧のページを、部品の関数で組み立てる

タスクの一覧のページを作るつもりで、[views.mjs](views.mjs) に4つの関数を作ってください。どれも `html` タグを使って書き直します（いまは文字列をつないでいて、ページ分けもずれています）。

| 関数 | 返すもの |
| --- | --- |
| `layout({ title, body, flash })` | ページ全体。`<html lang="ja">`、`<meta charset="utf-8">`、`<title>題名 \| タスク</title>`。`flash`（「保存しました」のような知らせ）は、あるときだけ `<p class="flash">` で出す |
| `taskList(tasks)` | `<ul class="tasks">` と、1件ずつ `<li class="task">`（完了なら `class="task done"`）と題名のリンク `/tasks/id`。0件なら `<p class="empty">タスクはありません</p>` |
| `paginate(all, { page, perPage })` | `{ items, page, pages, total, hasPrev, hasNext }`。`page` は 1 から。数でない・範囲の外の `page` は、いちばん近いページにする。`'2'` のような文字列も受け取る（クエリから来るので）。`pages` は 0件でも 1 |
| `pagination({ page, pages, baseUrl, query })` | `<nav class="pagination">`。前のページ（`rel="prev"`、「前へ」）、ページの番号（今のページは `<span aria-current="page">`）、次のページ（`rel="next"`、「次へ」）。`query` の条件はリンクに残す。1ページだけなら空 |

`attrs`・`queryString`（問題2）を使うと楽です。

```sh
$ node --test views.test.mjs
```

最初は 10 個すべてが失敗します。すべて通れば完成です。

## 問題4 小さなテンプレートエンジンを作る

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

## 問題5 読書メモのサイトの表示のバグを直す

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

直し方は自由です。問題2・3の関数と、第18章の Router を使って書き直してもかまいません（模範解答はそうしています）。
