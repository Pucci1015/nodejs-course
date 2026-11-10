# 第21章 HTML を生成する

ここまでのサーバは、HTML を `` `<p>${title}</p>` `` のように、文字列をつないで作ってきました。この章では、それをきちんとした「HTML の作り方」に育てます。
いちばん大事なのは**エスケープ**です。題名に `<` や `&` が入っているだけで、文字列をつないだページは崩れます。崩れないように、値を「HTML の文字」に直してから入れる。それを毎回、忘れずに、自動でするのがテンプレートの仕事です。
この章では、Flask の Jinja2 がしてくれていたことを、`html` という小さな関数（タグ付きテンプレート）と、小さなテンプレートエンジンを自分で作って確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第17章（`createApp`、`sendHtml`）、第18章（Router、`req.query`）、第2部 第5章（HTML の要素と属性）、第10章2.3節・3.1節（`escapeHtml`、`textContent`）、第3部 第11章（`...args`） |
| この章のゴール | エスケープの5文字と、属性の値を引用符で囲む理由を説明できる / 値を自動でエスケープする `html` タグを使い、二重のエスケープを避けられる / レイアウトと部品の関数でページを組み立てられる / テンプレートエンジンが「分ける → 木にする → たどる」で動くことを説明できる / URL・`<script>` の中など、場所によって入れ方が違うことを知る / CSP の役目を説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`escape.mjs`・`tag-demo.mjs`・`book-page.mjs`）と、文字列をつなぐと崩れる例、`html` タグ（`mini-html.mjs`）、レイアウト、`<script>` に JSON を渡す、CSP を確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（練習問題5・6の `html-helpers.mjs`・`views.mjs` は、成果物の掲示板でも使います） |

> **読み方**
> - この章のコマンドは、`~/dev/part04/ch21-html-templates/` で実行します（第17章で第4部のフォルダを `~/dev/part04` にコピーしてあります）。
>
>   ```sh
>   $ cd ~/dev/part04/ch21-html-templates
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 「手を動かす」のサーバは 9216 番を使います。止めるときは `Ctrl+C` です。
> - サンプルと練習問題の一部は、第17・18章の模範解答を `import` して使います。外部のパッケージは使わないので、`npm install` は不要です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 5つの文字のエスケープ（3節） | 第4部の成果物（掲示板の投稿を表示する）、第10部 第55章（XSS） |
| `html` タグと `SafeHtml`、部品の関数（4・5節） | 第4部の成果物。第8部の React の JSX も、値を自動でエスケープする |
| 場所によって入れ方が違う（3.3節・7節） | 第5部以降で、URL や `<script>` にデータを入れるとき |
| CSP（8節） | 第10部（安全） |

---

## 1. Flask がしてくれていたこと

Flask では、HTML を次のように返しました。

```python
@app.get('/tasks')
def tasks():
    return render_template('tasks.html', title='一覧', tasks=load_tasks())
```

```html
<!-- templates/tasks.html -->
{% extends "base.html" %}
{% block content %}
  <h1>{{ title }}</h1>
  <ul>
  {% for t in tasks %}
    <li>{{ t.title }}</li>
  {% endfor %}
  </ul>
{% endblock %}
```

まず、ここで何が起きていたのかを整理します。

- **Jinja2** は、Flask とは別のライブラリで、**テンプレートエンジン**と呼ばれるものです。「穴の空いた HTML（テンプレート）」と「データ」を受け取って、穴を埋めた HTML の文字列を作ります。`{{ … }}` が値を入れる穴、`{% … %}` が `for` や `if` などの命令です
- `render_template` は Flask の関数で、`templates/` フォルダからテンプレートのファイルを探し、Jinja2 に渡して、できた文字列を返します
- `{% extends "base.html" %}` は「外側は base.html を使う」という意味です。`<html>` や `<head>` のような、全部のページで共通の部分を1か所にまとめられます
- そして見えないところで、Jinja2 は `{{ t.title }}` の値を**エスケープ**していました。題名が `Tom & Jerry` なら、HTML には `Tom &amp; Jerry` と書きます。Flask は、名前が `.html` などで終わるテンプレートでは、これ（**autoescape**）を最初からオンにしています
- エスケープしたくないとき（自分で作った HTML を入れたいとき）は `{{ body | safe }}` と書きました

Node.js の `node:http` には、テンプレートエンジンは入っていません。この章では、エスケープと、レイアウト、`for`・`if` を、自分で作って確かめます。第5部以降で使うフレームワークやテンプレートエンジン（EJS、Nunjucks など）、第8部の React も、根っこは同じ考え方です。

## 2. 文字列をつなぐと、表示が崩れる

[samples/concat-demo.mjs](samples/concat-demo.mjs) は、本の題名の一覧を、文字列をつないで作ります。題名はどれもふつうのものですが、HTML で特別な意味を持つ文字が入っています。

```js
const books = [
  { title: 'HTML の <p> と <div> の違い', note: '"段落" と "まとまり"' },
  { title: 'Tom & Jerry の作り方', note: 'R&D の話' },
  { title: '1 < 2 は正しい', note: 'a > b のとき' },
];
// …
'<li title="' + b.note + '">' + b.title + '</li>'
```

```sh
$ node samples/concat-demo.mjs   # ブラウザで http://127.0.0.1:9210/ と /safe を見比べる（中身は読まなくてよい）
```

`/` を開くと、1冊目の題名の `<p>` と `<div>` は、文字としては表示されません。ブラウザは、それを**タグ**として読みます。DevTools の Elements を見ると、`<li>` の中に `<p>` と `<div>` の要素ができていて、題名が分かれてしまっているのが分かります。さらに、マウスを乗せたときに出る `title` 属性の説明は、最初の `"` のところで属性の値が終わってしまうので、説明は空になります（残りの `段落"` などは、別の属性の名前として読まれます）。

2冊目と3冊目は、たまたま正しく見えます。ブラウザが「`&` の後が文字の名前でなければ、そのまま `&`」「`<` の後が英字でなければ、そのまま `<`」と、大目に見てくれるからです。でも、これに頼ってはいけません。`1 <b 2` のように、たまたま英字が続けば、そこからタグになります。

`/safe` は、値をエスケープしてからつなぎます。すべて正しく表示されます。

> **ソースと Elements の違い**: `view-source:` で見えるのはサーバが送った文字そのもの、DevTools の Elements で見えるのは、ブラウザがそれを読んで作った要素の木（DOM）です。表示が崩れたときは、2つを見比べると原因が分かります。

### 2.1 これは見た目だけの問題ではない

題名が自分で書いたものなら、崩れても困るのは自分だけです。でも、掲示板のように**他の人が書いた文字**を表示するときは、話が変わります。その文字がタグとして読まれるということは、他の人が、こちらのページに好きな HTML を入れられるということです。HTML の中には `<script>` も入れられます。

この問題を **XSS**（クロスサイトスクリプティング）と呼びます。仕組みと、いろいろな守り方は第10部 第55章でくわしく扱います。この章で覚えておくことは1つです。**ページに入れる値は、すべてエスケープする。エスケープしないのは、自分で書いた HTML だと確かめたものだけ。**

## 3. エスケープの決まり

### 3.1 5つの文字

HTML の文字（要素の中身）と、引用符で囲んだ属性の値に入れるときは、次の5つを置き換えます。

| 文字 | 置き換え | 理由 |
| --- | --- | --- |
| `&` | `&amp;` | `&amp;` のような「文字参照」の始まり。**最初に**置き換える（後にすると、他の置き換えで作った `&` まで置き換えてしまう） |
| `<` | `&lt;` | タグの始まり |
| `>` | `&gt;` | タグの終わり。なくても困らないことが多いが、置き換えておく |
| `"` | `&quot;` | `"` で囲んだ属性の終わり |
| `'` | `&#39;` | `'` で囲んだ属性の終わり |

**手を動かす**: `escape.mjs` を作り、5つの文字を置き換える関数を確かめます。サーバは起動しません（完成形は [samples/escape.mjs](samples/escape.mjs)）。

```js
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

const titles = ['HTML の <p> と <div> の違い', 'Tom & Jerry の作り方', '"段落" と \'まとまり\''];
for (const t of titles) {
  console.log(escapeHtml(t));
}

console.log('1回 :', escapeHtml('a & b'));
console.log('2回 :', escapeHtml(escapeHtml('a & b')));
```

```sh
$ node escape.mjs
HTML の &lt;p&gt; と &lt;div&gt; の違い
Tom &amp; Jerry の作り方
&quot;段落&quot; と &#39;まとまり&#39;
1回 : a &amp; b
2回 : a &amp;amp; b
```

- `/[&<>"']/g` は「`&`・`<`・`>`・`"`・`'` のどれか1文字」を、文字列の全部から（`g`）探す正規表現です。`replace` の2つ目に関数を渡すと、見つかった文字 `c` ごとに呼ばれ、返した値で置き換えます。ここでは `ESC[c]` で、表から置き換える文字を引いています。
- 1回の `replace` で5つを置き換えるので、順番の心配がありません。
- 2回エスケープすると、`&amp;` の `&` がもう一度置き換えられて `&amp;amp;` になります。画面には `&amp;` と表示されてしまいます（**二重のエスケープ**。4.1節）。
- [samples/mini-html.mjs](samples/mini-html.mjs) の `escapeHtml` も、同じ書き方です。

### 3.2 属性の値は、必ず引用符で囲む

`<input value=${title}>` のように引用符を付けないと、題名に空白があるだけで、そこで値が終わります。`Tom & Jerry` なら値は `Tom` で、`&amp;` と `Jerry` は別の属性の名前として読まれます。エスケープは、**引用符で囲んだ**属性の値のためのものです。引用符が無いと、空白や `=` も特別な文字になり、5つでは足りません。

### 3.3 場所によって、入れ方が違う

5つの文字のエスケープで守れるのは、「要素の中身」と「引用符で囲んだ属性の値」の2か所だけです。それ以外の場所では、別の決まりがあります。

| 入れる場所 | すること | この章の道具 |
| --- | --- | --- |
| 要素の中身 `<p>…</p>`、属性の値 `title="…"` | 5つの文字をエスケープ | `escapeHtml`、`html` タグ |
| URL のクエリ `href="/s?q=…"` | まず URL 用にエンコード（`URLSearchParams`、`encodeURIComponent`）、その後に HTML のエスケープ | `queryString`（練習問題5） |
| リンク先そのもの `href="…"` に、他の人が書いた URL | 上に加えて、**scheme**（`https:` などの部分）を確かめる。`http:`・`https:`・`mailto:` と相対 URL だけを通す | `safeUrl`（練習問題5） |
| `<script>` の中 | HTML のエスケープは**効かない**。JSON にして、`<` などを `\u003c` にする | `jsonForScript`（7節、練習問題5） |
| `<style>` の中、`style="…"`、`on○○="…"` | 他の人が書いた値は**入れない**。決まった値から選ぶ（`class` を切り替えるなど） | — |

`<script>` の中で HTML のエスケープが効かないのは、ブラウザが `<script>` の中身を、HTML として読まないからです。`&lt;` は `&lt;` という4文字のまま JavaScript に渡されます（7節）。

## 4. 自動でエスケープする `html` タグ

`escapeHtml` を毎回呼ぶのは、忘れます。100か所のうち1か所でも忘れれば、そこで崩れます。Jinja2 の autoescape のように、「何もしなければエスケープされる」形にしたいところです。

JavaScript の**タグ付きテンプレート**を使うと、それができます。テンプレートリテラルの前に関数の名前を書くと、その関数が「書いた文字の部分」と「`${}` の値」を別々に受け取ります。

**手を動かす**: `tag-demo.mjs` を作り、タグ付きテンプレートの関数が何を受け取るかを確かめます。サーバは起動しません（完成形は [samples/tag-demo.mjs](samples/tag-demo.mjs)）。

```js
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

// 1. タグ付きテンプレートの関数は、何を受け取るか
function show(strings, ...values) {
  console.log(strings, values);
}
show`<p>${'Tom & Jerry'}</p><p>${42}</p>`;

// 2. 値だけをエスケープする
function esc(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += escapeHtml(values[i]) + strings[i + 1];
  }
  return out;
}
const title = 'Tom & <Jerry>';
console.log(esc`<p>${title}</p>`);

// 3. esc の結果を、もう一度 esc の中に入れると
const items = ['a & b', 'c'].map((t) => esc`<li>${t}</li>`).join('');
console.log(esc`<ul>${items}</ul>`);
```

```sh
$ node tag-demo.mjs
[ '<p>', '</p><p>', '</p>' ] [ 'Tom & Jerry', 42 ]
<p>Tom &amp; &lt;Jerry&gt;</p>
<ul>&lt;li&gt;a &amp;amp; b&lt;/li&gt;&lt;li&gt;c&lt;/li&gt;</ul>
```

- `` show`…` `` のように、テンプレートリテラルの前に関数の名前を書くと、関数が呼ばれます。`strings` には書いた文字の部分が、`values` には `${}` の値が、配列で入ります。`...values` は「残りの引数を全部、配列で受け取る」書き方です（第3部 第11章の `...args`）。
- `strings` は、いつも `values` より1つ多くなります。`esc` は「文字、値、文字、値、…、文字」の順につないでいます。
- 文字の部分は自分で書いたものなのでそのまま、値だけをエスケープすれば、「書いた HTML はそのまま、入れた値はエスケープ」になります。2行目がそれです。
- 3行目は崩れました。`esc` の結果（`<li>…</li>`）を、外側の `esc` がもう一度エスケープしたからです。これを防ぐのが、4.1節の `SafeHtml` です。

この `esc` に、二重のエスケープを防ぐ仕組みを足したものが、[samples/mini-html.mjs](samples/mini-html.mjs) の `html` です。

```js
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}
```

使い方は次のとおりです。

```js
import { html, raw } from './mini-html.mjs';

html`<p>${task.title}</p>`                                // 値はエスケープされる
html`<ul>${tasks.map((t) => html`<li>${t.title}</li>`)}</ul>`  // 配列はつなぐ
html`<p>${task.done ? html`<strong>完了</strong>` : null}</p>`    // null・undefined・false は何も出さない
html`<div>${raw(markdownToHtml(text))}</div>`             // 自分で確かめた HTML だけ raw で
```

### 4.1 二重のエスケープを防ぐ `SafeHtml`

`html` の結果を、別の `html` の中に入れることがよくあります（上の `map` の例）。そのとき、内側の結果をもう一度エスケープすると、`<li>` が `&lt;li&gt;` になり、`&amp;` が `&amp;amp;` になってしまいます。これを**二重のエスケープ**と呼びます。画面に `&amp;` という文字が見えたら、たいていこれです。

`html` は、結果を `SafeHtml` というクラスに包んで返します。`render` は、`SafeHtml` が来たらエスケープしません。「もうエスケープ済み」という印です。Jinja2 の `Markup`（`| safe` を付けたときの中身）が、同じ役目をしています。

印は、ふつうの文字列にすると消えます。`` html`<li>${t}</li>` `` の代わりに `` `<li>${t}</li>` ``（`html` を付け忘れ）と書くと、ただの文字列なので、外側の `html` が丸ごとエスケープします。`String(html`…`)` で一度文字列にしたものも同じです（練習問題4）。

### 4.2 `raw` は、確かめたものだけ

`raw` は、何でもエスケープせずに入れられる道具なので、使う場所は少ないほど安全です。Jinja2 の `| safe` と同じで、「この中身は、自分で作った（または確かめた）HTML だ」と言えるときだけ使います。他の人が書いた文字に `raw` を付けてはいけません。

## 5. 部品にして、ページを組み立てる

Jinja2 の `{% extends %}`（外側を共有する）や `{% include %}`・マクロ（小さな部品）は、JavaScript ではただの**関数**で書けます。

**手を動かす**: 本の一覧のページを返すサーバ `book-page.mjs` を作ります。`html` は `samples/mini-html.mjs` から読み込みます（完成形は [samples/book-page.mjs](samples/book-page.mjs)）。

```js
import http from 'node:http';
import { html } from './samples/mini-html.mjs';

const PORT = 9216;

const books = [
  { title: 'HTML の <p> と <div> の違い', note: '"段落" と "まとまり"', done: true },
  { title: 'Tom & Jerry の作り方', note: 'R&D の話', done: false },
  { title: '1 < 2 は正しい', note: 'a > b のとき', done: false },
];

// 全部のページで共通の外側
function layout({ title, body }) {
  return html`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${title} | 本棚</title>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}

// 1冊分の部品
function bookItem(book) {
  return html`<li title="${book.note}">${book.title}${book.done ? html` <strong>読了</strong>` : null}</li>`;
}

const server = http.createServer((req, res) => {
  if (req.url !== '/') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('見つかりません\n');
  }
  const page = layout({ title: '本棚', body: html`<ul>${books.map(bookItem)}</ul>` });
  const text = String(page);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
});

server.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));
```

```sh
$ node book-page.mjs
# 別のターミナルで
$ curl http://127.0.0.1:9216/
<!doctype html>
...
  <ul><li title="&quot;段落&quot; と &quot;まとまり&quot;">HTML の &lt;p&gt; と &lt;div&gt; の違い <strong>読了</strong></li><li title="R&amp;D の話">Tom &amp; Jerry の作り方</li><li title="a &gt; b のとき">1 &lt; 2 は正しい</li></ul>
...
```

- ブラウザで http://127.0.0.1:9216/ を開くと、2節で崩れた題名と説明が、正しく表示されます。
- `import` のパスは、そのファイルから見た場所です。自分の `book-page.mjs` は `~/dev/part04/ch21-html-templates` にあるので `./samples/mini-html.mjs`、完成形の `samples/book-page.mjs` は `mini-html.mjs` と同じフォルダにあるので `./mini-html.mjs` と書いています。
- `layout` と `bookItem` が部品の関数です。`books.map(bookItem)` は `SafeHtml` の配列で、`html` がつないでくれます。
- `book.done ? … : null` で、読了のときだけ `<strong>` を出しています。`null` は何も出しません。
- `html` の結果は `SafeHtml` なので、返す前に `String(page)` で文字列にします。

同じ形で、タスクの一覧と1件のページを作ったのが [samples/layout-demo.mjs](samples/layout-demo.mjs) です（中身は読まなくてよい。第17・18章の `createApp`・`Router` を使っています）。

```sh
$ node samples/layout-demo.mjs   # ブラウザで http://127.0.0.1:9211/ と /tasks/3
```

関数なので、引数で受け取るものがはっきりし、テストも書けます（練習問題6）。`<meta charset="utf-8">` と `Content-Type: text/html; charset=utf-8` の両方を付けるのは、どちらか片方しか見ない場面（ファイルに保存して開いたときなど）があるからです。

| Jinja2 | この章 |
| --- | --- |
| `{% extends "base.html" %}` と `{% block %}` | `layout({ title, body })` という関数 |
| `{% include "item.html" %}`、マクロ | `taskItem(task)` のような関数 |
| `{% for t in tasks %}` | `tasks.map((t) => html`…`)` |
| `{% if t.done %}…{% endif %}` | `t.done ? html`…` : null` |
| `{{ x }}`（autoescape） | `${x}` |
| `{{ x \| safe }}`、`Markup` | `raw(x)`、`SafeHtml` |

## 6. テンプレートエンジンの中身

`html` タグは、HTML を JavaScript のファイルの中に書きます。テンプレートエンジンは、HTML を**別のファイル**に書き、そこに `{{ }}` や `{% %}` の命令を混ぜます。デザインを担当する人が JavaScript を読まずに HTML を直せる、という良さがあります。

テンプレートエンジンの多くは、次の3段で動きます（練習問題7で作ります）。

1. **分ける**（tokenize）: テンプレートの文字を、「ふつうの文字」「`{{ … }}`」「`{% … %}`」のかたまり（トークン）に分ける
2. **木にする**（parse）: `{% for %}` から `{% endfor %}` までを1つの枝にまとめるように、入れ子の構造（木）にする。`endfor` が足りない、のような書き方の誤りは、ここで見つかる
3. **たどる**（render）: データを受け取り、木をたどりながら文字をつないでいく。`{{ }}` の値は、ここでエスケープする

```
'<ul>{% for t in tasks %}<li>{{ t.title }}</li>{% endfor %}</ul>'
   ↓ 分ける
text '<ul>' / tag 'for t in tasks' / text '<li>' / output 't.title' / text '</li>' / tag 'endfor' / text '</ul>'
   ↓ 木にする
root ─ text '<ul>'
     ├ for (t in tasks) ─ text '<li>'
     │                   ├ output t.title
     │                   └ text '</li>'
     └ text '</ul>'
```

Jinja2 は、2 の木を、さらに Python のコードに直して（コンパイルして）から動かします。そのほうが速いからです。ただし、自分で作るときに、テンプレートの文字を `eval` や `new Function` で JavaScript として動かすのは、間違いのもとです。テンプレートの中の名前（`t.title`）は、決まった形（英字と `.`）だけを受け付け、データの中を自分でたどります。練習問題7の模範解答は、そうしています。たどるときは、`Object.hasOwn` で「そのオブジェクト自身のキー」だけを見ます。第20章7.2節で見たように、`constructor` や `__proto__` のような名前で、プロトタイプの先にあるものまで見えてしまわないようにするためです。

## 7. サーバのデータを `<script>` に渡す

ページの JavaScript に、サーバのデータ（ユーザーの名前、設定など）を渡したいことがあります。いちばん簡単なのは、`<script>` の中に JSON を書くことです。

```js
html`<script>const data = ${raw(JSON.stringify(data))};</script>`   // これでは足りない
```

[samples/json-script-demo.mjs](samples/json-script-demo.mjs) を動かしてください（中身は読まなくてよい。サーバは使わず、結果を表示するだけです）。

```sh
$ node samples/json-script-demo.mjs
```

題名が `</script> というタグの説明` だと、ブラウザは `<script>` の中身を、JavaScript として読む**前に**「`</script>` が来たら終わり」として切ってしまいます。JavaScript の文字列の途中でも関係ありません。残りの部分は、ふつうの HTML として読まれます。

`<script>` の中では、3.3節のとおり HTML のエスケープは効きません（`&lt;` は4文字のまま）。代わりに、JSON の中の `<` を `\u003c` と書きます。JavaScript の文字列の中の `\u003c` は `<` と同じ意味なので、値は変わりません。でも、ブラウザが探す `</script>` という並びは、もう出てきません。

| 置き換える文字 | 理由 |
| --- | --- |
| `<` → `\u003c` | `</script>` と `<!--` で、`<script>` の読み方が変わらないように |
| `>` → `\u003e`、`&` → `\u0026` | 念のため（XHTML として読まれたときなど） |
| U+2028・U+2029 → `\u2028`・`\u2029` | 「行の区切り」の文字。2019年より前の JavaScript では、文字列の中にそのまま書けなかった |

もう1つの方法は、JSON を **`data-` 属性**に入れて、ページの JavaScript で読むことです。属性の値なので、ふつうの HTML のエスケープで済みます。

```html
<div id="app" data-props="{&quot;title&quot;:&quot;&lt;/script&gt; というタグの説明&quot;}"></div>
<script src="/app.js"></script>
<!-- app.js: const props = JSON.parse(document.getElementById('app').dataset.props); -->
```

## 8. もう一枚の守り: Content-Security-Policy

エスケープを正しくしていても、どこか1か所の付け忘れは起きるものです。**CSP**（Content-Security-Policy）は、「このページで動かしてよい JavaScript はこれだけ」とブラウザに伝えるヘッダです。エスケープをすり抜けた `<script>` があっても、ブラウザが動かしません。

[samples/csp-demo.mjs](samples/csp-demo.mjs) は、リクエストごとに推測できない値（**nonce**）を作り、ヘッダと、自分で書いた `<script>` の両方に付けます。

```js
const nonce = crypto.randomBytes(16).toString('base64');
res.setHeader('Content-Security-Policy',
  `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`);
// ページ: <script nonce="${nonce}">…</script>
```

```sh
$ node samples/csp-demo.mjs   # ブラウザで http://127.0.0.1:9212/ を開き、DevTools の Console も見る（全体は読まなくてよい）
```

nonce の付いた `<script>` だけが動き、nonce の無い `<script>` は止められて、Console にそのことが表示されます（Chromium で確かめた）。

| 指定 | 意味 |
| --- | --- |
| `default-src 'self'` | 画像・CSS などは、同じサイトのものだけ |
| `script-src 'self' 'nonce-…'` | JavaScript は、同じサイトのファイルと、この nonce の付いた `<script>` だけ。`onclick="…"` のような属性の JavaScript も動かない |
| `object-src 'none'` | `<object>`・`<embed>`（古いプラグイン）は使わない |
| `base-uri 'none'` | `<base>` で、相対 URL の基準を変えさせない |

CSP は**二枚目**の守りです。エスケープの代わりにはなりません。ページの JavaScript をファイル（`/app.js`）に分け、`onclick="…"` を `addEventListener` に書き直しておくと、CSP を厳しくしやすくなります。

## 9. Flask との対応

| やりたいこと | Flask（Jinja2） | この章 |
| --- | --- | --- |
| HTML を返す | `render_template('x.html', **data)` | `sendHtml(res, 200, String(page(data)))` |
| 値を入れる（エスケープされる） | `{{ x }}` | `` html`…${x}…` `` |
| エスケープしない | `{{ x \| safe }}`、`Markup(x)` | `raw(x)`、`SafeHtml` |
| 外側を共有する | `{% extends %}`、`{% block %}` | `layout({ title, body })` |
| 部品 | `{% include %}`、マクロ | 関数 |
| 繰り返し・条件 | `{% for %}`、`{% if %}` | `map`、`? :` |
| `<script>` に JSON を渡す | `{{ data \| tojson }}` | `jsonForScript(data)`（練習問題5） |
| URL を作る | `url_for('tasks', page=2)` | `` `/tasks${queryString({ page: 2 })}` ``（練習問題5） |

Jinja2 の `tojson` フィルタも、`<` などを `\u003c` にしています。7節と同じことを、Flask はしてくれていたわけです。

## まとめ

- ページに入れる値は、すべてエスケープする。`& < > " '` の5つ。`&` を最初に。
- 属性の値は、必ず引用符で囲む。
- エスケープは、要素の中身と、引用符で囲んだ属性の値のためのもの。URL はエンコードと scheme の確かめ、`<script>` の中は JSON と `<`。`style` や `on○○` には、他の人の値を入れない。
- タグ付きテンプレートの `html` で、「何もしなければエスケープされる」形にする。`SafeHtml` の印で二重のエスケープを防ぐ。`raw` は確かめたものだけ。
- レイアウトや部品は関数にする。
- テンプレートエンジンは「分ける → 木にする → たどる」。テンプレートの文字を `eval` しない。
- CSP は二枚目の守り。nonce で、動かしてよい `<script>` を決める。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用2問・発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「テンプレートリテラル」（タグ付きテンプレート）: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Template_literals
- MDN「文字参照」: https://developer.mozilla.org/ja/docs/Glossary/Character_reference
- MDN「Content-Security-Policy」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy
- MDN「HTMLElement: dataset」: https://developer.mozilla.org/ja/docs/Web/API/HTMLElement/dataset
- WHATWG「HTML: The script element」（`<script>` の中身の読み方）: https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
- WHATWG「URL Standard」: https://url.spec.whatwg.org/
- OWASP「Cross Site Scripting Prevention Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- Jinja「Template Designer Documentation」: https://jinja.palletsprojects.com/en/stable/templates/
- Flask「Templates」（autoescape）: https://flask.palletsprojects.com/en/stable/templating/

前の章: [第20章 フォームと JSON を受け取る](../ch20-request-body/README.md) ／ 次の章: [第22章 Cookie とセッションを自作する](../ch22-cookie-session/README.md)
