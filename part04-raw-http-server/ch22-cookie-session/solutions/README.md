# 第22章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [cookie.mjs](cookie.mjs) | 問題2: `parseCookies`・`serializeCookie`・`clearCookie` |
| [signed.mjs](signed.mjs) | 問題3: `sign`・`unsign`・`signJson`・`unsignJson` |
| [session.mjs](session.mjs) | 問題4: `newSessionId`・`SessionStore`・`withSession` |
| [login.mjs](login.mjs) | 問題5: ログインのあるサイトを、問題2〜4の関数と第17〜21章の部品で書き直したもの |

模範解答は、`exercises` フォルダで次のように確かめられます。

```sh
$ cd ../exercises
$ MODULE=../solutions/cookie.mjs node --test cookie.test.mjs
$ MODULE=../solutions/signed.mjs node --test signed.test.mjs
$ MODULE=../solutions/session.mjs node --test session.test.mjs
$ bash check-login.sh ../solutions/login.mjs
```

---

## 問題1 Cookie と乱数の結果を予想する

```
 1: {"a":"1","b":"2"}
 2: {"a":"1","b":"2"}
 3: {"sid":"x"}
 4: {"msg":"hello world"}
 5: {"p":"100%"}
 6: {"ok":"1"}
 7: {"t":"abc=="}
 8: "name=%E6%97%A5%E6%9C%AC%20%E8%AA%9E; Path=/; HttpOnly; SameSite=Lax"
 9: "sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
10: 64
11: 44
12: 43
13: "{\"user\":1}"
14: "string"
```

- **3番**: `Path=/` の `sid` と `Path=/admin` の `sid` のように、名前が同じで `Path`（や `Domain`）が違う Cookie は、ブラウザの中では別のものです。`/admin` を開くと、両方が送られてきます。ブラウザは、`Path` の長いほうを先に並べます。どちらが本物かは、名前だけでは分かりません。だから、セッションの Cookie は `Path=/` の1つだけにします（`__Host-` の決まりが `Path=/` を求めるのも、このため）
- **10〜12番**: hex は1バイトを2文字（16 種類の文字）で書くので 64 文字。base64 は3バイトを4文字（64 種類）で書き、足りないぶんを `=` で埋めるので 44 文字。base64url は `=` を付けず、`+` `/` の代わりに `-` `_` を使うので 43 文字。`+` `/` `=` は、Cookie や URL の中では特別な意味を持つことがある（`=` は名前と値の区切り）ので、base64url が向いています
- **13番**: Flask の session の Cookie の前半を戻したのと同じです。base64url は「文字にしただけ」で、暗号ではありません
- **14番**: `Math.random()` は、速さのための乱数で、続けて出た値から次の値を推測できる作りになっていることがあります。セッション ID は「他の人に推測されないこと」がすべてなので、`crypto.randomBytes` や `crypto.randomUUID` を使います

## 問題2 Cookie を決まりどおりに読む・書く

[cookie.mjs](cookie.mjs)

- 名前は、RFC 6265 の token（`/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/`）で確かめます。読むときは無視、書くときは例外です。書くときに例外にするのは、間違った `Set-Cookie` を送ると、ブラウザが黙って捨てたり、別の名前として読んだりして、原因が分かりにくいからです
- `path` に `;` を許すと、`/a; Domain=other` のように、属性を外から足せてしまいます。値は `encodeURIComponent` で `;` が `%3B` になるので心配ありませんが、属性は自分で確かめます
- `Expires` と `Max-Age` の両方があると、ブラウザは `Max-Age` を使います。`clearCookie` が両方を書くのは、`Max-Age` を知らない古い道具のためです

## 問題3 署名付きの値と、鍵の取り替え

[signed.mjs](signed.mjs)

- 問題のファイルは「値 + 鍵」の SHA-256 で署名していました。鍵と値をつないでハッシュする自己流の書き方には、つなぐ順によって弱点が知られています（鍵を前につなぐと「長さ拡張」、後ろにつなぐとハッシュの衝突の影響を受けやすい）。鍵付きのハッシュには、そのために決められた HMAC を使います
- `===` で比べると、何文字目で違ったかによって、かかる時間がわずかに変わります。`timingSafeEqual` は、いつも全部を比べます
- 鍵の取り替え: 新しい鍵を配列の最初に、古い鍵を2番目に置いてしばらく動かし、古い鍵で署名した Cookie が期限切れになったら、古い鍵を外します
- `signJson` に時刻を入れるのは、署名した値は「鍵を変えない限り、いつまでも正しい」からです。サーバ側で期限を決めたいときは、中身に時刻を入れて確かめます

## 問題4 セッションの保存場所と `withSession`

[session.mjs](session.mjs)

- `SessionStore` は、`#map` のような `#` で始まるフィールド（クラスの外から見えない）で中身を隠しています
- `withSession` は、`res.writeHead` を包んで「ヘッダを書く直前」に保存します。ハンドラの途中で `req.session` を何回書き換えても、保存は1回です。ハンドラが例外を投げても、第17章の `createApp` がエラーのレスポンスを書くときに、`writeHead` を通ります
- 「知らない ID は使わない」が、問題5の確認5（セッション固定化への対策の1つ）です。知らない ID を受け入れると、だれかが前もって決めた ID のまま、ログインまで進めてしまうことになります。ログインで ID を作り直す（`regenerateSession`）のと、2つで守ります
- 中身の無いセッションを保存しないのは、メモリのためです。検索エンジンのロボットのように Cookie を送り返さない客は、来るたびに新しいセッションを作ってしまいます

## 問題5 ログインのあるサイトの、セッションのバグを直す

[login.mjs](login.mjs)

| 確認 | 原因 | 直し方 |
| --- | --- | --- |
| 1 | ID が連番（`1`、`2`、…）。次の人の ID を推測できる | `newSessionId()` |
| 3, 4 | `Set-Cookie` に `HttpOnly`・`SameSite` が無い | `withSession` が付ける |
| 5 | 送られてきた ID が無ければ、その ID でセッションを作っていた | 知らない ID は使わない |
| 6, 17 | CSRF トークンを確かめていない | `checkCsrf`。トークンはセッションに1つ持つ |
| 8, 10 | 「そのユーザーはいません」「パスワードが違います」と言い分けていた。ユーザー名があるかどうかを、他の人が調べられる | 同じ言葉にする。無いユーザーでも scrypt を計算して、かかる時間もそろえる |
| 9 | flash を表示しても消していない | `takeFlash` で、読んだら消す |
| 12, 15 | ログインで ID を変えていない | `req.regenerateSession()` |
| 14 | `/me` に `Cache-Control: no-store` が無い。人ごとに違う JSON がキャッシュされる | 付ける |
| 19 | ログアウトで、ブラウザの Cookie を消しただけ。サーバにはセッションが残っていて、ID を知っていれば使える | `req.destroySession()` でサーバからも消す |
| 21 | 期限が無い | `SessionStore` の `ttlMs` |

パスワードを `===` で比べていたのも直しています（確認スクリプトでは分かりません）。パスワードはそのまま持たず、salt 付きの scrypt のハッシュを持ち、`timingSafeEqual` で比べます。
