# 第52章 セッションとトークン

第51章で、パスワードを確かめられるようになりました。でも HTTP は、前のリクエストを覚えていません。ログインした後のリクエストで「この人は alice だ」と分かるようにするには、ブラウザに何かを持たせて、毎回送ってもらう必要があります。この章では、その2つのやり方、**サーバのセッション**（Cookie には ID だけ）と**トークン**（JWT。中身を署名して持たせる）を、自分で動かして比べます。あわせて、Cookie の属性、セッション固定、CSRF への備えを確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第51章、第4部 第22章（Cookie とセッションを自作）、第2部 第7章（Cookie の属性）・第8章（HMAC）、第5部 第24章（express-session の設定）、第6部 第34章（セッションを Redis に） |
| この章のゴール | サーバのセッションとトークンの違いを、保存場所・取り消し・大きさで説明できる / express-session でログイン・ログアウトを書き、`curl` で Cookie の動きを確かめられる / `HttpOnly`・`Secure`・`SameSite`・`__Host-` の役目を説明できる / ログインのときにセッションの ID を作り直す理由を説明できる / `SameSite` と `Origin` の確かめで CSRF に備えられる / JWT の3つの部分を読み、HS256 の署名を自分で作って確かめられる / JWT を使うときの注意（alg、期限、取り消せない、置き場所）を説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part10/ch52-session-token/` で実行します（第10部のフォルダのコピーは、第51章の最初に作りました）。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part10/ch52-session-token
>   ```
>
> - ポート **9627** を使います（2・5・8節。同時には1つだけ動かします）。
> - 2節の `session-app.ts` は、第51章 3節の `password.ts` を使います。このフォルダの直下にコピーしてから始めます: `cp samples/password.ts .`
> - 6・7節の JWT は、ほかの節と離れています。時間が無ければ、6節の「手を動かす」と7節の表だけを読んでもかまいません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| express-session でログイン・ログアウト（2節） | 第53章（メールの確認の後にログイン）、成果物（ログインの API） |
| Cookie の属性とセッション固定（3節） | 第55章（総点検）、第12部（HTTPS の本番で `Secure`・`trust proxy`） |
| `requireAuth` とセッションの終わり（4節） | 成果物（`/api/tasks` をログインした人だけに） |
| CSRF への備え（5節） | 第54章（OAuth の `state`）、第55章、成果物 |
| JWT の作りと確かめ方（6・7節） | 第54章（OpenID Connect の ID トークンは JWT） |
| ほかの端末のセッションを消す（8節） | 第53章（パスワードの再設定の後）、成果物 |

---

## 1. ログインした状態を、どこに置くか

HTTP のリクエストは、1つずつ独立しています（第2部 第6章）。ログインした後のリクエストで「だれか」を分かるようにするには、ログインのときに、ブラウザに何かを渡して、次から毎回送ってもらいます。渡すものには、大きく2つの考え方があります。

| | サーバのセッション | トークン（JWT など） |
| --- | --- | --- |
| ブラウザが持つもの | ランダムな **ID** だけ（と、改ざんを防ぐ署名） | 「だれか・いつまで有効か」の**中身**と、その署名 |
| 中身の置き場所 | サーバ（メモリ・Redis・データベース） | トークンの中 |
| サーバが毎回すること | ID で保存場所を引く | 署名と期限を計算で確かめる（保存場所を引かない） |
| ログアウト・取り消し | 保存場所から消せば、その時点で使えない | 期限まで使える（消す仕組みを別に作る必要がある） |
| 向いている所 | ブラウザの画面とその API（この教材のアプリ） | 別の会社・別のサービスに「だれか」を伝える（第54章の ID トークン）、サービスの間の呼び出し |

第4部 第22章では、サーバのセッションを `node:http` だけで自作しました（`SessionStore`・`withSession`）。この章では、同じことを **express-session** でします。

**Flask では**: Flask の `session` は、中身（辞書）を JSON にして署名し、Cookie にそのまま入れます（itsdangerous というライブラリが署名します）。サーバには何も保存しません。つまり、上の表の「トークン」に近い作りです。中身は base64 なのでだれでも読めますが、署名があるので書き換えられません。Flask-Login は、この `session` にユーザーの id を入れて、ログインした状態を覚えます。サーバに保存したいときは、Flask-Session という拡張を使います。

## 2. express-session でログインを覚える

### 2.1 手を動かす: ログインと「自分」を返す API

`session-app.ts` を作ります。第51章 5節の登録・ログインの API から、ログインだけを取り出して、セッションを足したものです。まず、セッションを使う準備と、ログインまで書きます。

```ts
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { hashPassword, verifyPassword } from './password.ts';

// req.session に入れる値の型を、express-session の型に足す（宣言のマージ。第7部 第37章 5.2節）
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(256),
});
const DUMMY_HASH = await hashPassword('dev-only-dummy-password');

// 試しやすいように、alice を最初から登録しておく
const users = new Map([
  ['alice@example.com', { id: 1, email: 'alice@example.com', passwordHash: await hashPassword('neko-to-inu-to-tori') }],
]);

const app = express();
app.use(express.json());
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET ?? 'dev-only-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 },
  }),
);

app.post('/api/login', async (req, res) => {
  const parsed = Credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
  const user = users.get(parsed.data.email);
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);
  if (user === undefined || !ok) return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });

  // ログインの前に、セッションの ID を作り直す（3.2節）
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ detail: 'ログインできませんでした' });
    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email });
  });
});
```

`session({...})` の設定を1つずつ見ます（第5部 第24章でも見ました）。

| 設定 | 意味 | なぜこの値か |
| --- | --- | --- |
| `name: 'sid'` | Cookie の名前 | 既定の `connect.sid` は「Express を使っている」と教えてしまう |
| `secret` | Cookie に付ける署名の鍵 | ID を書き換えられないように。本番では環境変数から、32文字以上のランダムな値（第4部 第22章） |
| `resave: false` | 中身が変わっていなければ、保存し直さない | 同時のリクエストで、片方の書き込みが消えるのを防ぐ |
| `saveUninitialized: false` | 何も入れていないセッションは作らない | ログインするまで Cookie を出さない。見るだけの人の分を保存しない |
| `cookie` | Cookie の属性 | 3節 |

`req.session` は、リクエストごとにサーバが保存場所から読み出した「その人の箱」です。値を入れると、応答を返すときに express-session が保存します。

続けて、「自分」を返す API とログアウトを足し、最後に起動します。

```ts
app.get('/api/me', (req, res) => {
  if (req.session.userId === undefined) return res.status(401).json({ detail: 'ログインしてください' });
  const user = [...users.values()].find((u) => u.id === req.session.userId);
  res.json({ id: user?.id, email: user?.email });
});

app.post('/api/logout', (req, res) => {
  // サーバのセッションを消し、ブラウザの Cookie も消してもらう
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ detail: 'ログアウトできませんでした' });
    res.clearCookie('sid');
    res.status(204).end();
  });
});

app.listen(9627, '127.0.0.1', () => console.log('http://127.0.0.1:9627'));
```

```sh
$ node session-app.ts
http://127.0.0.1:9627
```

（完成形は [samples/session-app.ts](samples/session-app.ts) です。4節の `requireAuth` を先に入れた形になっています。うまく動かないときは比べてください。）

### 2.2 手を動かす: curl に Cookie を覚えさせる

ブラウザの代わりに、`curl` で試します。別のターミナルを開きます。`curl` の新しいオプションは2つです。

| オプション | 意味 |
| --- | --- |
| `-c ファイル` | 応答の `Set-Cookie` を、ファイルに書き出す（cookie jar） |
| `-b ファイル` | ファイルの Cookie を、リクエストの `Cookie` ヘッダに付けて送る |

ほかは前に使ったものです（`-s` 進み具合を出さない、`-i` 応答のヘッダも出す、`-H` ヘッダを足す、`-d` ボディを送る（POST になる）、`-X` メソッドを決める）。

```sh
$ cd ~/dev/part10/ch52-session-token
$ curl -s http://127.0.0.1:9627/api/me
{"detail":"ログインしてください"}
$ curl -s -i -c cookies.txt -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}' http://127.0.0.1:9627/api/login
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 36
ETag: W/"24-wdm9+zNih0s0kmTA9oSYiCDwmiY"
Set-Cookie: sid=s%3An3ogbMB6URCuit05-1Y62tZno2c--hvD.FA8XiyX20adNHxDUnsNHcjCTu2w7j3eqp%2FEcVjNjQWY; Path=/; Expires=Tue, 24 Nov 2026 16:32:47 GMT; HttpOnly; SameSite=Lax
Date: Tue, 17 Nov 2026 16:32:47 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":1,"email":"alice@example.com"}
$ curl -s -b cookies.txt http://127.0.0.1:9627/api/me
{"id":1,"email":"alice@example.com"}
```

（`\` は「次の行に続く」の印です。ID・日時は、毎回違います。）

`Set-Cookie` の値を読みます。`%3A` は `:` を URL の形にしたものです。

| 部分 | 意味 |
| --- | --- |
| `s:` | 「署名付き」の印 |
| `n3ogbMB6URCuit05-1Y62tZno2c--hvD` | セッションの ID（ランダムな 24 バイト）。サーバの保存場所を引くキー |
| `.FA8Xiy…` | ID の HMAC-SHA256 の署名（`secret` で計算。第4部 第22章の `sign` と同じ考え方） |
| `Expires=…` | `maxAge` の 7 日後。これが無い Cookie は、ブラウザを閉じると消える |

`cookies.txt` も見てみます（`cat` はファイルの中身を出すコマンド）。

```sh
$ cat cookies.txt
# Netscape HTTP Cookie File
# https://curl.se/docs/http-cookies.html
# This file was generated by libcurl! Edit at your own risk.

#HttpOnly_127.0.0.1	FALSE	/	FALSE	1795537967	sid	s%3An3ogbMB6URCuit05-1Y62tZno2c--hvD.FA8XiyX20adNHxDUnsNHcjCTu2w7j3eqp%2FEcVjNjQWY
```

Cookie の中には、alice のメールアドレスも、ユーザーの id も入っていません。**ID だけ**です。`userId: 1` は、サーバのメモリの中にあります。

### 2.3 手を動かす: ログアウトした後の Cookie

ログアウトする前の Cookie を `old.txt` に取っておき、ログアウトしてから、取っておいた Cookie で試します（`cp` はファイルをコピーするコマンド）。

```sh
$ cp cookies.txt old.txt
$ curl -s -i -b cookies.txt -c cookies.txt -X POST http://127.0.0.1:9627/api/logout
HTTP/1.1 204 No Content
X-Powered-By: Express
Set-Cookie: sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
…
$ curl -s -b old.txt http://127.0.0.1:9627/api/me
{"detail":"ログインしてください"}
```

- `clearCookie` は、値が空で、期限が過去（1970年）の `Set-Cookie` を送ります。ブラウザは、これを見て Cookie を消します。
- 大事なのは2つ目です。盗まれた Cookie（`old.txt`）を送っても、**サーバの保存場所から消えている**ので、ログインした状態に戻りません。これがサーバのセッションの強みです（7節で JWT と比べます）。

`Ctrl+C` でサーバを止めます。

> **MemoryStore は開発用です。** express-session の既定の保存場所（MemoryStore）は、プロセスのメモリです。再起動すると全員がログアウトし、サーバを2台にすると共有できず、古いセッションを消す仕組みも弱いので、本番では使いません（起動するとき、本番では警告が出ます）。本番では Redis（connect-redis。第6部 第34章 5節で自作したものと同じ考え方）や、PostgreSQL（connect-pg-simple、または自分で書く store）を使います。成果物では PostgreSQL の表に保存します。

## 3. Cookie の属性とセッション固定

### 3.1 属性の意味

2.2節の `Set-Cookie` に付いていた属性と、本番で足すものです（第2部 第7章、第4部 第22章）。

| 属性 | 意味 | 何を防ぐか |
| --- | --- | --- |
| `HttpOnly` | JavaScript（`document.cookie`）から読めない | ページに XSS（第55章）があっても、Cookie の値を盗まれにくい |
| `Secure` | HTTPS のときだけ送る | 途中の通信から Cookie を読まれる。開発の `http://127.0.0.1` では付けない（付けるとブラウザが送らない） |
| `SameSite=Lax` | ほかのサイトから始まった POST などには付けない。リンクで来た GET には付ける | CSRF（5節）の多く |
| `Path=/` | どのパスに送るか | |
| `Expires`・`Max-Age` | いつまで覚えるか | 無ければ、ブラウザを閉じるまで |
| 名前の `__Host-` | 「`Secure`・`Path=/`・`Domain` なし」のときだけ受け取る | ほかのサブドメインから、同じ名前の Cookie を上書きされる |

`SameSite` の3つの値も表にします。

| 値 | ほかのサイトからのリンク（GET） | ほかのサイトからのフォームの POST・`fetch` | 使う所 |
| --- | --- | --- | --- |
| `Strict` | 送らない（リンクで来ると、ログインしていない画面になる） | 送らない | 銀行の振込のように、特に大事な Cookie |
| `Lax` | 送る | 送らない | ログインのセッション（ふつうはこれ。今のブラウザの既定） |
| `None` | 送る | 送る（`Secure` が必要） | ほかのサイトに埋め込まれる部品 |

### 3.2 セッション固定と `regenerate`

**セッション固定**（session fixation）は、攻撃する人が、自分の知っている ID を、相手のブラウザに持たせておく攻撃です。相手がその ID のままログインすると、攻撃する人も同じ ID で「ログインした相手」になれます。

防ぎ方は、**ログインしたら、ID を新しく作り直す**ことです。`req.session.regenerate` は、今のセッションを消して、新しい ID のセッションを作ります。

### 3.3 手を動かす: ID が変わることを確かめる

もう一度 `node session-app.ts` で起動し、別のターミナルで、1回目のログインの Cookie（`a.txt`）を持ったまま、もう1回ログインして（`b.txt`）、ID を比べます。

```sh
$ curl -s -c a.txt -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}' http://127.0.0.1:9627/api/login
{"id":1,"email":"alice@example.com"}
$ curl -s -b a.txt -c b.txt -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}' http://127.0.0.1:9627/api/login
{"id":1,"email":"alice@example.com"}
$ grep sid a.txt
#HttpOnly_127.0.0.1	FALSE	/	FALSE	…	sid	s%3A8akNVcDq8jQfwnor…
$ grep sid b.txt
#HttpOnly_127.0.0.1	FALSE	/	FALSE	…	sid	s%3AQY_ngZ4PMrY38zFd…
```

（`grep 文字列 ファイル` は、その文字列を含む行だけを出すコマンドです。第1部 第1章。長い所は `…` で省略しています。）

前の ID を送っても、ログインした後は別の ID になりました。`regenerate` を消して試すと、同じ ID のままになります（試したら、元に戻してください）。

> 同じ理由で、**権限が変わるとき**（管理者の画面に入る、パスワードを変える）にも、ID を作り直します。

## 4. ログインしている人だけを通す

### 4.1 手を動かす: `requireAuth`

ログインが必要な API ごとに `if (req.session.userId === undefined)` を書くと、書き忘れが起きます。ミドルウェア（第5部 第24章）にまとめます。`session-app.ts` に足します。

```ts
import type { RequestHandler } from 'express'; // ファイルの先頭の import に足す

/** ログインしていなければ 401 で止める */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session.userId === undefined) {
    res.status(401).json({ detail: 'ログインしてください' });
    return;
  }
  next();
};
```

`/api/me` を `app.get('/api/me', requireAuth, (req, res) => { … })` に変え、中の `if` を消します。動きは同じです。

ミドルウェアで見つけた値を、後の処理に渡したいときは、`res.locals` を使います。`res.locals` は、1つのリクエストの間だけ使える、何でも入れてよいオブジェクトです。たとえば、`requireAuth` の中でユーザーを探して `res.locals.user = user` と入れておけば、後の処理は `res.locals.user` で読めます（練習問題3）。成果物では、`/api/tasks` の Router の前に `requireAuth` を置き、タスクの API をまとめてログインした人だけにします。

### 4.2 セッションをいつ終わらせるか

`maxAge` は「ブラウザが Cookie をいつまで覚えるか」です。サーバの側でも、次の2つの時間で、セッションを終わらせます。

| 時間 | 意味 | 目安（OWASP） |
| --- | --- | --- |
| 使っていない時間（idle timeout） | 最後のリクエストから、どれだけたったか | 大事なアプリは 2〜5 分、ふつうは 15〜30 分 |
| ログインしてからの時間（absolute timeout） | 使い続けていても、ログインし直してもらうまで | 4〜8 時間〜数日（アプリによる） |

express-session の `rolling: true` は、リクエストのたびに Cookie の期限を延ばします（使っていない時間の Cookie 版）。ログインしてからの時間は、express-session には無いので、ログインの時刻を `req.session` に入れて、自分で確かめます（練習問題7）。

## 5. CSRF に備える

### 5.1 CSRF とは

**CSRF**（Cross-Site Request Forgery）は、ログインしている人のブラウザに、ほかのサイトから、リクエストを送らせる攻撃です（第2部 第10章 6.1節、第4部 第22章）。ブラウザは、行き先のサイトの Cookie を自動で付けるので、サーバからは「本人が送った」ように見えます。

| 備え | 何をするか | この教材 |
| --- | --- | --- |
| GET で書き換えない | 状態を変えるのは POST・PATCH・DELETE だけにする | 第2部から |
| `SameSite=Lax` | ほかのサイトから始まった POST には Cookie を付けない | 3節 |
| `Origin` を確かめる | 書き換えのリクエストの `Origin` ヘッダが、自分のサイトか確かめる | この節 |
| CSRF トークン | フォームに、セッションと結びついたランダムな値を入れて確かめる | 第4部 第22章 |

`SameSite=Lax` だけでは、足りない場面があります。「サイト」は `example.com` のような登録できるドメインの単位なので、同じサイトの別のサブドメイン（`blog.example.com`）からのリクエストには Cookie が付きます。また、古いブラウザは `SameSite` を知りません。そこで、2つ目の備えとして `Origin` を確かめます。

ブラウザは、POST などのリクエストに `Origin` ヘッダ（`https://example.com` のような、送ったページのオリジン）を付けます。ページの JavaScript は、この値を書き換えられません。

### 5.2 手を動かす: `Origin` を確かめるミドルウェア

`same-origin.ts` を作ります。

```ts
import type { RequestHandler } from 'express';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireSameOrigin(allowed: readonly string[]): RequestHandler {
  return (req, res, next) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.get('Origin');
    if (origin === undefined || !allowed.includes(origin)) {
      res.status(403).json({ detail: 'このサイトからのリクエストは受け付けません' });
      return;
    }
    next();
  };
}
```

試すための小さなアプリ `csrf-check.ts` を作ります。

```ts
import express from 'express';
import { requireSameOrigin } from './same-origin.ts';

const app = express();
app.use(express.json());
app.use(requireSameOrigin(['http://127.0.0.1:9627', 'http://localhost:5173']));

app.get('/api/tasks', (_req, res) => {
  res.json([{ id: 1, title: '牛乳を買う' }]);
});
app.post('/api/tasks', (_req, res) => {
  res.status(201).json({ id: 2, title: '新しいタスク' });
});

app.listen(9627, '127.0.0.1', () => console.log('http://127.0.0.1:9627'));
```

`node csrf-check.ts` で起動し、別のターミナルで試します。`curl` はブラウザではないので、`Origin` を付けません。`-H 'Origin: …'` で、ブラウザの代わりに付けます。

```sh
$ curl -s http://127.0.0.1:9627/api/tasks
[{"id":1,"title":"牛乳を買う"}]
$ curl -s -X POST http://127.0.0.1:9627/api/tasks
{"detail":"このサイトからのリクエストは受け付けません"}
$ curl -s -X POST -H 'Origin: https://other.example' http://127.0.0.1:9627/api/tasks
{"detail":"このサイトからのリクエストは受け付けません"}
$ curl -s -X POST -H 'Origin: http://127.0.0.1:9627' http://127.0.0.1:9627/api/tasks
{"id":2,"title":"新しいタスク"}
```

| リクエスト | 結果 | 理由 |
| --- | --- | --- |
| GET | 通る | 読むだけ（書き換えない）なので確かめない |
| POST、`Origin` なし | 403 | だれが送ったか分からないものは断る |
| POST、ほかのオリジン | 403 | 自分のサイトではない |
| POST、自分のオリジン | 201 | |

- `curl` のように `Origin` を付けないプログラムも、これで断られます。スマートフォンのアプリなど、ブラウザ以外から呼ぶ API は、Cookie ではなくトークン（6節）で認証し、このチェックを通さない別の道にします。
- `Origin` を付けない古いブラウザや、プライバシーの設定で `Origin` が `null` になる場面もあります。そのときは `Referer` ヘッダ（送ったページの URL）のオリジンで確かめる、という方法があります（練習問題5）。
- 今のブラウザは `Sec-Fetch-Site`（`same-origin`・`same-site`・`cross-site`）というヘッダも付けます。第55章で見ます。

> 第8部の画面（`localhost:5173`）は、Vite のプロキシ（第8部 第40章 5節）で API を呼びます。ブラウザから見ると同じオリジンなので、`Origin: http://localhost:5173` が付き、`allowed` に入れておけば通ります。

## 6. JWT（JSON Web Token）

### 6.1 手を動かす: JWT を作って、中を見る

**JWT**（JSON Web Token、RFC 7519）は、「中身（だれ・いつまで）」に署名を付けて、1つの文字列にしたものです。サーバのセッションと違い、サーバは何も保存しません。どう作られているかを見るために、`node:crypto` だけで作ります（本物のアプリでは、jose などのよく使われているライブラリを使います）。

`jwt.ts` を作ります。まず、作る側です。

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 1つ目（ヘッダ）と2つ目（中身）は、ただの base64url の JSON。だれでも読める */
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

function signature(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

/** 中身に、発行した時刻（iat）と期限（exp）を足して、署名した文字列を作る */
export function signJwt(payload: Record<string, unknown>, secret: string, { expiresInSec = 900, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...payload, iat, exp: iat + expiresInSec })}`;
  return `${data}.${signature(data, secret).toString('base64url')}`;
}
```

- **base64url** は、base64 の `+` `/` を `-` `_` に変え、最後の `=` を取ったものです。URL やヘッダにそのまま入れられます。`Buffer` の `toString('base64url')` で作れます。
- 時刻は、ミリ秒ではなく**秒**（UNIX 時間）で書く決まりです。
- `HS256` は「HMAC-SHA256 で署名した」という意味です。同じ鍵（`secret`）で作り、同じ鍵で確かめます。

続けて、確かめる側です。

```ts
/** 確かめた中身を返す。おかしければ例外を投げる */
export function verifyJwt(token: string, secret: string, { now = Date.now() } = {}): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT の形ではありません');
  const [h = '', p = '', s = ''] = parts;
  const header: unknown = JSON.parse(Buffer.from(h, 'base64url').toString());
  // ヘッダの alg は、送ってきた人が書いたもの。信じずに、こちらが決めた HS256 だけを受け付ける
  if (typeof header !== 'object' || header === null || !('alg' in header) || header.alg !== 'HS256') {
    throw new Error('alg が HS256 ではありません');
  }
  const expected = signature(`${h}.${p}`, secret);
  const actual = Buffer.from(s, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('署名が合いません');
  const payload: unknown = JSON.parse(Buffer.from(p, 'base64url').toString());
  if (typeof payload !== 'object' || payload === null) throw new Error('中身がオブジェクトではありません');
  const claims = payload as Record<string, unknown>;
  if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(now / 1000)) throw new Error('期限が切れています');
  return claims;
}
```

（最後の `as` は、「オブジェクトである」ことを確かめた直後なので使っています。練習問題6では、`as` を使わない形と、失敗の理由を例外ではなく値で返す形にします。）

試すファイル `try-jwt.ts` を作ります。時刻は、結果が毎回同じになるように決めた値（`Date.UTC`）を渡します。

```ts
import { signJwt, verifyJwt } from './jwt.ts';

const SECRET = 'dev-only-jwt-secret-at-least-32-bytes!';
const token = signJwt({ sub: '1', email: 'alice@example.com' }, SECRET, { now: Date.UTC(2026, 10, 18, 9, 0, 0) });
console.log(token);

// 2つ目の部分は、鍵が無くても読める
const [, payload = ''] = token.split('.');
console.log(Buffer.from(payload, 'base64url').toString());

// 確かめる（期限の前）
console.log(verifyJwt(token, SECRET, { now: Date.UTC(2026, 10, 18, 9, 5, 0) }));
```

```sh
$ node try-jwt.ts
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhbGljZUBleGFtcGxlLmNvbSIsImlhdCI6MTc5NDk5MjQwMCwiZXhwIjoxNzk0OTkzMzAwfQ.dMHKN4rzqZWQcD3j6r1k8jfumphIpl38L9URWHkBWLo
{"sub":"1","email":"alice@example.com","iat":1794992400,"exp":1794993300}
{
  sub: '1',
  email: 'alice@example.com',
  iat: 1794992400,
  exp: 1794993300
}
```

`.` で区切られた3つの部分です。

| 部分 | 中身 | 読めるか |
| --- | --- | --- |
| 1つ目（ヘッダ） | `{"alg":"HS256","typ":"JWT"}` | だれでも読める |
| 2つ目（中身、**クレーム**） | `sub`（だれ）・`iat`（発行した時刻）・`exp`（期限）など | **だれでも読める**。秘密は入れない |
| 3つ目（署名） | 1つ目と2つ目を `.` でつないだ文字列の HMAC | 鍵が無いと作れない |

決まった名前のクレームの例です（RFC 7519 4.1節）。

| 名前 | 意味 |
| --- | --- |
| `sub` | だれのトークンか（subject。ユーザーの id など。文字列にする） |
| `iat` | 発行した時刻（issued at） |
| `exp` | 期限（expiration）。この時刻から使えない |
| `nbf` | この時刻より前は使えない（not before） |
| `iss` | だれが発行したか（issuer） |
| `aud` | だれに向けたものか（audience）。受け取る側は、自分あてか確かめる |

### 6.2 手を動かす: 書き換えると、どうなるか

`try-jwt.ts` に足します。違う鍵、期限の後、中身を書き換えたもの、の3つを試します。

```ts
const tries: [string, () => unknown][] = [
  ['違う鍵', () => verifyJwt(token, 'dev-only-another-secret-32-bytes!!', { now: Date.UTC(2026, 10, 18, 9, 5, 0) })],
  ['期限の後', () => verifyJwt(token, SECRET, { now: Date.UTC(2026, 10, 18, 9, 20, 0) })],
  [
    '中身を書き換えた',
    () => {
      const [h, , s] = token.split('.');
      const changed = Buffer.from(JSON.stringify({ sub: '2', email: 'bob@example.com', exp: 9999999999 })).toString('base64url');
      return verifyJwt(`${h}.${changed}.${s}`, SECRET, { now: Date.UTC(2026, 10, 18, 9, 5, 0) });
    },
  ],
];
for (const [label, fn] of tries) {
  try {
    fn();
    console.log(label, '→ 通ってしまった');
  } catch (err) {
    console.log(label, '→', err instanceof Error ? err.message : err);
  }
}
```

```sh
$ node try-jwt.ts
（前の出力は省略）
違う鍵 → 署名が合いません
期限の後 → 期限が切れています
中身を書き換えた → 署名が合いません
```

中身はだれでも読めますが、書き換えると署名が合わなくなります。完成形は [samples/jwt.ts](samples/jwt.ts)・[samples/try-jwt.ts](samples/try-jwt.ts) です。

## 7. JWT を使うときの注意

### 7.1 よくある間違い

| 間違い | 何が起きるか | 守り方 |
| --- | --- | --- |
| ヘッダの `alg` を信じる | `alg` を `none`（署名なし）や別の方式に書き換えたトークンが通る、という事故が、昔のライブラリで何度も起きた | 確かめる側が、受け付ける方式を決めておく（6.1節の `verifyJwt`、jose の `algorithms` の設定） |
| 短い・推測できる鍵 | 1つのトークンから、鍵を総当たりで見つけられる | HS256 なら、32 バイト以上のランダムな値（`randomBytes(32)`） |
| 期限が無い・長い | 漏れたトークンが、いつまでも使える | `exp` を必ず入れ、短く（数分〜1時間） |
| 中身に秘密を入れる | だれでも読める（6.1節） | id など、見られてよいものだけ |
| `iss`・`aud` を見ない | 別のサービスあてのトークンが、こちらでも通る | 発行した人と、あて先を確かめる（練習問題6、第54章） |

### 7.2 取り消せない

JWT の一番大きな性質は、**サーバが何も保存しないので、期限まで取り消せない**ことです。2.3節のように、ログアウトした後の値を送っても、署名と期限が合っていれば通ります。

取り消したいときによく使う形が、2つのトークンに分けるやり方です。

| トークン | 期限 | 置き場所の例 | 確かめ方 |
| --- | --- | --- | --- |
| アクセストークン（JWT） | 短い（5〜15分） | アプリのメモリ | 署名と期限だけ（速い） |
| リフレッシュトークン | 長い（数日〜） | `HttpOnly` の Cookie | サーバの表を引く（消せる） |

でも、これは「リフレッシュトークンをサーバに保存して、消せるようにする」ことなので、結局サーバのセッションと同じ仕組みが要ります。

### 7.3 ブラウザのどこに置くか

| 置き場所 | XSS（第55章）があったとき | CSRF | 
| --- | --- | --- |
| `localStorage` | JavaScript から読めるので、**盗まれて、ほかの場所から使われる** | 自動では送られないので起きない |
| `HttpOnly` の Cookie | 読めない（でも、そのページの中からリクエストは送れる） | 起きうるので、5節の備えが要る |

### 7.4 どちらを使うか

この教材のアプリ（自分の画面から、自分の API を呼ぶ）では、**サーバのセッション + `HttpOnly` の Cookie** を使います。理由をまとめます。

| | サーバのセッション | JWT |
| --- | --- | --- |
| ログアウト・パスワードの変更で、すぐ使えなくする | できる（8節） | 期限まで待つか、拒否のリストを作る |
| 毎回の確かめ | 保存場所を引く（Redis なら 1ms ほど） | 計算だけ |
| サーバが複数台 | 保存場所を共有する（Redis・DB） | 鍵を共有するだけ |
| ほかのサービスに「だれか」を伝える | できない | できる |

JWT が活きるのは、「発行するサーバ」と「確かめるサーバ」が別のときです。第54章の OpenID Connect では、ログインを担当するサービス（GitHub など）が JWT の **ID トークン**を発行し、こちらのアプリが確かめます。そのときは、HS256（同じ鍵）ではなく、RS256（秘密鍵で署名し、公開鍵で確かめる。第2部 第8章）を使います。

## 8. サーバのセッションの強み: ほかの端末のセッションも消す

パスワードを変えたとき、「ほかの端末からはログアウトさせる」ことがよくあります。パスワードが盗まれていたなら、攻撃する人のセッションも消したいからです。サーバのセッションなら、保存場所から消すだけです。

### 8.1 手を動かす: ある人のセッションをすべて消す

express-session に、保存場所（store）を自分で作って渡すと、後から `store.destroy(ID, コールバック)` で、好きなセッションを消せます。今のリクエストのセッションの ID は `req.sessionID` です。`store-demo.ts` を作ります（パスワードは確かめず、store の使い方だけを見ます）。

```ts
import express from 'express';
import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    name: string;
  }
}

// 保存場所を自分で作って、session() に渡す。こうすると、後で store.destroy を呼べる
const store = new session.MemoryStore();
/** 名前 → その人のセッションの ID の集まり */
const sessionsOf = new Map<string, Set<string>>();

const app = express();
app.use(session({ name: 'sid', secret: 'dev-only-session-secret-change-me', store, resave: false, saveUninitialized: false }));

app.post('/login/:name', (req, res) => {
  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    const name = req.params.name;
    req.session.name = name;
    // req.sessionID は、今のセッションの ID（Cookie に署名を付けて入っている値）
    const set = sessionsOf.get(name) ?? new Set<string>();
    set.add(req.sessionID);
    sessionsOf.set(name, set);
    res.json({ name, sessions: set.size });
  });
});

app.get('/me', (req, res) => {
  if (req.session.name === undefined) return res.status(401).json({ detail: 'ログインしてください' });
  res.json({ name: req.session.name });
});
```

`store.destroy` は、コールバックの形の関数です。`await` で待てるように、Promise に包みます（第3部 第12章）。

```ts
/** store.destroy はコールバックの形なので、Promise に包む（第3部 第12章） */
function destroySid(sid: string) {
  return new Promise<void>((resolve, reject) => {
    store.destroy(sid, (err: unknown) => {
      if (err) reject(err instanceof Error ? err : new Error('セッションを消せませんでした'));
      else resolve();
    });
  });
}

// その人のセッションを、すべて消す（ほかの端末からも、ログアウトさせる）
app.post('/kick/:name', async (req, res) => {
  const set = sessionsOf.get(req.params.name) ?? new Set<string>();
  for (const sid of set) await destroySid(sid);
  sessionsOf.delete(req.params.name);
  res.json({ destroyed: set.size });
});

app.listen(9627, '127.0.0.1', () => console.log('http://127.0.0.1:9627'));
```

`node store-demo.ts` で起動し、「パソコン」（`pc.txt`）と「スマートフォン」（`phone.txt`）の2つの Cookie でログインしてから、まとめて消します。

```sh
$ curl -s -c pc.txt -X POST http://127.0.0.1:9627/login/alice
{"name":"alice","sessions":1}
$ curl -s -c phone.txt -X POST http://127.0.0.1:9627/login/alice
{"name":"alice","sessions":2}
$ curl -s -b pc.txt http://127.0.0.1:9627/me
{"name":"alice"}
$ curl -s -X POST http://127.0.0.1:9627/kick/alice
{"destroyed":2}
$ curl -s -b pc.txt http://127.0.0.1:9627/me
{"detail":"ログインしてください"}
$ curl -s -b phone.txt http://127.0.0.1:9627/me
{"detail":"ログインしてください"}
```

両方の Cookie が、その場で使えなくなりました。JWT では、こうはいきません（7.2節）。

- この `/kick/:name` は、だれでも呼べるので、試すためだけのものです。練習問題8で、ログインした本人だけが「すべての端末からログアウト」できる形と、パスワードを変えたら**ほかの**端末を消す形を書きます。
- 成果物では、セッションを PostgreSQL の表に `user_id` の列と一緒に保存するので、`DELETE FROM sessions WHERE user_id = $1` の1行で消せます。

## 9. Next.js では

Next.js（第9部）のアプリでも、考え方は同じです。

| この章 | Next.js |
| --- | --- |
| `req.session`・`res.cookie` | `cookies()`（`next/headers`）で読む。書く・消すのは Server Action か Route Handler の中だけ |
| `requireAuth` | ページ・Server Action・Route Handler の**それぞれ**で、Cookie からだれかを確かめる（Server Action は、ブラウザから直接呼べる URL なので、ページで確かめただけでは足りない。第9部 第49章 4節） |
| `requireSameOrigin` | Server Action は、Next.js が `Origin` と `Host` を比べて、違えば断る（`serverActions.allowedOrigins` で足せる）。Route Handler は自分で確かめる |
| express-session | 標準には無い。執筆時点では、Auth.js や、自分でセッションの表と Cookie を書く方法がよく使われる（必ず公式の説明で確認） |

## 10. Flask との対応

| この章 | Flask |
| --- | --- |
| express-session（ID だけを Cookie に、中身はサーバ） | Flask-Session。標準の `session` は中身ごと署名して Cookie に入れる（1節） |
| `secret` | `app.secret_key`（`SECRET_KEY`） |
| `cookie: { httpOnly, secure, sameSite, maxAge }` | `SESSION_COOKIE_HTTPONLY`・`SESSION_COOKIE_SECURE`・`SESSION_COOKIE_SAMESITE`・`PERMANENT_SESSION_LIFETIME` |
| `req.session.regenerate` | 標準の `session` は ID が無いので不要（中身が変わると値も変わる）。Flask-Login は `session_protection` で関連する対策をする |
| `req.session.destroy` | `session.clear()` |
| `requireAuth` | Flask-Login の `@login_required` |
| `requireSameOrigin`・CSRF トークン | Flask-WTF の `CSRFProtect` |
| 自作の `signJwt`・`verifyJwt` | PyJWT（`jwt.encode`・`jwt.decode(…, algorithms=["HS256"])`）、Flask-JWT-Extended |

## まとめ

- HTTP は覚えていないので、ログインの状態はブラウザに持たせて毎回送ってもらう。サーバのセッションは ID だけを、JWT は署名した中身を持たせる。
- express-session では、`saveUninitialized: false`・`resave: false`・名前の変更・環境変数の `secret` にし、Cookie は `HttpOnly`・`SameSite=Lax`・本番で `Secure`（と `__Host-`）にする。
- ログインしたら `regenerate` で ID を作り直す（セッション固定を防ぐ）。ログアウトでは `destroy` と `clearCookie`。
- ログインが必要な API は `requireAuth` でまとめて守る。使っていない時間と、ログインしてからの時間でセッションを終わらせる。
- 書き換えは GET でしない。`SameSite=Lax` に加えて、`Origin` が自分のサイトかを確かめる。
- JWT の中身はだれでも読める。確かめる側が `alg` を決め、`exp`・`iss`・`aud` を確かめる。期限まで取り消せない。
- 自分の画面と自分の API なら、サーバのセッションを使う。保存場所から消せるので、ほかの端末のログアウトもできる。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- OWASP Cheat Sheet「Session Management」: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Cheat Sheet「Cross-Site Request Forgery Prevention」: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Cheat Sheet「JSON Web Token for Java」（言語によらない注意が多い）: https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
- express-session: https://github.com/expressjs/session
- MDN「Set-Cookie」: https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Set-Cookie
- MDN「Origin」: https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Origin
- RFC 7519「JSON Web Token (JWT)」: https://www.rfc-editor.org/rfc/rfc7519
- RFC 8725「JSON Web Token Best Current Practices」: https://www.rfc-editor.org/rfc/rfc8725
- RFC 6265bis（Cookie の新しい決まりの案。`SameSite`・`__Host-`）: https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/
- Next.js Docs「Authentication」: https://nextjs.org/docs/app/guides/authentication

---

前の章: [第51章 認証の基礎](../ch51-auth-basics/README.md) ／ 第10部の目次: [../README.md](../README.md) ／ 次の章: [第53章 メール送信と本人確認](../ch53-email/README.md)
