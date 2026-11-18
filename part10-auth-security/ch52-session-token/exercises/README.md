# 第52章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part10/ch52-session-token/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 環境変数から Cookie の設定を作る | [cookie-options.ts](cookie-options.ts)、[cookie-options.test.ts](cookie-options.test.ts) | 2・3 |
| 2 | 基本 | base64url の JSON を作る・読む | [base64url.ts](base64url.ts)、[base64url.test.ts](base64url.test.ts) | 6.1 |
| 3 | 基本 | ログインしている人を探すミドルウェア | [require-auth.ts](require-auth.ts)、[require-auth.test.ts](require-auth.test.ts) | 2.3・4.1 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 1〜7 |
| 5 | 応用 | `Origin` が無いときは `Referer` で | [origin-check.ts](origin-check.ts)、[origin-check.test.ts](origin-check.test.ts) | 5 |
| 6 | 応用 | JWT を確かめて、理由を値で返す | [verify-jwt.ts](verify-jwt.ts)、[verify-jwt.test.ts](verify-jwt.test.ts) | 6・7 |
| 7 | 応用 | 使っていない時間・ログインしてからの時間 | [timeout.ts](timeout.ts)、[timeout.test.ts](timeout.test.ts) | 4.2 |
| 8 | 発展 | すべての端末からログアウト | [logout-all.ts](logout-all.ts)、[logout-all.test.ts](logout-all.test.ts) | 2・8 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第51章と同じです。問題4以外は、`○○.ts` の `// ここを書く` の所を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。最初は、「型: tsc のエラーが無い」以外のテストが失敗します。

```sh
$ node --test cookie-options.test.ts
```

- 書きかけの関数は `throw new Error('まだ書いていません…')` になっています。書くときに、この行を消してください。`void x;` の行は、書き終えたら消してかまいません。
- 模範解答で試すには `MODULE=../solutions/cookie-options.ts node --test cookie-options.test.ts` のように、`MODULE` に模範解答のファイルを指定します。
- [client.ts](client.ts) は、テストの部品です。アプリを空いているポートで起動し、ブラウザの代わりに Cookie を覚えて送ります（本文2.2節の `curl -c`・`-b` と同じこと）。書き換えなくてかまいません。
- [password.ts](password.ts) は、第51章 3節の `password.ts` のコピーです。問題8で使います。
- [typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です（第7部と同じ）。

---

## 基本

### 問題1 環境変数から Cookie の設定を作る

[cookie-options.ts](cookie-options.ts) に、`cookieOptions(env)` を書いてください。`env` は `process.env` と同じ形（名前 → 文字列か `undefined`）です。`{ name, cookie }` を返し、`session({ name, cookie, … })` にそのまま渡せる形にします。

| 項目 | 値 |
| --- | --- |
| `name` | `NODE_ENV` が `production` なら `__Host-sid`、それ以外（無い・`test`・`development`）は `sid` |
| `cookie.httpOnly` | `true` |
| `cookie.sameSite` | `'lax'` |
| `cookie.secure` | `NODE_ENV` が `production` のときだけ `true` |
| `cookie.path` | `'/'` |
| `cookie.maxAge` | `SESSION_DAYS` 日（ミリ秒）。無ければ 7 日 |

- `SESSION_DAYS` が 1〜30 の整数を表す文字列（`'1'`〜`'30'`）でなければ、メッセージに `SESSION_DAYS` を含む `Error` を投げる。`''`・`' 3'`・`'1.5'`・`'1e1'`・`'-2'` も断る
- なぜ本番だけ `__Host-` にするのか、ファイルのコメントに1行で書く（本文3.1節）

```sh
$ node --test cookie-options.test.ts
```

ヒント: `Number('')` は `0`、`Number(' 3 ')` は `3`、`Number('1e1')` は `10` です。先に `/^[0-9]+$/` で「数字だけか」を確かめてから `Number` にします。

### 問題2 base64url の JSON を作る・読む

[base64url.ts](base64url.ts) に、JWT の1つ目と2つ目の部分を作る・読む関数を書いてください（本文6.1節）。

| 関数 | すること |
| --- | --- |
| `encodePart(value)` | オブジェクトを JSON にして、base64url の文字列にする |
| `decodePart(text)` | `encodePart` の逆。オブジェクト（配列でない）を返す。次のどれかなら `null` |

`decodePart` が `null` を返すもの:

- 空の文字列、または `A`〜`Z`・`a`〜`z`・`0`〜`9`・`-`・`_` 以外の文字（`=`・`+`・`/`・空白など）がある。`Buffer.from(text, 'base64url')` は知らない文字を黙って飛ばすので、先に確かめます
- 長さを 4 で割って 1 余る（base64url は 4 文字で 3 バイトを表すので、この長さはどのバイト列からも作られない）
- JSON として読めない
- 読めたが、オブジェクトでない（配列・数・`null`・文字列）

```sh
$ node --test base64url.test.ts
```

ヒント: 戻り値の型を `Record<string, unknown>` にするには、`as` ではなく型ガード（第7部 第36章 3節）を書きます。

### 問題3 ログインしている人を探すミドルウェア

[require-auth.ts](require-auth.ts) に、本文4.1節の `requireAuth` を広げた `requireAuth(findUser)` を書いてください。`findUser` は「id からユーザーを探す関数」で、見つからなければ `undefined` を返します。`requireAuth(findUser)` は、ミドルウェアを返します。

- `req.session.userId` が無ければ、401 と `{ "detail": "ログインしてください" }`
- `findUser(userId)` が `undefined`（ユーザーが消された）なら、`req.session.destroy` でセッションを消し、`res.clearCookie('sid')` をして、同じ 401 を返す
- 見つかれば、`res.locals.user` にユーザーを入れて `next()`

```sh
$ node --test require-auth.test.ts
```

テストは、本物の express-session を使う小さなアプリ（テストの中の `makeApp`）に、あなたの `requireAuth` をつないで確かめます。「消されたセッションの Cookie は、ユーザーが戻っても使えない」のテストは、セッションを消し忘れると失敗します。

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。Cookie の中身、`saveUninitialized`、`SameSite`、JWT の中身と取り消し、401 と 403 についての問いです。

---

## 応用

### 問題5 `Origin` が無いときは `Referer` で

[origin-check.ts](origin-check.ts) に、本文5.2節の `requireSameOrigin` を広げたものを書いてください。判断の部分は、テストしやすいように、ふつうの関数 `isAllowedRequest(method, headers, allowed)` に分けます。

`isAllowedRequest` の決まり:

1. メソッドが `GET`・`HEAD`・`OPTIONS` なら `true`（小文字で来ても同じに扱う）
2. `headers.origin` があれば、それが `allowed` に入っているかだけで決める（`Referer` は見ない）
3. `headers.origin` が無く、`headers.referer` があれば、その URL のオリジン（`new URL(…).origin`。第2部 第9章）が `allowed` に入っているかで決める。URL として読めなければ `false`
4. どちらも無ければ `false`

`requireSameOrigin(allowed)` は、`req.get('Origin')`・`req.get('Referer')` を `isAllowedRequest` に渡し、`false` なら 403 と `{ "detail": "このサイトからのリクエストは受け付けません" }` を返すミドルウェアです。

```sh
$ node --test origin-check.test.ts
```

> `Referer` の前方一致（`startsWith('http://localhost:5173')`）で比べると、`http://localhost:5173.other.example/` も通ってしまいます。テストに、この例が入っています。

### 問題6 JWT を確かめて、理由を値で返す

[verify-jwt.ts](verify-jwt.ts) に、本文6.1節の `verifyJwt` を、次のように変えたものを書いてください。

- 例外を投げずに、`{ ok: true, claims }` か `{ ok: false, error }` を返す（第7部 第36章 6節の Result 型）
- `options` で `now`（ミリ秒）・`issuer`・`audience`・`leewaySec`（時計のずれとして許す秒。既定 0）を受け取る

上から順に確かめ、最初に当てはまった理由を `error` にします。

| `error` | 当てはまるとき |
| --- | --- |
| `malformed` | `.` で3つに分かれない。1つ目・2つ目が問題2の `decodePart` で読めない。3つ目が空か、base64url で使わない文字がある |
| `alg` | ヘッダの `alg` が `HS256` でない（無いときも） |
| `signature` | 署名が合わない（`timingSafeEqual` で比べる） |
| `claim` | `exp` が無い・数でない。`nbf` があって数でない |
| `expired` | `exp + leewaySec` が今の秒以下 |
| `not_yet_valid` | `nbf - leewaySec` が今の秒より大きい |
| `claim` | `issuer` を指定したのに `iss` が違う。`audience` を指定したのに `aud` が違う（`aud` は文字列か、文字列の配列。配列なら、その中にあればよい） |

（表の `claim` は2か所にあります。`exp` を見る前と、`nbf` の後です。）

```sh
$ node --test verify-jwt.test.ts
```

ヒント: 問題2の `decodePart` を、このファイルにコピーして使ってかまいません。署名が合うまでは、中身（`exp` など）を見ないようにします。

### 問題7 使っていない時間・ログインしてからの時間

[timeout.ts](timeout.ts) に、本文4.2節の2つの時間でセッションを終わらせる部品を書いてください。ログインの処理が、`req.session.createdAt`・`req.session.lastSeenAt` にログインした時刻（ミリ秒）を入れている前提です。

| 関数 | すること |
| --- | --- |
| `checkTimes(times, now, { idleMs, absoluteMs })` | `now - createdAt` が `absoluteMs` 以上なら `'absolute'`、そうでなく `now - lastSeenAt` が `idleMs` 以上なら `'idle'`、どちらでもなければ `'ok'` |
| `sessionTimeouts({ idleMs, absoluteMs, now })` | ミドルウェアを返す。`now` は今の時刻を返す関数（既定 `Date.now`。テストで時計を進めるため） |

`sessionTimeouts` のミドルウェアの決まり:

- ログインしていない（`req.session.userId` が無い）なら、何もせずに `next()`
- `createdAt`・`lastSeenAt` が無ければ、今の時刻とみなす
- `checkTimes` が `'ok'` でなければ、セッションを消し、`res.clearCookie('sid')` をして、401 と `{ "detail": "もう一度ログインしてください" }`
- `'ok'` なら、`lastSeenAt` を今の時刻にして（`createdAt` が無かったら、それも入れて）`next()`

```sh
$ node --test timeout.test.ts
```

---

## 発展

### 問題8 すべての端末からログアウト

[logout-all.ts](logout-all.ts) の `createApp()` に、次の API を書いてください。alice（`neko-to-inu-to-tori`）と bob（`inu-to-saru-to-kiji`）は、最初から登録されています。セッションの保存場所 `store` は、本文8.1節と同じく自分で作って渡してあります。

| API | すること |
| --- | --- |
| `POST /api/login` | `{ email, password }`。本文2.1節と同じ（形が違えば 400、違えば 401、合えば `regenerate` して `userId` を入れ、200 と `{ id, email }`）。メールアドレスは前後の空白を除いて小文字にそろえる |
| `GET /api/me` | ログインしていれば 200 と `{ id, email }`、していなければ 401 |
| `POST /api/logout` | 今のセッションを消して 204（本文2.1節） |
| `POST /api/logout-all` | ログインしている人の**すべての**セッション（今の端末も含む）を消して 204。ログインしていなければ 401 |
| `POST /api/password` | `{ currentPassword, newPassword }`。ログインしていなければ 401、形が違えば（`newPassword` が 12 文字未満など）400、`currentPassword` が違えば 401。合えば新しいハッシュを保存し、**今の端末以外の**セッションを消して 204 |

- どの人がどのセッションを持っているかは、本文8.1節と同じく `Map<ユーザーの id, Set<セッションの ID>>` で覚えます。ID は `regenerate` の**後**の `req.sessionID` です
- ログアウトしたセッションは、`Set` から除いておきます（除かなくても、消えているセッションを `store.destroy` しても失敗はしません）
- 失敗した変更（401・400）では、どのセッションも消さない

```sh
$ node --test logout-all.test.ts
```

ヒント: `store.destroy` を Promise に包む関数（本文8.1節の `destroySid`）を作り、`for … of` と `await` で1つずつ消します。`/api/logout-all` では、`store` から消した後に、今のリクエストの `req.session.destroy` も呼びます。`store` から消しても、今のリクエストの `req.session` はメモリに残っていて、中身を変えると、応答を返すときに保存し直されてしまうからです。`req.session.destroy` は、それを止めて、Cookie を消す準備をします。
