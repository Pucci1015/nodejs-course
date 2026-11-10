# 第21章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [escape-html.mjs](escape-html.mjs) | 問題1: `escapeHtml`・`textToHtml` |
| [comment-list.mjs](comment-list.mjs) | 問題2: `commentItem`・`commentList` |
| [select-box.mjs](select-box.mjs) | 問題3: `selectBox` |
| [html-helpers.mjs](html-helpers.mjs) | 問題5: `attrs`・`safeUrl`・`jsonForScript`・`queryString` |
| [views.mjs](views.mjs) | 問題6: `layout`・`taskList`・`paginate`・`pagination` |
| [template.mjs](template.mjs) | 問題7: 小さなテンプレートエンジン `compile` |
| [views-server.mjs](views-server.mjs) | 問題8: 読書メモのサイトを、問題5・6の関数と第18章の Router で書き直したもの |

模範解答は、`~/dev/part04/ch21-html-templates/exercises` で次のように確かめられます。`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

```sh
$ MODULE=../solutions/escape-html.mjs node --test escape-html.test.mjs
$ MODULE=../solutions/comment-list.mjs node --test comment-list.test.mjs
$ MODULE=../solutions/select-box.mjs node --test select-box.test.mjs
$ MODULE=../solutions/html-helpers.mjs node --test html-helpers.test.mjs
$ MODULE=../solutions/views.mjs node --test views.test.mjs
$ MODULE=../solutions/template.mjs node --test template.test.mjs
$ bash check-views.sh ../solutions/views-server.mjs
```

---

## 問題1 5つの文字をエスケープする、改行を `<br>` にする

```js
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

export function textToHtml(text) {
  return escapeHtml(text).replaceAll('\n', '<br>\n');
}
```

- 1回の `replace` で5つを置き換えるので、`&` を先にするか後にするかの心配がありません。`replaceAll('&', '&amp;')` を5回並べる書き方では、`&` を最初にしないと、`&lt;` の `&` まで置き換えてしまいます。
- `String(null)` は `'null'` という文字になります。画面に「null」と出ないように、先に `''` を返します。
- `textToHtml` で `<br>` を入れるのは、自分で書いた HTML なのでエスケープしません。エスケープするのは、他の人が書いた `text` だけです。

## 問題2 コメントの一覧を `html` タグで作る

```js
import { html } from '../samples/mini-html.mjs';

export function commentItem(comment) {
  const cls = comment.starred ? 'comment starred' : 'comment';
  return html`<li class="${cls}"><b>${comment.name}</b>: ${comment.text}</li>`;
}

export function commentList(comments) {
  if (comments.length === 0) return html`<p class="empty">コメントはありません</p>`;
  return html`<ul class="comments">${comments.map(commentItem)}</ul>`;
}
```

- `comments.map(commentItem)` は `SafeHtml` の配列です。`html` は配列をつなぎ、`SafeHtml` はエスケープしないので、`<li>` はそのまま、名前と本文だけがエスケープされます。
- `` `<li>…</li>` `` と `html` を付け忘れると、テストの「二重にエスケープしない」が失敗します。
- 問題5の `attrs({ class: { comment: true, starred: c.starred } })` を使うと、`class` の切り替えをもっと短く書けます。

## 問題3 選ぶ欄（`<select>`）を `html` タグで作る

```js
import { html } from '../samples/mini-html.mjs';

export function selectBox(name, options, selected) {
  const items = options.map((o) => (o.value === selected
    ? html`<option value="${o.value}" selected>${o.label}</option>`
    : html`<option value="${o.value}">${o.label}</option>`));
  return html`<select name="${name}">${items}</select>`;
}
```

- `` html`<option ${o.value === selected ? 'selected' : ''}>` `` のように書くこともできます。`'selected'` は自分で書いた文字なので、エスケープされても変わりません。
- 検索のページでは、`selectBox('sort', SORTS, req.query.get('sort'))` のように、送られた値をそのまま `selected` に渡せます。選択肢に無い値なら、どれにも `selected` が付かないだけです。

## 問題4 `html` タグとエスケープの結果を予想する

```
 1: 1 &lt; 2 &amp; 3 &gt; 2
 2: &quot;引用&quot; と &#39;アポストロフィ&#39;
 3: &amp;amp;
 4: &amp;lt;
 5: <p>Tom &amp; Jerry</p>
 6: <p title="Tom &amp; Jerry">&quot;</p>
 7: <p>0</p>
 8: <ul><li>&lt;b&gt;</li><li>a&amp;b</li></ul>
 9: <ul>&lt;li&gt;&lt;b&gt;&lt;/li&gt;&lt;li&gt;a&amp;b&lt;/li&gt;</ul>
10: <p><b>Tom &amp; Jerry</b></p>
11: <p><b>太字</b></p>
12: <p>&lt;b&gt;Tom &amp;amp; Jerry&lt;/b&gt;</p>
13: <p>123</p>
14: <p>[object Object]</p>
15: <a href="/search?q=a b&amp;c">検索</a>
```

- **3番・4番**: エスケープは「文字をそのまま見せるための書き換え」なので、2回すると、1回目に作った `&` まで文字として見せることになります。画面には `&amp;` や `&lt;` という文字がそのまま表示されます。二重のエスケープを見つけたら、どこで2回しているかを探します
- **7番**: `null`・`undefined`・`false` は「何も出さない」ための値として決めました（`cond ? html`…` : null` や `cond && html`…`` のため）。`0` まで消すと、「残り 0 件」のような、本当に 0 を見せたい場面で困ります
- **9番**: `map` の中を `html` ではなくふつうのテンプレートリテラルで書いたので、`<li>` も「ただの文字」です。外側の `html` が丸ごとエスケープします。**12番**も同じで、`String()` で `SafeHtml` の印が消えています。8番・10番は、中身が `SafeHtml` なのでそのまま入ります
- **15番**: `&` は `&amp;` になったので、HTML としては正しく、ブラウザは `href` を `/search?q=a b&c` と読みます。でも URL としては `q=a b` と `c`（値なし）の2つに分かれるので、サーバの `req.query.get('q')` は `a b` しか受け取りません。クエリの値は、HTML のエスケープの前に、URL 用にエンコード（`encodeURIComponent` や `URLSearchParams`）します。問題5の `queryString` です
- **14番**: オブジェクトは `String()` すると `[object Object]` です。テンプレートに入れる前に、見せたい文字にしておきます

## 問題5 値を入れる場所ごとの道具

[html-helpers.mjs](html-helpers.mjs)

- `attrs` は、まず属性名を正規表現で確かめます。名前は値と違ってエスケープできない（`&quot;` を名前に入れても意味がない）ので、使える文字だけを許します
- `safeUrl` は「通してよいものを決める」書き方です。「`data:` と `file:` と……を止める」と、止めるものを並べる書き方にすると、知らない scheme がすり抜けます。前の空白・制御文字と途中のタブ・改行を取り除くのは、ブラウザ（WHATWG URL）が同じことをするからです。取り除かずに調べると、ブラウザとこちらで、別の URL を見ていることになります
- `jsonForScript` の置き換えは、`replace` の関数で `\u` と 4桁の16進数を作っています。`<` は `3c` なので `<` です
- `queryString` は、エンコードを `URLSearchParams` に任せます。空白は `+`、`&` は `%26`、`=` は `%3D` です。`encodeURIComponent` は空白を `%20` にしますが、どちらもサーバでは空白に戻ります（第18章）

## 問題6 一覧のページを、部品の関数で組み立てる

[views.mjs](views.mjs)

- `taskList` の `map` の中も `html` タグにします（問題4の9番）。`class` は `attrs({ class: { task: true, done: t.done } })` で切り替えています
- `paginate` のよくある間違いは3つです。ページの数を `Math.floor` で数える（端数のページが消える）、`page * perPage` から切り出す（1 から数えるなら `(page - 1) * perPage`）、クエリから来た `'2'` と数の `2` を比べる。`Number.isInteger(Number(page))` で整数か確かめ、`Math.min`・`Math.max` で範囲に収めています
- `pagination` は `queryString({ ...query, page: n })` でリンクを作ります。`q` が `null` なら、`queryString` が省きます。`&` は `html` タグが `&amp;` にするので、自分では何もしません

## 問題7 小さなテンプレートエンジンを作る

[template.mjs](template.mjs)

- **木にする**（`parse`）: スタックを使います。`if`・`for` が来たら新しい枝を作ってスタックに積み、`else` が来たら「今の枝の else 側に入れる」印を付け、`endif`・`endfor` が来たらスタックから外します。最後にスタックに何か残っていたら、閉じていないブロックです
- **たどる**（`renderNodes`）: `for` の中では、`{ [変数名]: 値, loop }` という新しい「名前の置き場」をスコープの配列の最後に足して、中を描きます。名前を探すときは、配列の後ろ（内側）から探します。これで、内側の名前が外側より優先されます
- `lookup` は `Object.hasOwn` で、自分のキーだけをたどります。`Object(value)` としているのは、文字列や数（`'abc'.length`）でも `Object.hasOwn` が使えるようにするためです
- テンプレートの文字は、どこでも JavaScript として動かしていません。名前は `PATH` の正規表現で形を確かめてから `split('.')` し、フィルタは `FILTERS` に登録したものだけを使います

## 問題8 読書メモのサイトの表示のバグを直す

[views-server.mjs](views-server.mjs)

| 確認 | 原因 | 直し方 |
| --- | --- | --- |
| 1 | `Content-Type: text/html` に charset が無い | 第17章の `sendHtml`（`charset=utf-8` を付ける） |
| 2, 3, 17 | 一覧の題名、メモをエスケープしていない | すべて `html` タグで組み立てる |
| 5〜10 | ページの数を `Math.floor` で数え、切り出す位置が 1 ずれ、`page` を確かめていない | 問題6の `paginate` |
| 8, 13 | ページのリンクに、最後のページが無く、`q` をエンコードしていない | 問題6の `pagination`（`queryString`） |
| 11 | 見出しの検索の言葉をエスケープしていない（入力欄の `value` はしていた） | `html` タグ。「ある場所ではしている」が、いちばん見落としやすい |
| 14 | 題名を `esc` した変数を、もう一度 `esc` している | `html` タグに任せ、自分では `esc` しない |
| 15, 16 | メモが `null` のとき、`${note.memo}` が `null` と出る | `null` を確かめて「メモはありません」 |
| 19 | 出典の URL の scheme を確かめていない | `safeUrl` |
| 20 | `JSON.stringify` だけを `<script>` に入れている | `jsonForScript` |
| 21, 22 | 無い id で `note` が `undefined` になり、`note.title` で落ちる（サーバが止まる） | `findNote` で `HttpError(404)` |
| 23 | `value=${…}` に引用符が無い | `value="${…}"` |
| 24 | `<textarea>` の中身をエスケープしていない | `html` タグ |

`<textarea>` の中身は、ブラウザが `</textarea>` を探すまで、タグを読まずに文字として扱います。だから `<b>` のようなタグはそのまま文字で表示されますが、`</textarea>` という文字が来ると、そこで終わってしまいます。`&lt;` などの文字参照は読まれるので、エスケープしておけば、入力欄には元の文字が入ります（Chromium で確かめた）。
