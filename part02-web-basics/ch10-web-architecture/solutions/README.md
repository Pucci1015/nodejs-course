# 第10章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [mini-mpa-v2.mjs](mini-mpa-v2.mjs) | 問題1・2: 削除と、空の入力のエラーを足した MPA のメモ |
| [mini-spa-v2.mjs](mini-spa-v2.mjs) | 問題3: 削除を足した SPA のメモ |
| [fixed-mpa.mjs](fixed-mpa.mjs) | 問題6: 4つの問題を直した MPA |
| [idempotent-api.mjs](idempotent-api.mjs) | 問題8: `Idempotency-Key` に対応したタスクの API |

模範解答を動かすときは、`~/dev/ch10` に `solutions` フォルダもコピーしてから、次のようにします。

```sh
$ node solutions/mini-mpa-v2.mjs                              # 問題1・2 → http://localhost:8505/
$ node solutions/mini-spa-v2.mjs                              # 問題3 → http://localhost:8506/
$ bash exercises/check-mpa.sh solutions/fixed-mpa.mjs         # 問題6
$ bash exercises/check-idempotency.sh solutions/idempotent-api.mjs   # 問題8
```

ブラウザでの結果は、この教材の作成時に Chromium で確かめたものです。

---

## 問題1 MPA のメモに削除を足す

[mini-mpa-v2.mjs](mini-mpa-v2.mjs) を見てください（問題2の分も入っています）。足した所には `// 追加（問題1）` と書いてあります。

一覧を作る所は、番号が要るので `i` を数える `for` にしました。

```js
  for (let i = 0; i < memos.length; i++) {
    const number = i + 1;
    items += `<li>${escapeHtml(memos[i])}
  <form method="post" action="/memos/${number}/delete" style="display: inline"><button>削除</button></form>
</li>
`;
  }
```

削除を受け取る所です。`POST /memos` の処理の後、404 の前に置きます。

```js
  const parts = req.url.split('/');
  if (req.method === 'POST' && parts.length === 4 && parts[1] === 'memos' && parts[3] === 'delete') {
    const number = Number(parts[2]);
    if (Number.isInteger(number) && number >= 1 && number <= memos.length) {
      memos.splice(number - 1, 1); // 番号は1から、配列の位置は0から数えるので、1を引く
      res.writeHead(303, { Location: '/' });
      res.end();
      return;
    }
    sendHtml(res, 404, '<!doctype html><meta charset="utf-8"><p>そのメモはありません</p>\n');
    return;
  }
```

- `Number('abc')` は `NaN`、`Number('1.5')` は `1.5` なので、どちらも `Number.isInteger` で落ちて 404 になります。
- 削除の後も、追加と同じく `303` で一覧に戻します（PRG）。再読み込みしても、もう一度消えることはありません。
- 削除が POST なので、`GET /memos/1/delete` は 404 になります（`req.method === 'POST'` の条件に合わないため）。本当は `405` と `Allow: POST` を返すのが丁寧です（問題6）。

> 番号でメモを指すと、2人が同時に操作したときに困ることがあります。Aさんが2番を消した直後に、古い画面を見ていたBさんが「2番を削除」を押すと、Bさんが見ていたのとは別のメモ（元の3番）が消えます。本物のアプリでは、メモごとに変わらない ID（`todo-mpa.mjs` の `id`）を付けます。

## 問題2 MPA のメモで、空の入力をエラーにする

`page()` に引数を2つ付けました。

```js
function page(error, value) {
  ...
  let errorHtml = '';
  if (error !== '') {
    errorHtml = `<p style="color: red">${escapeHtml(error)}</p>\n`;
  }
  return `...
<form method="post" action="/memos">
  <input name="text" value="${escapeHtml(value)}">
  <button>追加</button>
</form>
${errorHtml}<ul>
...`;
}
```

`POST /memos` の `'end'` の中です。

```js
      const text = new URLSearchParams(body).get('text');
      if (text === null || text.trim() === '') {
        sendHtml(res, 422, page('メモを入力してください', text || ''));
        return;
      }
      memos.push(text);
```

- `GET /` では `page('', '')` と呼びます。
- `text === null` を先に調べるのが大事です。順番が逆だと、`null.trim()` で例外になります（`||` は、左が `true` なら右を調べません）。
- `value` に入れる値も `escapeHtml` を通します。通さないと、`"><b>x` のような値で `value="..."` の外に抜け出せます。`escapeHtml` で `"` も置き換えているのは、このためです。

確かめた結果です。

```
$ curl -si -d 'text=' http://localhost:8505/memos | grep -E 'HTTP|red|value'
HTTP/1.1 422 Unprocessable Entity
  <input name="text" value="">
<p style="color: red">メモを入力してください</p>
$ curl -si -d 'x=1' http://localhost:8505/memos | head -1
HTTP/1.1 422 Unprocessable Entity
```

## 問題3 SPA のメモに削除を足す

[mini-spa-v2.mjs](mini-spa-v2.mjs) を見てください。

サーバ側（404 の前に置きます）:

```js
  const parts = req.url.split('/');
  if (req.method === 'DELETE' && parts.length === 4 && parts[1] === 'api' && parts[2] === 'memos') {
    const number = Number(parts[3]);
    if (Number.isInteger(number) && number >= 1 && number <= memos.length) {
      memos.splice(number - 1, 1);
      res.writeHead(204); // 204 No Content: 成功。返すボディは無い
      res.end();
      return;
    }
    sendJson(res, 404, { error: 'そのメモはありません' });
    return;
  }
```

ブラウザ側の `render()`:

```js
    for (let i = 0; i < memos.length; i++) {
      const li = document.createElement('li');
      li.textContent = memos[i] + ' ';
      const button = document.createElement('button');
      button.textContent = '削除';
      button.addEventListener('click', async () => {
        await fetch('/api/memos/' + (i + 1), { method: 'DELETE' });
        await render();
      });
      li.append(button);
      list.append(li);
    }
```

- `li.textContent = ...` の**後で** `li.append(button)` します。順番が逆だと、`textContent` を入れたときにボタンが消えます（`textContent` は中身を全部置き換えるため）。
- `for (let i = 0; ...)` の `let` は、回るたびに別の `i` を作ります。そのため、ボタンが押されたとき（ずっと後）にも、その行の `i` が使われます。
- 削除の後は `render()` で一覧を取り直します。Network タブには `DELETE /api/memos/1`（204）と `GET /api/memos`（200）が出ます。MPA と違って、ページは読み込み直されません。

Chromium で、追加 → 削除のボタンを押して、一覧から消えることを確かめました。

## 問題4 MPA と SPA を DevTools で比べる

### 1. リクエストの一覧

| 操作 | MPA | SPA |
| --- | --- | --- |
| 最初の表示 | `GET /` 200 | `GET /` 200 → `GET /app.js` 200 → `GET /api/tasks` 200 |
| タスクの追加 | `POST /tasks` 303 → `GET /` 200 | `POST /api/tasks` 201 → `GET /api/tasks` 200 |
| タスクの名前をクリック | `GET /tasks/2` 200 | `GET /api/tasks/2` 200 |
| 戻るボタン | `GET /` 200（ブラウザが前のページを覚えていて、リクエストが出ないこともある） | `GET /api/tasks` 200 |
| `/tasks/2` で再読み込み | `GET /tasks/2` 200 | `GET /tasks/2` 200 → `GET /app.js` 200 → `GET /api/tasks/2` 200 |

MPA のリクエストは、Network タブの絞り込みの「Doc」（ページそのものの読み込み）に出ます。レスポンスを受け取ると、ブラウザは画面全体を描き直します。SPA の `/api/...` は「Fetch/XHR」に出ます。レスポンスは JavaScript に渡されるだけで、JavaScript が画面の一部を変えます。

### 2. JavaScript を無効にしたとき

- MPA: 一覧・追加・完了・削除・詳しい画面・戻る、すべてできます（JavaScript を使っていないので）。
- SPA: 「読み込み中…」と「このページを表示するには JavaScript を有効にしてください。」が表示されるだけで、何もできません。

### 3. ソフト 404

`/tasks/999` も `/no/such/page` も、ステータスは **`200`** です。`/tasks/999` は、JavaScript が API の `404` を受け取って「見つかりません」と表示します。`/no/such/page` は、一覧の画面が表示されます。

問題になる理由:

- 検索エンジンは、ステータスを見て「このページは存在する」と判断し、中身の無いページを登録してしまうことがある（Google はこれを「ソフト 404」と呼び、正しく `404` を返すことを勧めています）
- 監視の仕組みやリンク切れの確認ツールも、ステータスを見るので、壊れたリンクに気付けない

サーバ側で直すには、フォールバックの HTML を返す前に、**サーバが分かる範囲で存在を確かめ**て、無ければステータスだけを `404` にします（本文は同じ HTML のままにして、表示は JavaScript に任せる）。サーバ側の経路の一覧と、JavaScript 側の経路の一覧の両方を保つ必要があるのが SPA の手間です。SSR のフレームワーク（第8部 第46章）は、サーバとブラウザで同じ経路の定義を使うことで、この手間を減らしています。

### 4. 別のタブで削除したとき

確かめた結果、**MPA でも SPA でも**、元のタブには削除したタスクが表示されたままです。画面は「その時点のサーバの状態を写したもの」で、サーバの状態が変わっても、ブラウザには知らせが来ないからです。違いが出るのは、その後の操作です。

- MPA: 削除済みのタスクの「完了」を押すと、`POST /tasks/1/toggle` が `404` になり、「見つかりません」のページが表示されます。「一覧に戻る」で最新の一覧になります。**操作のたびにページ全体をサーバから受け取り直す**ので、ずれは次の操作で必ず直ります。
- SPA: 「完了」を押すと `PATCH /api/tasks/1` が `404` になりますが、**画面は何も変わらず**、Console にエラーが出るだけです。利用者には「ボタンが効かない」ように見えます。

SPA では状態が**サーバとブラウザの JavaScript の両方**にあり、ずれは自分で直す必要があります。エラーを表示する、失敗したら一覧を取り直す、定期的に取り直す、サーバから知らせを受ける（第5部 第27章の SSE・WebSocket）などの方法があります。第8部の TanStack Query は、この「取り直し」を仕組みにしたライブラリです。

## 問題5 REST の API を設計する

### 1. 割り当ての例

| 操作 | メソッドとパス | 成功 |
| --- | --- | --- |
| プロジェクトの一覧 | `GET /api/projects` | `200` |
| プロジェクトを作る | `POST /api/projects` | `201` + `Location: /api/projects/3` |
| プロジェクトの中のタスクの一覧 | `GET /api/projects/3/tasks` | `200` |
| プロジェクトにタスクを追加 | `POST /api/projects/3/tasks` | `201` + `Location: /api/tasks/42` |
| タスクを1件取る | `GET /api/tasks/42` | `200` |
| タイトルだけを変える | `PATCH /api/tasks/42`（`{"title": "..."}`） | `200` |
| タスクを削除 | `DELETE /api/tasks/42` | `204` |
| コメントを付ける | `POST /api/tasks/42/comments` | `201` + `Location: /api/comments/7` |
| コメントの一覧 | `GET /api/tasks/42/comments` | `200` |
| コメントを削除 | `DELETE /api/comments/7` | `204` |
| 完了したタスクだけ | `GET /api/projects/3/tasks?done=true` | `200` |
| 別のプロジェクトに移す | `PATCH /api/tasks/42`（`{"projectId": 5}`） | `200` |

考え方:

- 「集まり」は複数形の名詞（`/projects`、`/tasks`）、1件はその後ろに ID
- 親子関係は、**作るときと一覧のとき**だけ入れ子にする（`/projects/3/tasks`）。1件を扱うときは `/api/tasks/42` のように短くする。入れ子を深くしすぎると（`/projects/3/tasks/42/comments/7`）、URL が長くなり、タスクを移したときに URL が変わってしまう
- 絞り込みは、リソースが変わるわけではないので**クエリ**（`?done=true`）
- 「移す」は「タスクの `projectId` を変える」ことなので `PATCH`。`POST /api/tasks/42/move` のような操作の URL にする設計もあり、どちらも間違いではありません。API の中でそろえることが大事です

### 2. 問題のある設計

| | 問題 | 直した設計 |
| --- | --- | --- |
| (a) | GET で状態を変えている（先読みやクローラで完了になる。CSRF もしやすい）。動詞が URL にある | `PATCH /api/tasks/5`（`{"done": true}`） |
| (b) | 読むだけなのに POST。キャッシュできない・URL を共有できない・冪等なのに再送できない。動詞が URL にある | `GET /api/projects/3/tasks` |
| (c) | ステータスで結果が分からない。キャッシュが「成功」として保存したり、クライアントが `res.ok` で判断できなかったりする | `404` と `{"error": "..."}` |
| (d) | `201` でない。作ったものの ID も場所も分からず、クライアントがもう一度一覧を取って探すしかない | `201`、`Location: /api/tasks/42`、ボディに作ったタスク |
| (e) | 「無いものを消そうとした」のは**クライアント側**の事情で、サーバの誤り（`5xx`）ではない。`500` だとクライアントは「サーバが壊れているので、後で再送しよう」と判断してしまう | `404`（または `204`。次の 3 を参照） |
| (f) | `PUT` は「丸ごと置き換える」なので、送らなかった項目が消えるのは、仕様どおりとも言える。一部だけを変えたいなら `PATCH` を使うべき。`PUT` で一部の項目を省いたら `422` にする設計もある | `PATCH /api/tasks/5`（`{"done": true}`） |

### 3. 2回目の DELETE

冪等の定義は「何回送っても、**サーバの状態**が同じになる」であり、**レスポンスが同じ**であることは求めていません。1回目で `204`、2回目で `404` を返しても、状態はどちらも「5番が無い」なので、`DELETE` は冪等です。

- `404` を返す: 「そのリソースは無い」という事実を正直に伝える。多くの API はこちら
- `204` を返す: 「消えている状態」というクライアントの目的は果たされているので成功とする。送り直しのたびにクライアントがエラー処理をしなくて済む

どちらでもよいですが、API の中でそろえて、ドキュメントに書きます。`500` だけは誤りです。

## 問題6 問題のある MPA を直す

### 1. 4つの問題

| | 問題 | 起きること | 本文 |
| --- | --- | --- | --- |
| 1 | 追加の `POST /tasks` が、一覧の HTML を `200` で直接返している（PRG になっていない） | 追加した後に再読み込みすると、同じ POST がもう一度送られ、タスクが2つになる | 7節 |
| 2 | 削除が `<a href="/tasks/1/delete">`（GET） | 先読み・クローラ・URL のプレビュー・よそのページの `<img src>` で、利用者が知らないうちに削除される | 6.1節 |
| 3 | タイトル・input の `value` をエスケープしていない | タイトルに `<b>太字</b>` と書くと太字になる。よその人が書いた文字にスクリプトが入っていれば、そのページを開いた人のブラウザで動く（XSS）。`value` では `"` で属性を抜け出せる | 2.3節 |
| 4 | 存在しない番号で `findTask()` が `undefined` を返すのに、そのまま `.title`・`.done` を読んでいる | `GET /tasks/999` や `POST /tasks/999/toggle` で `TypeError` になり、**サーバのプロセスが止まる** | |

1 は、Chromium で「追加 → 再読み込み」を自動で行って確かめました。`bad-mpa.mjs` では `POST /tasks` が2回送られてタスクが2つに、`fixed-mpa.mjs` では `POST /tasks` → `GET /` → 再読み込みの `GET /` となり、タスクは1つでした。

### 2. 直し方

[fixed-mpa.mjs](fixed-mpa.mjs) を見てください。変えた所には `// 直した` と書いてあります。

- 1: 追加の後は `303 See Other` と `Location: /`
- 2: 削除を `<form method="post" action="/tasks/番号/delete">` にし、`GET /tasks/番号/delete` には `405` と `Allow: POST` を返す。`GET /tasks` も `405`
- 3: `escapeHtml()` を作り、HTML に入れるすべての文字列（`<title>` と、1件の画面の `<h1>` も）に使う。`&` を最初に置き換えるのがポイント
- 4: `findTask()` が `undefined` なら `404` を返す。削除も、見つからなければ `404`

### 3. サーバ全体が止まる問題

問題4です。`createServer` に渡した関数の中で例外が起き、誰も `catch` しないと、Node.js は**プロセスごと終了します**。Flask では、ビュー関数の例外は Flask が受け止めて `500` にしてくれましたが、`node:http` には、その仕組みがありません。

1つのリクエストの失敗で、他の利用者のリクエストも含めてすべてが止まるので、**だれでも URL を1つ開くだけでサービスを止められる**ことになります。

もう一段の守りとして、`fixed-mpa.mjs` では、処理を `handle()` という関数に移し、`createServer` の中で `try` / `catch` で囲んで、思わぬ例外は `500` を返すようにしました。

```js
const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  try {
    handle(req, res);
  } catch (err) {
    serverError(res, err);
  }
});
```

`req.on('end', ...)` に渡した関数は、`handle()` が終わった**後で**呼ばれるので、この `try` では捕まえられません。そこで、`'end'` の中でも `try` / `catch` で囲んでいます。

```js
    req.on('end', () => {
      try {
        addTask(res, body);
      } catch (err) {
        serverError(res, err);
      }
    });
```

Express（第5部 第24章）のエラーハンドリングのミドルウェアは、これを仕組みにしたものです。`async` の関数の中の例外の扱い（unhandled rejection）は、第3部 第12章で扱います。

## 問題7 Flask のアプリを HTTP の言葉で説明し直す

### 1. やり取りの表

curl で確かめた結果です（Cookie の値は毎回変わります）。

| 操作 | リクエスト | ステータス | 主なヘッダ |
| --- | --- | --- | --- |
| ログインしていない状態で `/` | `GET /` | `302 FOUND` | `Location: /login?next=/` |
| | `GET /login?next=/` | `200 OK` | `Content-Type: text/html; charset=utf-8` |
| ログイン | `POST /login?next=/`（`name=alice&password=secret`） | `302 FOUND` | `Location: /`、`Set-Cookie: session=eyJ1c2VyIjoiYWxpY2UifQ.aW3kQg.7fXp…; HttpOnly; Path=/`、`Vary: Cookie` |
| 一覧 | `GET /`（`Cookie: session=…`） | `200 OK` | `Vary: Cookie` |
| | `GET /api/tasks`（ページの JavaScript が送る） | `200 OK` | `Content-Type: application/json`、`Access-Control-Allow-Origin: *`（`Origin` が無い同一オリジンの GET のとき） |
| 追加 | `POST /tasks`（`title=…`） | `302 FOUND` | `Location: /` |
| | `GET /` | `200 OK` | |
| 空のタイトルで追加 | `POST /tasks`（`title=`） | `302 FOUND` | `Location: /`、`Set-Cookie: session=.eJwdyz…`（flash の文がセッションに入ったので、Cookie が書き換わる） |
| | `GET /` | `200 OK` | エラーの文を表示した後、flash の文が取り除かれるので、もう一度 `Set-Cookie` |

ポイント:

- Flask の `redirect()` は `302`。POST の後なので、ブラウザは `GET` で取りに行き、PRG パターンになっている
- `Vary: Cookie` は、「Cookie によって中身が変わるので、キャッシュは Cookie ごとに分けて」という意味（第7章6.2節）。Flask が、セッションを読んだときに自動で付ける
- 空のタイトルのときも `302` で、エラーの文は Cookie（flash）で次の `GET /` に持ち越している。問題2の `mini-mpa-v2.mjs` は `422` でフォームを直接返していた。どちらの方法もあるが、Flask の方法では、入力した値はフォームに残らない
- `flash` の文が入った Cookie は `.` で始まり、`eJ` の後が zlib で**圧縮**されている（中身が大きいときに Flask が圧縮する）

### 2. 構成

**MPA** で、画面は **SSR**（Jinja2 のテンプレート）です。例外は、一覧のページの `<script>` が `/api/tasks` を `fetch` してタブのタイトルに件数を出す部分で、ここだけが **CSR** です。このように「SSR の MPA に、小さな JavaScript を足す」構成は、とてもよくあります。

### 3. セッションの Cookie

最初の部分を読むと、ログインした名前が JSON で入っています。

```
> Buffer.from('eyJ1c2VyIjoiYWxpY2UifQ', 'base64url').toString()
'{"user":"alice"}'
```

3つの部分は「中身（base64url の JSON）」「作った時刻」「署名」です。

- **読めるか**: 読めます。暗号化ではなく base64url で書いてあるだけです。パスワードなどの秘密を `session` に入れてはいけません。
- **書き換えられるか**: 中身を書き換えることはできますが、署名が合わなくなるので、Flask は書き換えられたセッションを捨てます（ログインしていない扱いになる）。
- **守っているもの**: `secret_key` を鍵にした HMAC の署名です（第8章2.3節、第8章練習問題7の `signed-value.mjs` と同じ考え方）。
- **弱くしている設定**: `app.secret_key = "dev"`。推測しやすい値が**コードに直接書いてある**ので、このコードを見た人や、よくある値を試す人は、正しい署名を作れてしまい、好きな名前でログインした状態になれます。長いランダムな値を作り、環境変数などからコードの外で渡します（第1部 第3章13.3節、第10部、第12部 第60章）。

### 4. 問題と直し方

| | 問題 | 分かる知識 | 直し方 |
| --- | --- | --- | --- |
| 1 | `{{ t.title\|safe }}`: `safe` フィルタで、Jinja2 の自動のエスケープを止めている。タイトルに `<b>太字</b>` と書くと太字になる（curl で確かめると `<li><b>太字</b> …` がそのまま入っていた）。スクリプトなら XSS | 第10章 2.3節、問題6 | `\|safe` を外す |
| 2 | 削除が `<a href="/delete/1">` の **GET**。先読み・プレビュー・よそのページの `<img>` で削除される | 第10章 6.1節 | `@app.route("/tasks/<int:task_id>/delete", methods=["POST"])` と `<form method="post">` にする |
| 3 | ログインの後に `redirect(request.args.get("next", "/"))`。`/login?next=https://evil.example/` を踏ませると、本物のサイトでログインした直後に、よそのサイトへ飛ばされる（curl では `Location: https://evil.example/` になった）。**オープンリダイレクト** | 第9章 練習問題8 | 第9章の `safeRedirectPath()` と同じように、同じオリジンのパスだけを許す |
| 4 | `/api/tasks` が `Origin` をそのまま `Access-Control-Allow-Origin` に返し、`Allow-Credentials: true` も付けている。どんなオリジンにも、Cookie 付きでの読み取りを許すのと同じ | 第9章 5.3〜5.5節 | 同じオリジンでしか使わないので、CORS のヘッダを付けない。必要なら、許可するオリジンの一覧と照らし合わせる（第9章練習問題3・7） |
| 5 | `/api/tasks` がログインを確かめていない。curl で、Cookie なしでもタスクの一覧が取れた（CORS は、ブラウザ以外からのアクセスを何も防がない） | 第9章 5.5節 | `"user" not in session` なら `401` を返す |
| 6 | `app.run(debug=True)`。デバッガが有効（起動の表示に `Debugger is active!` が出ていた）で、エラーの画面からコードを実行できる。今は `127.0.0.1` だけで待ち受けているが、`host="0.0.0.0"` を足すと、同じ Wi-Fi の他の人にもこの機能をさらすことになる | 第5章3節 | `debug=True` は自分の Mac の中だけで使う。本番では `debug` を付けず、`host` も既定の `127.0.0.1` にして前にリバースプロキシを置く |
| 7 | `secret_key = "dev"` がコードに書いてある | 第8章2.3節、この問題の 3 | ランダムな長い値を、環境変数から読む |
| 8 | HTTP で、パスワードを送っている。Cookie に `Secure` が無い | 第8章1節・7節 | 本番では HTTPS にし、`SESSION_COOKIE_SECURE = True`、HSTS を付ける |

ほかに、「`POST /login` で失敗したときも `302`」「`TASKS` がメモリの中にあり、再起動で消え、プロセスが複数だと別々になる（問題8の 5 と同じ）」「CSRF の対策が無い（第10部）」なども挙げられます。

### Node.js で作り直すとしたら

| Flask のアプリの部分 | 作る章 |
| --- | --- |
| `app.run()`、ルーティング（`@app.route`） | 第4部 第17〜18章、第5部 第23章 |
| `request.form`、`jsonify` | 第4部 第20章 |
| テンプレートとエスケープ | 第4部 第21章 |
| `session`、`flash`（署名付きの Cookie） | 第4部 第22章 |
| 静的ファイル | 第4部 第19章 |
| エラーの処理、ログ | 第5部 第24章、第26章 |
| `/api/tasks` の設計 | 第5部 第25章 |
| `TASKS` をデータベースへ | 第6部 |
| ログインとパスワード | 第10部 第51〜52章 |

## 問題8 POST を冪等キーで安全に送り直せるようにする

### 1. タスクが4つできた理由

`retry-client.mjs` は 250ms で待つのをやめますが、それは**クライアントが待つのをやめただけ**で、サーバは届いたリクエストを最後まで処理します。サーバは 300ms かけて4回とも保存し、クライアントが接続を切った後なので、`201` のレスポンスは誰にも届きません。ターミナル1には、`POST /api/tasks` が4回と「保存しました」が4回表示されます。

クライアントからは「届かなかった」のか「処理したが返事が届かなかった」のかが区別できない、というのが本文6.2節の問題そのものです。

### 2・3. 実装

[idempotent-api.mjs](idempotent-api.mjs) を見てください。足した所には `// 追加` と書いてあります。要点は次のとおりです。

- `Map` に、キー → `{ state, body, task }` を記録する
- 受け取ったボディの文字列をそのまま記録し、同じキーで違う内容が来たら `422`
- 入力を確かめた後、`setTimeout` で待つ**前に** `state: 'processing'` を記録し、その間に来た同じキーには `409`
- 保存したら `state: 'done'` と作ったタスクを記録。2回目以降は、記録したタスクに `Idempotent-Replayed: true` と、同じ `Location` を付けて返す
- 入力の誤り（`400`・`422`）は、記録を付ける前に返すので、キーは記録されない

キーを付けたクライアントで試した結果です。1回目がタイムアウトした直後の2回目は「処理中」の `409`、少し待った3回目は記録した結果が返り、タスクは1つだけです。

```
$ node exercises/retry-client.mjs --key
Idempotency-Key: fe24de69-e195-4882-a300-23cc85290f62
 255ms 1回目: タイムアウト。送り直します
 264ms 2回目: 409  {"error":"同じ Idempotency-Key のリクエストを処理中です。少し待ってから送り直してください"}
 469ms 3回目: 201 （Idempotent-Replayed: true） {"id":1,"title":"牛乳を買う（再送の実験）","done":false}

「牛乳を買う（再送の実験）」のタスクは 1 個あります（id: 1）
```

キーは「**操作ごとに1つ**」作り、送り直すときは**同じキー**を使います。送るたびに新しいキーを作ると、サーバからは別の操作に見えるので、意味がありません（`retry-client.mjs` は、送り直しのループの外でキーを作っています）。

### 4. 「処理中」の印を後で付けると

`records.set(key, { state: 'processing', body: body });` を消して試すと、確認6と7が失敗しました。

```
[NG] 6. 1回目を処理している間に届いた同じキーには 409（タスクは1つ）
     1回目: 201、2回目: 201、タスクの数: 2
[NG] 7. 409 の後で送り直すと、1回目の結果が返る
```

1回目が `setTimeout` で保存を待っている間に2回目が届くと、まだ記録が無いので、2回目も処理されてしまいます。Node.js は一度に1つの関数しか実行しませんが、**待っている間には、他のリクエストの処理が割り込みます**。「記録があるか確かめる」と「記録する」の間に待ち時間を挟むと、このような**競合状態**（race condition）になります（`await` での割り込みとイベントループは、第3部 第12〜13章で詳しく扱います）。キーを記録しない `slow-api.mjs` で送り直したときにタスクが4つできたのと、根本は同じです。

### 5. 本番で使うには足りないこと

- **記録がメモリの中にある**: サーバを再起動すると消え、送り直しで二重に作られる。サーバのプロセスが複数（第12部 第66章）だと、別のプロセスに届いた送り直しは記録を見られない。データベースや Redis に保存し、「無ければ作る」を1回の操作で行う（第6部）
- **利用者ごとに分けていない**: 別の利用者が偶然（または、わざと）同じキーを使うと、他人の結果が返ってしまう。キーは「利用者 ID + キー」で記録する（第10部）
- **保存とキーの記録が一体になっていない**: タスクを保存した直後にサーバが落ちると、「保存したのにキーの記録が無い」状態になる。同じトランザクションで記録する（第6部 第30章）
- **期限**: この解答は記録を消さないので、使うほど増え続ける。どのくらい残すか（例えば24時間）を決めて API のドキュメントに書き、古い記録を消す仕組みを作る
- **ボディの比べ方**: ボディの文字列で比べているので、JSON の空白やキーの順番が違うだけでも「違う内容」になる

> `Idempotency-Key` ヘッダは、作成時点では IETF で標準化が進められている案（Internet-Draft）です。決済サービスなどの API が、それぞれ似た仕組みを提供しています。細かい決まり（`409` か `422` か、など）は、使う API のドキュメントを確かめてください。
