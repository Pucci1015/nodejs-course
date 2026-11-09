# 第21章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [html-helpers.mjs](html-helpers.mjs) | 問題2: `attrs`・`safeUrl`・`jsonForScript`・`queryString` |
| [views.mjs](views.mjs) | 問題3: `layout`・`taskList`・`paginate`・`pagination` |
| [template.mjs](template.mjs) | 問題4: 小さなテンプレートエンジン `compile` |
| [views-server.mjs](views-server.mjs) | 問題5: 読書メモのサイトを、問題2・3の関数と第18章の Router で書き直したもの |

模範解答は、`exercises` フォルダで次のように確かめられます。

```sh
$ cd ../exercises
$ MODULE=../solutions/html-helpers.mjs node --test html-helpers.test.mjs
$ MODULE=../solutions/views.mjs node --test views.test.mjs
$ MODULE=../solutions/template.mjs node --test template.test.mjs
$ bash check-views.sh ../solutions/views-server.mjs
```

---

## 問題1 `html` タグとエスケープの結果を予想する

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
- **15番**: `&` は `&amp;` になったので、HTML としては正しく、ブラウザは `href` を `/search?q=a b&c` と読みます。でも URL としては `q=a b` と `c`（値なし）の2つに分かれるので、サーバの `req.query.get('q')` は `a b` しか受け取りません。クエリの値は、HTML のエスケープの前に、URL 用にエンコード（`encodeURIComponent` や `URLSearchParams`）します。問題2の `queryString` です
- **14番**: オブジェクトは `String()` すると `[object Object]` です。テンプレートに入れる前に、見せたい文字にしておきます

## 問題2 値を入れる場所ごとの道具

[html-helpers.mjs](html-helpers.mjs)

- `attrs` は、まず属性名を正規表現で確かめます。名前は値と違ってエスケープできない（`&quot;` を名前に入れても意味がない）ので、使える文字だけを許します
- `safeUrl` は「通してよいものを決める」書き方です。「`data:` と `file:` と……を止める」と、止めるものを並べる書き方にすると、知らない scheme がすり抜けます。前の空白・制御文字と途中のタブ・改行を取り除くのは、ブラウザ（WHATWG URL）が同じことをするからです。取り除かずに調べると、ブラウザとこちらで、別の URL を見ていることになります
- `jsonForScript` の置き換えは、`replace` の関数で `\u` と 4桁の16進数を作っています。`<` は `3c` なので `<` です
- `queryString` は、エンコードを `URLSearchParams` に任せます。空白は `+`、`&` は `%26`、`=` は `%3D` です。`encodeURIComponent` は空白を `%20` にしますが、どちらもサーバでは空白に戻ります（第18章）

## 問題3 一覧のページを、部品の関数で組み立てる

[views.mjs](views.mjs)

- `taskList` の `map` の中も `html` タグにします（問題1の9番）。`class` は `attrs({ class: { task: true, done: t.done } })` で切り替えています
- `paginate` のよくある間違いは3つです。ページの数を `Math.floor` で数える（端数のページが消える）、`page * perPage` から切り出す（1 から数えるなら `(page - 1) * perPage`）、クエリから来た `'2'` と数の `2` を比べる。`Number.isInteger(Number(page))` で整数か確かめ、`Math.min`・`Math.max` で範囲に収めています
- `pagination` は `queryString({ ...query, page: n })` でリンクを作ります。`q` が `null` なら、`queryString` が省きます。`&` は `html` タグが `&amp;` にするので、自分では何もしません

## 問題4 小さなテンプレートエンジンを作る

[template.mjs](template.mjs)

- **木にする**（`parse`）: スタックを使います。`if`・`for` が来たら新しい枝を作ってスタックに積み、`else` が来たら「今の枝の else 側に入れる」印を付け、`endif`・`endfor` が来たらスタックから外します。最後にスタックに何か残っていたら、閉じていないブロックです
- **たどる**（`renderNodes`）: `for` の中では、`{ [変数名]: 値, loop }` という新しい「名前の置き場」をスコープの配列の最後に足して、中を描きます。名前を探すときは、配列の後ろ（内側）から探します。これで、内側の名前が外側より優先されます
- `lookup` は `Object.hasOwn` で、自分のキーだけをたどります。`Object(value)` としているのは、文字列や数（`'abc'.length`）でも `Object.hasOwn` が使えるようにするためです
- テンプレートの文字は、どこでも JavaScript として動かしていません。名前は `PATH` の正規表現で形を確かめてから `split('.')` し、フィルタは `FILTERS` に登録したものだけを使います

## 問題5 読書メモのサイトの表示のバグを直す

[views-server.mjs](views-server.mjs)

| 確認 | 原因 | 直し方 |
| --- | --- | --- |
| 1 | `Content-Type: text/html` に charset が無い | 第17章の `sendHtml`（`charset=utf-8` を付ける） |
| 2, 3, 17 | 一覧の題名、メモをエスケープしていない | すべて `html` タグで組み立てる |
| 5〜10 | ページの数を `Math.floor` で数え、切り出す位置が 1 ずれ、`page` を確かめていない | 問題3の `paginate` |
| 8, 13 | ページのリンクに、最後のページが無く、`q` をエンコードしていない | 問題3の `pagination`（`queryString`） |
| 11 | 見出しの検索の言葉をエスケープしていない（入力欄の `value` はしていた） | `html` タグ。「ある場所ではしている」が、いちばん見落としやすい |
| 14 | 題名を `esc` した変数を、もう一度 `esc` している | `html` タグに任せ、自分では `esc` しない |
| 15, 16 | メモが `null` のとき、`${note.memo}` が `null` と出る | `null` を確かめて「メモはありません」 |
| 19 | 出典の URL の scheme を確かめていない | `safeUrl` |
| 20 | `JSON.stringify` だけを `<script>` に入れている | `jsonForScript` |
| 21, 22 | 無い id で `note` が `undefined` になり、`note.title` で落ちる（サーバが止まる） | `findNote` で `HttpError(404)` |
| 23 | `value=${…}` に引用符が無い | `value="${…}"` |
| 24 | `<textarea>` の中身をエスケープしていない | `html` タグ |

`<textarea>` の中身は、ブラウザが `</textarea>` を探すまで、タグを読まずに文字として扱います。だから `<b>` のようなタグはそのまま文字で表示されますが、`</textarea>` という文字が来ると、そこで終わってしまいます。`&lt;` などの文字参照は読まれるので、エスケープしておけば、入力欄には元の文字が入ります（Chromium で確かめた）。
