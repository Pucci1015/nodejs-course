# 第10章 Web アプリの構成パターン

第5〜9章で、ネットワーク、HTTP、HTTPS、ブラウザを1つずつ見てきました。この章では、それらを組み合わせて**Web アプリ全体がどういう形をしているか**を考えます。
同じ「メモ帳」を、サーバが HTML を作る **MPA** と、ブラウザの JavaScript が画面を作る **SPA** の2通りで**自分で書いて**比べ、SSR・CSR・SSG、REST、安全なメソッドと冪等性、PRG パターンといった、設計の言葉を身につけます。最後に、今まで書いてきた Flask のアプリを、この部で学んだ言葉で説明し直します。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第6〜9章（`http.createServer`、`req.on('data')`、ステータス、リダイレクト、Cookie、`fetch`、`textContent`、CORS） |
| この章のゴール | MPA と SPA を小さく書き、違いを通信の様子から説明できる / HTML のエスケープができる / PRG パターンでフォームの二重送信を防げる / SSR・CSR・SSG を場面に合わせて選べる / REST の考え方で API を設計できる / 安全・冪等の意味を知り、POST の送り直しを安全にできる / Flask のアプリを HTTP の言葉で説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形、もう少し大きな MPA 版と SPA 版のタスク管理、SSG 版のページを書き出すスクリプト |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 実習は `~/dev/ch10/` で行います（教材のフォルダは見本として残しておくため）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします（やり方は第5章の「読み方」と同じです）。
>
>   ```sh
>   $ mkdir -p ~/dev/ch10 && cd ~/dev/ch10
>   $ cp -R （ここに Finder から ch10-web-architecture の samples と exercises をドラッグ） .
>   ```
>
> - この章のコマンドは、すべて `~/dev/ch10/` で実行します。ブラウザは Chrome を使い、DevTools（`⌘ + ⌥ + I`）の Network タブを開いて確かめます。
> - 「**手を動かす**」の所は、実際に打って動かしてください。完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして様子を見るだけで十分です。
> - サーバを止めるときは、そのターミナルで `Ctrl + C` を押します。プログラムを書き換えたら、止めてから起動し直します（起動し直すと、メモは最初の状態に戻ります）。
> - ブラウザでの通信の様子は、この教材の作成時に Chromium（Chrome の元になっているブラウザ）で確かめたものです。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| MPA を書く（2節。フォーム、`URLSearchParams`、`303`） | 第4部でフレームワークなしのサーバを作るとき。第5部の Express でフォームを受け取るとき |
| HTML のエスケープ（2.3節） | 第4部 第21章のテンプレート、第10部 第55章の XSS 対策 |
| SPA を書く（3節。`fetch`、`createElement`、`preventDefault`） | 第8部の React（同じことをライブラリがしてくれる） |
| SSR・CSR・SSG（4節） | 第8部の Next.js でページごとに方式を選ぶとき |
| REST の慣習（5節） | 第5部 第25章で API を設計するとき |
| 安全と冪等（6節）、冪等キー（練習問題8） | 第4部 第22章・第10部の CSRF 対策、第6部でデータベースに保存するとき |
| PRG パターン（7節） | 第4部・第5部でフォームを受け取るすべての画面 |

---

## 1. Web アプリの登場人物

小さな Web アプリでも、実際に動いているときには、次のような部品が関わっています。

```
 ブラウザ（HTML・CSS・JS を受け取って画面を作る）
   │  ① ホスト名の IP アドレスを問い合わせる ──→ DNS
   │
   │  ② HTTPS
   ▼
 CDN（画像・CSS・JS などのキャッシュ。無いものは奥へ取りに行く）
   │
   ▼
 リバースプロキシ（nginx など。TLS を終わらせる、静的ファイルを配る）
   │  HTTP
   ▼
 アプリのサーバ（Node.js、Flask。あなたが書くところ）
   │
   ▼
 データベース
```

| 部品 | 役割 | この教材で扱う場所 |
| --- | --- | --- |
| ブラウザ | HTML・CSS・JavaScript を受け取り、画面を作る。Cookie を保存する | 第9章、第8部 |
| DNS | ホスト名から IP アドレスを調べる | 第5章 |
| CDN | 世界中に置いたサーバで、静的ファイル（画像、CSS、JS）をキャッシュして配る | 第7章5節、第12部 |
| リバースプロキシ | 外からの接続を受け、TLS を終わらせて（復号して）、後ろのアプリに渡す。静的ファイルを配ることも多い | 第12部 |
| アプリのサーバ | リクエストを受けて、処理をして、レスポンスを作る。**あなたが書くのはここ** | 第4〜5部 |
| データベース | データを保存する | 第6部 |

Flask の開発用サーバ（`flask run`）や、この章で書く Node.js のプログラムは、1つのプログラムが「リバースプロキシ」と「アプリのサーバ」の両方を兼ねている、いちばん小さな形です。本番では、Flask を gunicorn で動かし、前に nginx を置いたように、役割を分けるのが普通です。

> 「サーバ」という言葉は、**コンピュータ**（「サーバを借りる」）と**プログラム**（「Web サーバを起動する」）の両方の意味で使われます。この教材では、主にプログラムの意味で使います。

## 2. MPA（マルチページアプリケーション）

**MPA**（Multi-Page Application）は、画面ごとに URL があり、**サーバがその画面の HTML を丸ごと作って返す**方式です。Flask で `render_template` を使っていたアプリは、MPA です。いちばん小さな MPA の「メモ帳」を書いてみます。

### 2.1 一覧を表示する

**手を動かす**: `~/dev/ch10/mini-mpa.mjs` を作ります（完成形は [samples/mini-mpa.mjs](samples/mini-mpa.mjs)）。まずは一覧を表示するだけです。

```js
import http from 'node:http';

const memos = ['牛乳を買う'];

// 一覧のページの HTML を作る
function page() {
  let items = '';
  for (const memo of memos) {
    items += `<li>${memo}</li>\n`;
  }
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>メモ（MPA）</title></head>
<body>
<h1>メモ（MPA）</h1>
<form method="post" action="/memos">
  <input name="text">
  <button>追加</button>
</form>
<ul>
${items}</ul>
</body>
</html>
`;
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('見つかりません\n');
});

server.listen(8505, () => console.log('MPA のメモ: http://localhost:8505/'));
```

```sh
$ node mini-mpa.mjs
MPA のメモ: http://localhost:8505/
```

Chrome で http://localhost:8505/ を開くと、「牛乳を買う」が表示されます。入力欄に「パン」と入れて「追加」を押してみてください。「見つかりません」と表示され、ターミナルに次の行が出ます。

```
GET /
POST /memos
```

`<form method="post" action="/memos">` は、「ボタンが押されたら、入力欄の中身を `POST /memos` で送る」という意味です。ブラウザは、`name` を付けた入力欄の値を `text=パン` のような形（`application/x-www-form-urlencoded`。第6章）にしてボディに入れます。サーバがまだ `POST /memos` を受け取っていないので、404 になりました。

> ターミナルに `GET /favicon.ico` も出ることがあります。ブラウザが、タブに表示するアイコンを取りに来ているだけなので、気にしなくて構いません。

### 2.2 フォームを受け取って、303 で一覧に戻す

**手を動かす**: `mini-mpa.mjs` の `res.writeHead(404, ...)` の前に、次を足します。`Ctrl + C` で止めて、起動し直してください。

```js
  if (req.method === 'POST' && req.url === '/memos') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const text = new URLSearchParams(body).get('text');
      memos.push(text);
      // PRG: 結果の HTML を直接返さず、一覧へ 303 でリダイレクトする
      res.writeHead(303, { Location: '/' });
      res.end();
    });
    return;
  }
```

| 書いたもの | 意味 |
| --- | --- |
| `req.on('data')`、`req.on('end')` | ボディを少しずつ受け取り、全部届いたら処理する（第6章） |
| `new URLSearchParams(body).get('text')` | `text=%E3%83%91%E3%83%B3` のようなボディを読み、`text` の値（`パン`）を取り出す。パーセントエンコードも元に戻してくれる（第9章1節） |
| `res.writeHead(303, { Location: '/' })` | 「結果は `/` を GET して見て」というリダイレクト（第7章4節） |

もう一度「パン」を追加すると、今度は一覧に「パン」が増えます。ターミナルには次の2行が出ます。

```
POST /memos
GET /
```

```
ブラウザ → サーバ:  POST /memos   ボディ: text=パン    … サーバが保存する
サーバ → ブラウザ:  303 See Other   Location: /
ブラウザ → サーバ:  GET /                              … ブラウザが自動で送る
サーバ → ブラウザ:  200（新しい一覧の HTML 全体）
```

curl でも、ブラウザと同じことができます。`-d 'データ'` はボディを付けて POST する、`-i` はレスポンスのヘッダも表示する、という意味です（第6章）。

```sh
$ curl -si -d 'text=りんご' http://localhost:8505/memos
HTTP/1.1 303 See Other
Location: /
...
```

ブラウザを再読み込みすると「りんご」も表示されます。メモは**サーバ**にあるからです。

JavaScript を1行も使っていないのに、追加ができました。MPA は、ブラウザが標準で持っている2つの仕組みだけで成り立っています。

- **リンク**（`<a href>`）: クリックすると、その URL を `GET` する
- **フォーム**（`<form method="post">`）: 送信すると、入力した値をボディにして `POST` する

### 2.3 エスケープ

**手を動かす**: 入力欄に `<b>太字</b>` と入れて追加してください。一覧に、**太字の「太字」**が表示されます。

サーバは、入力された文字をそのまま HTML に入れました。ブラウザは `<b>` を「太字にせよ」という**タグ**として読んだのです。`<b>` なら害はありませんが、よその人が書いた文字に `<script>` のようなタグが入っていると、そのページを見た人のブラウザでプログラムが動いてしまいます（**XSS**。第4部 第21章、第10部 第55章）。

HTML の中で特別な意味を持つ文字を、「文字として表示される書き方」に置き換えます。これを**エスケープ**といいます。

| 文字 | 置き換え後 |
| --- | --- |
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;`（`value="..."` のような属性の中に入れるとき） |

**手を動かす**: `mini-mpa.mjs` の `page` 関数の前に `escapeHtml` を足し、`<li>` の所で使います。

```js
// HTML の中で特別な意味を持つ文字を、文字として表示される形に置き換える
function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
```

```js
    items += `<li>${escapeHtml(memo)}</li>\n`;
```

`文字列.replaceAll(A, B)` は、文字列の中の A を**すべて** B に置き換えた、新しい文字列を返します。`.` でつなげて、4回続けて置き換えています。`&` を最初に置き換えるのは、後で作った `&lt;` の `&` を、もう一度 `&amp;` にしてしまわないためです。

起動し直して、もう一度 `<b>太字</b>` を追加すると、今度は `<b>太字</b>` という文字がそのまま表示されます。ページのソース（`⌘ + ⌥ + U`）を見ると、`<li>&lt;b&gt;太字&lt;/b&gt;</li>` になっています。

### 2.4 もう少し大きな MPA と、MPA の特徴

[samples/todo-mpa.mjs](samples/todo-mpa.mjs) は、同じ作りで、追加・完了・削除・1件の画面がある「タスク管理」です（**中身は読まなくてよい**）。

```sh
$ node samples/todo-mpa.mjs
MPA 版: http://localhost:8500/
```

http://localhost:8500/ を開いて、DevTools の Network タブを見ながら操作してみてください。これも JavaScript を使っていません。タイトルを空にして追加すると、リダイレクトせずに `422` とエラーの文を付けたページが返ります（7.2節）。

MPA の特徴をまとめます。

- 画面を切り替えるたびに、HTML 全体を受け取って**描き直す**（画面が一瞬白くなることがある）
- **ブラウザの機能がそのまま使える**: 戻るボタン、再読み込み、URL のブックマーク、新しいタブで開く、JavaScript が無効でも動く、検索エンジンが内容を読める
- 状態（データ）は**サーバにだけ**ある。画面は、その状態をそのつど HTML にしたもの
- サーバで HTML を作るときに、**エスケープ**を忘れると XSS になる

## 3. SPA（シングルページアプリケーション）

**SPA**（Single-Page Application）は、最初に**ほとんど空の HTML と JavaScript**を受け取り、その後は **JavaScript が API から JSON を取ってきて、画面を組み立てる**方式です。React などで作る画面の多くは SPA です（第8部）。同じメモ帳を、SPA で書いてみます。

### 3.1 JavaScript で画面を作る

**手を動かす**: `~/dev/ch10/mini-spa.mjs` を作ります（完成形は [samples/mini-spa.mjs](samples/mini-spa.mjs)）。サーバのプログラムの中に、ブラウザに渡す HTML を文字列で書いています。`<script type="module">` の中は、**ブラウザで**動く JavaScript です。

```js
import http from 'node:http';

const memos = ['牛乳を買う'];

// ブラウザに渡す HTML。<script type="module"> の中は、ブラウザで動く JavaScript
const html = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>メモ（SPA）</title></head>
<body>
<h1>メモ（SPA）</h1>
<form id="form">
  <input id="text">
  <button>追加</button>
</form>
<ul id="list"><li>読み込み中…</li></ul>
<script type="module">
  const list = document.querySelector('#list');
  const input = document.querySelector('#text');

  // API から一覧を取ってきて、<ul> の中を作り直す
  async function render() {
    const res = await fetch('/api/memos');
    const memos = await res.json();
    list.textContent = '';
    for (const memo of memos) {
      const li = document.createElement('li');
      li.textContent = memo;
      list.append(li);
    }
  }

  document.querySelector('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.value }),
    });
    input.value = '';
    await render();
  });

  render();
</script>
</body>
</html>
`;

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/memos') {
    sendJson(res, 200, memos);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/memos') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const data = JSON.parse(body);
      memos.push(data.text);
      sendJson(res, 201, { text: data.text });
    });
    return;
  }

  sendJson(res, 404, { error: '見つかりません' });
});

server.listen(8506, () => console.log('SPA のメモ: http://localhost:8506/'));
```

ブラウザ側の JavaScript で、初めて出てきたものを説明します。

| 書いたもの | 意味 |
| --- | --- |
| `document.querySelector('#list')` | `id="list"` の要素を探す（第9章5節） |
| `await fetch(URL)`、`await res.json()` | API に GET を送り、返ってきた JSON を読む（第9章5節） |
| `list.textContent = ''` | `<ul>` の中身を空にする |
| `document.createElement('li')` | 新しい `<li>` 要素を作る（まだ画面には無い） |
| `li.textContent = memo` | `<li>` の中に、文字として入れる。**タグとして読まれないので、エスケープが要らない** |
| `list.append(li)` | 作った `<li>` を `<ul>` の最後に加える。ここで画面に表示される |
| `addEventListener('submit', ...)` | フォームが送信されそうになったときに、関数を呼ぶ |
| `e.preventDefault()` | ブラウザがいつもする動き（フォームを送ってページを移る）を止める。代わりに自分で `fetch` する |
| `JSON.stringify({ text: ... })` | オブジェクトを JSON の文字列にする。サーバ側は `JSON.parse` で元に戻す |

```sh
$ node mini-spa.mjs
SPA のメモ: http://localhost:8506/
```

http://localhost:8506/ を開き、Network タブを見ながら「パン」を追加してください。MPA と違って、**ページは読み込み直されません**。

```
ブラウザ → サーバ:  GET /             → 200 HTML（メモは入っていない）
ブラウザ → サーバ:  GET /api/memos    → 200 ["牛乳を買う"]
  （JavaScript が JSON から <li> を作る）

  （「追加」→ JavaScript が fetch する）
ブラウザ → サーバ:  POST /api/memos   ボディ: {"text":"パン"}
サーバ → ブラウザ:  201 Created
ブラウザ → サーバ:  GET /api/memos    → 200 ["牛乳を買う","パン"]
  （JavaScript が、<ul> の中だけを作り直す）
```

Network タブの絞り込みを「Fetch/XHR」にすると、`fetch` で送ったものだけが表示されます。最初の HTML に、メモが入っていないことも確かめましょう。

```sh
$ curl -s http://localhost:8506/ | grep '<li>'
<ul id="list"><li>読み込み中…</li></ul>
```

**手を動かす**: `<b>太字</b>` を追加してください。`textContent` で入れているので、`escapeHtml` を書かなくても、文字のまま表示されます。

> `list.innerHTML = '<li>' + memo + '</li>'` のように、`innerHTML` に文字列を入れると、文字が HTML として読まれます。MPA と同じエスケープが必要になるので、文字を入れるときは `textContent` を使います。

### 3.2 もう少し大きな SPA と、クライアント側のルーティング

[samples/todo-spa.mjs](samples/todo-spa.mjs) は、`todo-mpa.mjs` と同じタスク管理を SPA で作ったものです（**中身は読まなくてよい**）。

```sh
$ node samples/todo-spa.mjs
SPA 版: http://localhost:8501/
```

http://localhost:8501/ を開き、タスクの名前をクリックしてください。URL が `/tasks/2` に変わり、戻るボタンも使えます。それなのに Network タブには、HTML ではなく `GET /api/tasks/2`（JSON）しか出ません。JavaScript が**ページを読み込み直さずに URL だけを変えている**からです。

```js
history.pushState(null, '', a.href); // アドレスバーの URL を変え、履歴に追加する（リクエストは送らない）
route();                             // URL を見て、どの画面を描くかを決める
addEventListener('popstate', route); // 戻る・進むボタンで URL が変わったとき
```

ここで1つ問題があります。`/tasks/2` を表示した状態で**再読み込み**すると、ブラウザはサーバに `GET /tasks/2` を送ります。サーバに `/tasks/2` が無ければ 404 になってしまいます。そこで SPA のサーバは、**API 以外のどのパスにも、同じ HTML を返します**（SPA のフォールバック）。HTML を受け取った JavaScript が URL を見て、詳しい画面を描きます。

```sh
$ curl -s http://localhost:8501/tasks/2 | grep '<main'
<main id="app"><p>読み込み中…</p></main>
$ curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8501/no/such/page
200
```

`-o /dev/null` はボディを捨てる、`-w '%{http_code}\n'` はステータスコードだけを表示する、という意味です。存在しないページにも `200` が返っています。「見つかりません」と表示するのは JavaScript なので、検索エンジンなどには、ページがあるように見えます（**ソフト 404**。練習問題4）。

> ほかに、URL のフラグメント（`#/tasks/2`）を使う方法もあります。フラグメントはサーバに送られないので（第9章1節）、サーバ側の工夫が要りません。古い SPA でよく使われていました。

### 3.3 SPA の特徴

- 画面の切り替えで HTML を受け取り直さないので、**画面の一部だけが変わり**、操作が速く感じられる（その代わり、最初の表示までに JavaScript の読み込みと実行を待つ）
- サーバは**JSON の API**だけを用意すればよく、同じ API をスマートフォンのアプリなどからも使える
- ブラウザの標準の動き（戻る、再読み込み、ブックマーク、新しいタブ、読み込み中の表示、エラーの表示）を、**JavaScript で作り直す必要がある**。作り忘れると、MPA より使いにくくなる
- 状態が**サーバとブラウザの両方**にでき、ずれることがある（別のタブで削除したのに、こちらの画面に残っている、など。第8部 第39章）
- `textContent` で文字を入れれば、エスケープを忘れても XSS になりにくい。`innerHTML` に文字列を入れると、MPA と同じ注意が必要

## 4. SSR・CSR・SSG

### 4.1 「どこで、いつ HTML を作るか」

MPA と SPA の違いは、**HTML をどこで作るか**の違いと言い換えられます。さらに「いつ作るか」も加えると、3つに分けられます。

| 方式 | HTML を作る場所 | 作るとき | 例 |
| --- | --- | --- | --- |
| **SSR**（Server-Side Rendering） | サーバ | リクエストのたびに | `todo-mpa.mjs`、Flask の `render_template` |
| **CSR**（Client-Side Rendering） | ブラウザ | 画面を表示するたびに | `todo-spa.mjs`、Vite で作った React のアプリ |
| **SSG**（Static Site Generation） | 自分の Mac や CI | **公開する前に1回だけ** | `build-static.mjs`、ブログやドキュメントのサイト |

SSG を試してみましょう。[samples/build-static.mjs](samples/build-static.mjs)（**中身は読まなくてよい**）は、すべてのページの HTML を**先に作ってファイルに書き出します**。

```sh
$ node samples/build-static.mjs
書き出し: index.html（689 バイト）
書き出し: tasks/1/index.html（504 バイト）
書き出し: tasks/2/index.html（509 バイト）

3 ページを /Users/alice/dev/ch10/ssg-tasks に書き出しました。
$ ls ssg-tasks ssg-tasks/tasks
```

配信には、第1部 第4章の、ファイルをそのまま返すだけのサーバ `serve.mjs` を使います。Finder で教材の `part01-mac-dev-env/ch04-editor-debugger/samples/serve.mjs` を探し、`~/dev/ch10` にコピーします。

```sh
$ cp （ここに Finder から serve.mjs をドラッグ） .
$ node serve.mjs ssg-tasks 8502
```

http://localhost:8502/ を開くと、MPA と同じような画面が表示されます。ところが、配信しているのは**ファイルをそのまま返すだけのサーバ**で、リクエストのたびに HTML を作っているわけではありません。ページの下の「生成した時刻」は、再読み込みしても変わりません。データを変えたら、もう一度生成し直します（`build-static.mjs` は、書き出し先が既にあると何もしないので、`rm -r ssg-tasks` で消してから。`rm -r` はフォルダを中身ごと消すコマンドで、ゴミ箱には入らないので、消すフォルダの名前をよく確かめてください）。

ファイルを配るだけなので、とても速く、CDN にそのまま置けて、サーバで動くプログラムが無いので壊れにくく、攻撃される場所も少なくなります。その代わり、利用者ごとに違う内容（「あなたのタスク」）や、すぐに変わる内容には向きません。

### 4.2 組み合わせ: ハイドレーション

実際のフレームワークでは、これらを組み合わせます。よく使われるのが、**最初の HTML はサーバで作り（SSR）、その後はブラウザの JavaScript が引き継ぐ（CSR）**方式です。

1. サーバが、データを埋め込んだ HTML を返す → JavaScript を待たずに内容が表示される。検索エンジンも読める
2. JavaScript が読み込まれると、すでにある HTML に、クリックなどの処理を結び付ける（**ハイドレーション**）
3. その後の画面の切り替えは SPA と同じ

Next.js（第8部 第46章）などのフレームワークは、ページごとに SSR・SSG・CSR を選べるようになっています。この章で、それぞれが**どんな HTTP のやり取りになるのか**を知っておくと、フレームワークの説明にある用語が理解しやすくなります。

### 4.3 選び方の目安

| 重視すること | 向いている方式 |
| --- | --- |
| 検索エンジンに載せたい・SNS で共有されたときにプレビューを出したい | SSR か SSG（最初の HTML に内容がある） |
| 内容が全員同じで、あまり変わらない（ブログ、ドキュメント） | SSG |
| 利用者ごとに内容が違い、ログインが必要（管理画面、メール） | CSR か SSR |
| 画面の中の操作が多く、アプリのように動いてほしい（地図、エディタ） | CSR（またはハイドレーション） |
| 遅い回線・古い端末でも早く表示したい | SSR か SSG |
| チームが小さく、作る物を少なくしたい | SSR の MPA（API と画面を別々に作らずに済む） |

「SPA の方が新しいので優れている」わけではありません。第5部・第8部では API と React の画面を分けて作りますが、それは学ぶ目的に合っているからで、どのアプリにもその形が正しいわけではありません。

## 5. REST

### 5.1 リソースと URL とメソッド

SPA の API や、スマートフォンのアプリが使う API の設計で、よく使われる考え方が **REST**（Representational State Transfer）です。もとは Web の設計の原則をまとめた論文の言葉ですが、実際の開発では、次のような**慣習**の意味で使われることがほとんどです。

- 扱う物（**リソース**）を、名詞の URL で表す: `/api/tasks`（タスクの集まり）、`/api/tasks/3`（3番のタスク）
- 何をするかは、**メソッド**で表す（URL に動詞を入れない）
- 結果は、**ステータスコード**で表す
- データは JSON で受け渡す

`samples/todo-spa.mjs` の API は、この慣習に沿っています（`node samples/todo-spa.mjs` で起動して、curl で試せます）。

| メソッドとパス | すること | 成功したとき |
| --- | --- | --- |
| `GET /api/tasks` | 一覧を取る | `200` と配列 |
| `POST /api/tasks` | 新しく作る（ID はサーバが決める） | `201 Created`、`Location: /api/tasks/3`、作ったタスク |
| `GET /api/tasks/3` | 1件を取る | `200`。無ければ `404` |
| `PATCH /api/tasks/3` | 一部を変える（`{"done": true}`） | `200` と変えた後のタスク |
| `PUT /api/tasks/3` | 丸ごと置き換える（このサンプルには無い） | `200` |
| `DELETE /api/tasks/3` | 削除する | `204 No Content` |

```sh
$ curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"テスト"}' http://localhost:8501/api/tasks
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Location: /api/tasks/3
...
{"id":3,"title":"テスト","done":false,"createdAt":"2026-11-04T14:54:44.067Z"}

$ curl -si -X PUT http://localhost:8501/api/tasks/1
HTTP/1.1 405 Method Not Allowed
Content-Type: application/json; charset=utf-8
Allow: GET, PATCH, DELETE
...
{"error":"このメソッドは使えません"}
```

`405` には、使えるメソッドを `Allow` ヘッダで付けます（RFC 9110 の決まり）。入力の誤り（空のタイトル）は `422`、JSON として読めないボディは `400` を返しています。

### 5.2 REST らしくない設計

次のような API は、よく見かけますが、REST の慣習から外れています。

| 設計 | 問題 |
| --- | --- |
| `GET /api/deleteTask?id=3` | 動詞が URL にある。しかも GET で状態を変えている（6節） |
| `POST /api/tasks/list` | 読むだけなのに POST。キャッシュできず、ブラウザの履歴やブックマークにも使えない |
| 何が起きても `200` で、ボディに `{"success": false}` | ステータスで結果が分からない。キャッシュやログ（第6章練習問題7）が誤解する |
| `/api/getAllTasks`、`/api/task_list`、`/api/Tasks` が混在 | 名前の付け方がそろっていない |

ただし、REST は法律ではありません。「検索する」「メールを送る」「計算する」のように、リソースの作成・更新として表しにくい操作もあります。そういうときは `POST /api/tasks/3/archive` のように、**操作をリソースのように扱う**ことがよくあります。大事なのは、メソッドとステータスの**意味を守ること**と、API の中で**決まりをそろえること**です。ページネーション、バリデーション、エラーの形などの詳しい設計は、第5部 第25章で扱います。

> Flask の `@app.route("/api/tasks/<int:id>", methods=["PATCH"])` の `<int:id>` にあたる「パスの一部を取り出す」仕組みは、練習問題では `pathname.split('/')` で書きます（`'/api/tasks/3'` を `/` で区切ると `['', 'api', 'tasks', '3']`）。`todo-spa.mjs` では正規表現（文字の並びのパターン）を使っています。第4部 第18章で、ルーティングの仕組みを自作します。

## 6. 安全なメソッドと冪等性

### 6.1 安全（safe）

HTTP の仕様（RFC 9110）は、メソッドの性質を2つ決めています。1つ目は**安全**（safe）で、「**サーバの状態を変えない**」という約束です。`GET`、`HEAD`、`OPTIONS` は安全です。

この約束があるので、ブラウザや、ブラウザ以外のプログラムは、利用者に断らずに `GET` を送ります。

- ブラウザの**先読み**（リンクの先を、クリックされる前に取りに行く）
- 検索エンジンの**クローラ**（リンクを片っ端からたどる）
- チャットやメールに URL を貼ったときの**プレビュー**（URL を取りに行って、タイトルや画像を表示する）
- ウイルス対策ソフトによる、メールの中のリンクの事前確認
- `<img src>` は、ページを開いただけで `GET` される

もし `<a href="/tasks/1/delete">削除</a>` のように、GET で削除できるようにしていると、これらのどれかがリンクをたどった瞬間に、タスクが消えてしまいます。さらに、よそのサイトに `<img src="http://localhost:8500/tasks/1/delete">` と書かれているだけで、そのページを見た利用者のブラウザが削除のリクエストを送ってしまいます（**CSRF** の一種。第10部 第55章）。

`samples/todo-mpa.mjs` が、削除や完了のボタンを、リンクではなく `<form method="post">` で作っているのはこのためです。

```sh
$ curl -si http://localhost:8500/tasks/1/delete | head -2
HTTP/1.1 405 Method Not Allowed
Allow: POST
```

> POST にすれば CSRF を防げるわけではありません。よそのサイトの `<form method="post" action="http://localhost:8500/tasks/1/delete">` からも POST は送れます。Cookie の `SameSite` 属性（第7章3節）と CSRF トークンで防ぎます（第10部）。それでも「GET では状態を変えない」は、すべての対策の前提です。

### 6.2 冪等（idempotent）

2つ目は**冪等**（idempotent、べきとう）で、「**同じリクエストを1回送っても、何回送っても、サーバの状態が同じになる**」という性質です。

| メソッド | 安全 | 冪等 | 理由 |
| --- | --- | --- | --- |
| `GET`、`HEAD`、`OPTIONS` | ○ | ○ | 状態を変えないので、何回送っても同じ |
| `PUT` | × | ○ | 「3番をこの内容にする」は、2回やっても同じ内容 |
| `DELETE` | × | ○ | 「3番を消す」は、2回目は `404` になるが、**状態は**「3番が無い」で同じ |
| `PATCH` | × | △ | `{"done": true}` は冪等だが、「数を1増やす」のような変更は冪等でない |
| `POST` | × | × | 「タスクを作る」を2回やると、タスクが2つできる |

冪等が大事なのは、**ネットワークは失敗するから**です。リクエストを送った後で接続が切れると、クライアントには「サーバに届かなかった」のか「サーバは処理したが、レスポンスが届かなかった」のかが分かりません。

```
クライアント → サーバ:  POST /api/tasks  {"title":"パン"}   … サーバは保存した（id 4）
サーバ → クライアント:  201 Created   ✕ 途中で接続が切れて、届かない
クライアント:  タイムアウトした。もう一度送るべき？
```

冪等なリクエストなら、**もう一度送ればよい**だけです。ブラウザや HTTP のライブラリも、冪等なメソッドは接続が切れたときに自動で送り直すことがあります。POST はそうはいかず、送り直すと二重に作られるかもしれません。

POST を安全に送り直せるようにする方法の1つが、**冪等キー**（`Idempotency-Key` ヘッダ）です。クライアントが操作ごとにランダムな ID を作って付け、サーバは「同じキーのリクエストは2回目以降、最初の結果をそのまま返す」ようにします。決済の API などで使われています。練習問題8で実装します。

## 7. PRG パターン

### 7.1 手を動かす: フォームの二重送信を起こす

2.2節で、POST の後に `303` を返しました。もし POST のレスポンスとして、そのまま一覧の HTML を返したらどうなるでしょうか。試してみます。

**手を動かす**: `mini-mpa.mjs` の `req.on('end', ...)` の中の2行を、次のように変えます（元に戻すので、消さずに行の先頭に `//` を付けておきます）。起動し直してください。

```js
      memos.push(text);
      // res.writeHead(303, { Location: '/' });
      // res.end();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page());
```

1. 「みかん」を追加する。一覧に「みかん」が増え、画面は正しく見える。ただし、アドレスバーは `http://localhost:8505/memos` になっている
2. `⌘ + R` で再読み込みする。Chrome が「フォームの再送信の確認」を表示するので、「続行」を押す
3. 「みかん」が**2つ**になる。ターミナルにも `POST /memos` が2回出ている

ブラウザの履歴に残ったのが「**POST /memos の結果**のページ」だったので、再読み込みで**同じ POST がもう一度送られた**のです。戻るボタンでこのページに戻ったときも同じことが起きます。注文や送金のフォームなら、二重に注文してしまいます。

確かめたら、`//` を元に戻して `303` を返す形にし、起動し直してください。

### 7.2 Post / Redirect / Get

これを防ぐのが **PRG パターン**（Post/Redirect/Get）です。

1. **Post**: フォームを POST で受け取り、処理する
2. **Redirect**: 結果を直接返さず、`303 See Other` で結果を見るための URL へリダイレクトする
3. **Get**: ブラウザがその URL を GET する。履歴に残るのは、この GET のページ

2.2節で書いた `mini-mpa.mjs` が、この形です。

```js
      memos.push(text);
      // PRG: 結果の HTML を直接返さず、一覧へ 303 でリダイレクトする
      res.writeHead(303, { Location: '/' });
      res.end();
```

再読み込みしても `GET /` が送られるだけなので、何も起きません。第7章4節で見たように、`303` は「次は必ず GET で取りに行く」という意味のリダイレクトです（Flask の `redirect()` は既定で `302` ですが、ブラウザは `302` でも POST を GET に変えるので、同じように動きます）。

ただし、**入力に誤りがあったとき**はリダイレクトしません。リダイレクトすると、入力した値とエラーの文を次の GET に持ち越す手段が必要になるからです（Flask の `flash()` は、Cookie のセッションを使って持ち越していました）。`todo-mpa.mjs` は、`422` と、入力した値とエラーを入れたフォームを直接返しています（`mini-mpa.mjs` に同じことを足すのが練習問題2です）。この場合は再読み込みで再送信されても、また同じエラーになるだけなので問題ありません。

> SPA では、`fetch` で送った POST はブラウザの履歴に残らないので、PRG は要りません。その代わり、ボタンを2回続けて押されたときの二重送信を、ボタンを無効にするなどして自分で防ぎます。

## 8. MPA と SPA を比べる

ここまでの内容を、もう少し大きな2つのサンプル（`node samples/todo-mpa.mjs` と `node samples/todo-spa.mjs`。2つのターミナルで同時に起動できます）を Chromium で操作して確かめた結果にまとめます（DevTools の Network タブで見えるリクエストのうち、主なもの）。

| 操作 | MPA（`todo-mpa.mjs`） | SPA（`todo-spa.mjs`） |
| --- | --- | --- |
| 最初の表示 | `GET /`（HTML 1142 バイト。タスクを含む） | `GET /`（HTML 612 バイト。タスクを含まない） → `GET /app.js`（3484 バイト） → `GET /api/tasks`（JSON 177 バイト） |
| タスクを追加 | `POST /tasks` → `303` → `GET /` | `POST /api/tasks` → `201` → `GET /api/tasks` |
| 詳しい画面へ | `GET /tasks/2`（HTML） | `GET /api/tasks/2`（JSON。URL は `pushState` で変える） |
| 戻るボタン | `GET /`（HTML。キャッシュから表示されることもある） | `GET /api/tasks`（`popstate` で JavaScript が描き直す） |
| `/tasks/2` を直接開く・再読み込み | `GET /tasks/2` | `GET /tasks/2`（フォールバックの HTML） → `GET /app.js` → `GET /api/tasks/2` |
| JavaScript を無効にする | すべての操作ができる | 「このページを表示するには JavaScript を有効にしてください。」とだけ表示される |
| `/no/such/page` | `404` | `200`（ソフト 404） |

このアプリは小さいので、最初の表示に必要なバイト数は MPA の方が少なく、リクエストの数も1回です。SPA は、その後の操作で JSON だけをやり取りするので、画面が大きく、操作の回数が多いアプリほど有利になります。どちらが速いかは、アプリの大きさ・回線・端末で変わるので、**計って確かめる**ことが大事です（第12部 第66章）。

> JavaScript を無効にするには、DevTools を開いた状態で `⌘ + ⇧ + P` を押し、「Disable JavaScript」と入力して選びます。DevTools を閉じると元に戻ります。

## 9. Flask のアプリを説明し直す

第2部のまとめとして、よくある形の Flask のアプリを、この部で学んだ言葉で説明し直してみます。

```python
from flask import Flask, render_template, request, redirect, url_for, session, flash

app = Flask(__name__)
app.secret_key = "change-me"

@app.route("/")
def index():
    return render_template("index.html", tasks=load_tasks(), user=session.get("user"))

@app.route("/tasks", methods=["POST"])
def create():
    title = request.form["title"]
    if not title:
        flash("タイトルを入力してください")
        return redirect(url_for("index"))
    save_task(title)
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(debug=True)
```

| Flask のコード | この部の言葉で言うと | 章 |
| --- | --- | --- |
| `app.run()` → `Running on http://127.0.0.1:5000` | ループバックのアドレス `127.0.0.1` の TCP の 5000 番ポートで待ち受ける。同じ Mac からしか接続できない | 第5章 |
| `@app.route("/tasks", methods=["POST"])` | リクエスト行の**メソッド**と**パス**で処理を選ぶ（ルーティング）。他のメソッドには `405` | 第6章 |
| `request.form["title"]` | `application/x-www-form-urlencoded` のボディを `URLSearchParams` のように解析した値。`Content-Length` の分だけ読んでいる | 第6章 |
| `render_template(...)` | **SSR**。テンプレートエンジン（Jinja2）が**自動でエスケープ**して HTML を作り、`Content-Type: text/html; charset=utf-8` を付ける | 第7章、この章 4節 |
| `redirect(url_for("index"))` | `302 Found` と `Location: /`。POST の後なので **PRG パターン**になっている | 第7章4節、この章 7節 |
| `session["user"]`、`app.secret_key` | 中身を JSON にして **HMAC で署名**し、`Set-Cookie: session=...; HttpOnly` で送る。暗号化ではないので、中身は利用者に読める。`secret_key` が漏れると、なりすましができる | 第7章3節、第8章2節 |
| `flash(...)` | 次のリクエストで表示する文を、セッションの Cookie に入れて持ち越す | 第7章3節 |
| `debug=True` | エラーの画面から**Python のコードを実行できる**デバッガが有効になる（PIN で守られてはいるが）。本番や、外から接続できる状態（`host="0.0.0.0"`）では使わない | 第5章3節 |
| 静的ファイル（`/static/style.css`） | Flask が `Cache-Control` や `ETag`（`Last-Modified`）を付けて配る。本番では nginx や CDN に任せることが多い | 第7章5節、この章 1節 |

このアプリは**MPA**で、状態はサーバ（`load_tasks()` の先のデータベースと、署名付きの Cookie）にあります。Node.js でも、まったく同じ構成のアプリを作れます。第4部ではフレームワークを使わずに、第5部では Express で作ります。練習問題7で、もう少し大きな Flask のアプリを説明し直します。

## まとめ

- Web アプリは、ブラウザ・DNS・CDN・リバースプロキシ・アプリのサーバ・データベースが HTTP などでつながってできている。自分が書くのは主にアプリのサーバ。
- **MPA** は、サーバが画面ごとに HTML を作る。ブラウザの標準の機能（リンク、フォーム、戻る、再読み込み）がそのまま使える。
- サーバで HTML を作るときは、`&` `<` `>` `"` を**エスケープ**する。ブラウザで画面を作るときは、`textContent` で文字を入れる。
- **SPA** は、JavaScript が API の JSON から画面を作る。画面の一部だけを更新できる代わりに、ブラウザの標準の動きを自分で作る必要がある。サーバは API 以外のパスに同じ HTML を返す。
- **SSR・CSR・SSG** は、HTML を「どこで・いつ」作るかの違い。組み合わせ（ハイドレーション）も多い。用途に合わせて選ぶ。
- **REST** の慣習: 名詞の URL・メソッドで操作・ステータスで結果。`201` と `Location`、`204`、`405` と `Allow`、`422`。
- `GET` は**安全**（状態を変えない）。`PUT`・`DELETE` は**冪等**。`POST` はどちらでもないので、送り直しには冪等キーなどの工夫が要る。
- MPA のフォームは **PRG パターン**（POST → 303 → GET）で二重送信を防ぐ。入力の誤りは `422` でフォームをそのまま返す。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本 → 応用 → 発展の順）。解答は [solutions/README.md](solutions/README.md) です。

第2部の成果物 [project-web-report](../project-web-report/README.md) では、実在のサイトを `dig` と `curl` で調べ、この部で学んだことを使って図解したレポートを作ります。

## 参考資料

- RFC 9110「HTTP Semantics」9.2節 Common Method Properties（安全と冪等）: https://www.rfc-editor.org/rfc/rfc9110#section-9.2
- MDN「Idempotent（冪等）」: https://developer.mozilla.org/ja/docs/Glossary/Idempotent
- MDN「History API」: https://developer.mozilla.org/ja/docs/Web/API/History_API
- web.dev「Rendering on the Web」（SSR・CSR・SSG の比較）: https://web.dev/articles/rendering-on-the-web
- Google 検索セントラル「ソフト 404 エラー」: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors#soft-404-errors
- IETF の Internet-Draft「The Idempotency-Key HTTP Header Field」（作成時点では標準になる前の案です）: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- Flask のドキュメント（Sessions、Message Flashing）: https://flask.palletsprojects.com/

前の章: [第9章 ブラウザの仕組み](../ch09-browser/README.md) ／ 次: [第2部の成果物 project-web-report](../project-web-report/README.md)
