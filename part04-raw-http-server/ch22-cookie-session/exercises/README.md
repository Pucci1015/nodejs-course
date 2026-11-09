# 第22章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | Cookie と乱数の結果を予想する | [predict-cookie.mjs](predict-cookie.mjs) | 3, 4 | — |
| 2 | Cookie を決まりどおりに読む・書く | [cookie.mjs](cookie.mjs)、[cookie.test.mjs](cookie.test.mjs) | 2, 3 | — |
| 3 | 署名付きの値と、鍵の取り替え | [signed.mjs](signed.mjs)、[signed.test.mjs](signed.test.mjs) | 5 | — |
| 4 | セッションの保存場所と `withSession` | [session.mjs](session.mjs)、[session.test.mjs](session.test.mjs) | 4, 6 | 空いている番号 |
| 5 | ログインのあるサイトの、セッションのバグを直す | [buggy-login.mjs](buggy-login.mjs)、[check-login.sh](check-login.sh) | 4〜8 | 9225 |

- 問題2・3・4は `node --test ○○.test.mjs` ですべてのテストが通れば完成です
- 問題5は `bash check-login.sh` で確かめます。模範解答は、問題2〜4の解答を使います
- この章の練習問題は、どれも**自分の Mac の中で動かしているサーバ**だけを相手にします。確認スクリプトが「知らない ID」や「CSRF トークンの無いフォーム」を送るのは、自分のサーバがそれを正しく断るかを確かめるためです

---

## 問題1 Cookie と乱数の結果を予想する

[predict-cookie.mjs](predict-cookie.mjs) に 14 個の式があります。[../samples/cookie-basic.mjs](../samples/cookie-basic.mjs) を読んでから、**実行する前に**結果を予想して書き出し、`node predict-cookie.mjs` で確かめてください。

特に、次の3つは理由を説明してください。

- 3番: ブラウザが同じ名前の Cookie を2つ送ってくるのは、どんなときか（ヒント: `Path`）
- 10〜12番: 同じ 32 バイトなのに、長さが違うのはなぜか。Cookie に入れるとき、11番より 12番が向いているのはなぜか
- 14番: `Math.random()` で作った文字列を、セッション ID に使ってはいけないのはなぜか

## 問題2 Cookie を決まりどおりに読む・書く

[cookie.mjs](cookie.mjs) の3つの関数を、次の決まりどおりにしてください。

**`parseCookies(header)`**

- `;` で区切る。前後の空白は取る（`;` の後の空白が無くても、多くても読む）
- 最初の `=` で名前と値に分ける。値の中の `=` はそのまま。`=` の無いものは無視
- 名前に使えない文字（空白、`;`、`=`、`"` など。RFC 6265 の token 以外）を含むもの、空の名前は無視
- 同じ名前は、最初のものを使う
- 値が `"…"` で囲まれていたら外す。`%xx` を戻す。戻せないもの（`100%` など）は、例外にせずそのまま

**`serializeCookie(name, value, options)`**: 次の順に書く。`名前=値; Max-Age; Expires; Domain; Path; HttpOnly; Secure; SameSite`

| こういうとき | どうする |
| --- | --- |
| 値 | `encodeURIComponent` でエンコードする |
| `maxAge` | 0 以上の整数（秒）。違えば `RangeError`。`0` も書く |
| `expires` | `Date`。`toUTCString()` の形で書く。正しくない `Date` は `TypeError` |
| `domain` | 英数字と `.` `-` だけ。違えば `TypeError` |
| `path` | 既定 `/`。`/` で始まり、`;` や空白を含まない。違えば `TypeError` |
| `httpOnly` | 既定 `true` |
| `sameSite` | 既定 `'Lax'`。大文字小文字を問わず `strict`・`lax`・`none` を受け取り、`Strict`・`Lax`・`None` と書く。それ以外は `TypeError`。`null` なら書かない |
| `SameSite=None` で `secure` が無い | `TypeError`（ブラウザが受け付けない） |
| 名前が `__Secure-` で始まる | `secure` が要る。無ければ `TypeError` |
| 名前が `__Host-` で始まる | `secure`、`path` が `/`、`domain` 無し。違えば `TypeError` |
| 名前に使えない文字 | `TypeError` |

**`clearCookie(name, options)`**: Cookie を消す `Set-Cookie`。値は空、`Max-Age=0` と `Expires=Thu, 01 Jan 1970 00:00:00 GMT`。消すときは、作ったときと同じ `path`・`domain` でないと、ブラウザは別の Cookie だと思って消しません。

```sh
$ node --test cookie.test.mjs
```

最初は 11 個のうち 10 個が失敗します。すべて通れば完成です。

## 問題3 署名付きの値と、鍵の取り替え

[signed.mjs](signed.mjs) の4つの関数を作ってください（本文5節）。

**`sign(value, secrets)`**: `値.署名` を返す。署名は HMAC-SHA256 を base64url にしたもの。`secrets` は鍵の文字列か、鍵の配列（**最初の鍵**で署名する）。

**`unsign(signed, secrets)`**: 署名が正しければ値を、正しくなければ `null` を返す。

- 値の中に `.` があってもよい（**最後の** `.` で分ける）
- `secrets` が配列なら、どの鍵で署名したものでも通す（鍵を取り替えた直後のため）
- 比べるときは `crypto.timingSafeEqual` を使う（長さが違うと例外を投げるので、先に長さを比べる）

**`signJson(data, secrets, { now })`**: `{ d: data, iat: いまの時刻 }` を JSON にし、base64url にしてから署名する。

**`unsignJson(token, secrets, { maxAgeMs, now })`**: 署名を確かめ、`data` を返す。署名が正しくない・JSON として読めない・`maxAgeMs` より古いときは `null`。

どの関数も、鍵が 32 文字より短ければ `TypeError` を投げます。

```sh
$ node --test signed.test.mjs
```

最初は 8 個のうち 7 個が失敗します。すべて通れば完成です。`timingSafeEqual` を使っているかは、テストでは確かめられません。自分で読んで確かめてください。

## 問題4 セッションの保存場所と `withSession`

[session.mjs](session.mjs) に、セッションの仕組みを作ってください。Cookie の関数は、問題2の自分の解答か `../solutions/cookie.mjs` を `import` し直して使ってください（問題のファイルは、いまはサンプルの簡単な版を読んでいます）。

**`newSessionId()`**: 32 バイトの乱数を base64url にしたもの（43 文字）。

**`SessionStore`**（`new SessionStore({ ttlMs, now })`）: セッションの中身をメモリの `Map` に置く。

| メソッド | すること |
| --- | --- |
| `create(data)` | 新しい ID で保存し、ID を返す |
| `get(id)` | 中身を返す。無い・期限切れなら `null`（期限切れなら消す） |
| `set(id, data)` | 保存し、期限を「いまから `ttlMs`」に延ばす |
| `destroy(id)` | 消す |
| `regenerate(oldId, data)` | 古い ID を消し、新しい ID で `data` を保存して、新しい ID を返す |
| `prune()` | 期限切れを全部消し、消した数を返す |
| `size` | いくつ保存しているか |

**`withSession(handler, store, { cookieName = 'sid', secure = false })`**: ハンドラを包み、次のようにする。

- Cookie の ID が `store` にあれば、その中身を `req.session` に入れる。**無い ID（期限切れ、作っていない ID）は使わない**。そのときは `req.session = {}` で始め、新しい ID は保存するときに作る
- `req.regenerateSession()`: 今のセッションを消し、`req.session = {}` にする。新しい ID は保存するときに作る（ログインのとき使う）
- `req.destroySession()`: 今のセッションを消し、Cookie も消す（ログアウトのとき使う）
- レスポンスのヘッダを書く直前（`res.writeHead` を包む）に保存して、`Set-Cookie` を付ける。属性は `HttpOnly`・`SameSite=Lax`・`Path=/`・`Max-Age`（`ttlMs` を秒にしたもの）。`Cache-Control: no-store` も付ける
- 中身が空で、ID も無いセッションは保存せず、Cookie も送らない（ページを見に来ただけの客ごとに保存しないため）

ヒント: `res.end()` だけを呼んだときも、Node.js は中で `res.writeHead()` を呼びます（Node 26 で確かめた）。

```sh
$ node --test session.test.mjs
```

最初は 11 個のうち 10 個が失敗します。すべて通れば完成です。

## 問題5 ログインのあるサイトの、セッションのバグを直す

[buggy-login.mjs](buggy-login.mjs) は、ログイン・ログアウトのあるサイトです。確認スクリプトを動かすと、22 個のうち 14 個が失敗します。

```sh
$ bash check-login.sh
```

| メソッドとパス | すること |
| --- | --- |
| `GET /` | ログインしていれば名前とログアウトのボタン、していなければログインへのリンク |
| `GET /login` | ログインのフォーム（CSRF トークンを隠して入れる） |
| `POST /login` | 正しければ 303 で `/`、違えば 303 で `/login` と知らせ（flash） |
| `POST /logout` | セッションを消して、303 で `/login` |
| `GET /me` | ログインしていれば `200 {"name":"…"}`、していなければ 401 |

ユーザーは `ryota` / `dev-only-password` と `hanako` / `another-dev-password` です（この練習用のもの）。確認スクリプトは、期限を確かめるため、環境変数 `SESSION_TTL_MS=1500`（1.5 秒）でサーバを起動します。

直し方は自由です。問題2〜4の関数と、第17〜21章の部品を使って書き直してもかまいません（模範解答はそうしています）。パスワードも、本文6.1節のとおりハッシュで持つようにしてください（確認スクリプトでは確かめられません）。
