# 第22章 Cookie とセッションを自作する

HTTP は、1回のリクエストと1回のレスポンスで話が終わる決まりです。サーバは、さっき来た人と今来た人が同じ人かを、何もしなければ知りません（第2部 第7章）。
「ログインしたまま」「カートに入れたまま」を作るには、ブラウザに小さな札（**Cookie**）を持たせ、リクエストのたびに見せてもらいます。その札とサーバの記録を結び付けたものが**セッション**です。
この章では、Flask の `session` がしてくれていたことを、Cookie の読み書き、推測できない ID、署名、ログインとログアウトの順に、自分で作って確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第17章（`createApp`、`HttpError`）、第18章（Router）、第20章（`readForm`、PRG の 303）、第21章（`html` タグ）、第2部 第7章（Cookie とセッションの考え方）、第3部 第15章（Buffer）・第16章（環境変数） |
| この章のゴール | `Set-Cookie` の属性（`HttpOnly`・`Secure`・`SameSite`・`Path`・`Max-Age`）の意味を説明できる / 推測できないセッション ID を作り、中身をサーバに置ける / 署名付きの値の仕組みと、暗号化との違いを説明できる / ログインで ID を作り直し、ログアウトでサーバからも消せる / flash と CSRF トークンを作れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | Cookie のやりとり、セッション、署名、ログイン |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（`cookie.mjs`・`session.mjs` は、成果物の掲示板でも使います） |

> この章のサンプルと練習問題は、第17〜21章の模範解答とサンプルを `import` して使います。外部のパッケージは使わないので、`npm install` は不要です。
> 練習問題は、どれも自分の Mac の中で動かしているサーバだけを相手にします。

---

## 1. Flask がしてくれていたこと

Flask では、次のように書きました。

```python
app.secret_key = os.environ['SECRET_KEY']

@app.post('/login')
def login():
    user = find_user(request.form['name'], request.form['password'])
    if user is None:
        flash('ユーザー名かパスワードが違います')
        return redirect(url_for('login_form'))
    session['user_id'] = user.id
    return redirect(url_for('index'))
```

ここで Flask がしていたことを、順に整理します。

- `session` は、辞書のように使える「この人のための入れ物」です。次のリクエストでも、同じ人なら同じ中身が入っています
- Flask の `session` は、中身を**サーバに置かず**、JSON にして、**署名**を付けて、Cookie に入れてブラウザに持たせていました。署名には `secret_key` を使います（中で使われている itsdangerous というライブラリの仕事です）。署名があるので、ブラウザ側で中身を書き換えると、Flask は「正しくない」と気づいて、その Cookie を捨てます
- ただし、中身は**暗号化されていません**。Cookie の値の前半は base64 で、だれでも元に戻して読めます（5節）
- `flash()` は「次のページで1回だけ表示する知らせ」で、これも `session` の中に入れていました
- `Set-Cookie` には、`HttpOnly` などの属性を、Flask の設定（`SESSION_COOKIE_HTTPONLY` など）に従って付けていました

Node.js の `node:http` には、Cookie を読む関数も、セッションも入っていません。この章では、Flask の方法（署名付き Cookie）と、もう1つのよくある方法（Cookie には ID だけ、中身はサーバ）の両方を作ります。

## 2. Cookie の仕組み

サーバは、レスポンスの `Set-Cookie` ヘッダで、Cookie を渡します。ブラウザはそれを覚えておき、同じサイトへのリクエストに `Cookie` ヘッダで付けて送ります。

```
HTTP/1.1 200 OK
Set-Cookie: visits=1; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax
Set-Cookie: theme=%E3%83%80%E3%83%BC%E3%82%AF; Path=/; SameSite=Lax

GET / HTTP/1.1
Cookie: visits=1; theme=%E3%83%80%E3%83%BC%E3%82%AF
```

- `Set-Cookie` は、Cookie 1つにつき1行です。Node.js では `res.setHeader('Set-Cookie', [1つ目, 2つ目])` のように配列で渡します
- ブラウザが送ってくる `Cookie` には、名前と値しかありません。属性（いつまで、など）は送られてきません

[samples/cookie-demo.mjs](samples/cookie-demo.mjs) で確かめてください。

```sh
$ node cookie-demo.mjs   # ブラウザで http://127.0.0.1:9220/ を何度か開く
```

### 2.1 属性

| 属性 | 意味 | 付けないと |
| --- | --- | --- |
| `Max-Age=秒` / `Expires=日時` | いつまで覚えておくか。`Max-Age=0` で消す | ブラウザを閉じると消える（セッション Cookie） |
| `Path=/` | このパスより下へのリクエストにだけ送る | `Set-Cookie` を返したページのパスで決まり、分かりにくい。いつも `Path=/` を付ける |
| `Domain=example.com` | サブドメイン（`a.example.com`）にも送る | 返したホストにだけ送る（こちらのほうが狭くて安全） |
| `HttpOnly` | ページの JavaScript（`document.cookie`）から読めない | ページの JavaScript から読める |
| `Secure` | HTTPS のときだけ送る | HTTP でも送る（途中で読まれる） |
| `SameSite=Lax` | 別のサイトから来たリクエストには、ふつうのリンクで移動するとき以外は送らない（8節） | ブラウザによって違う。Chromium は `Lax` とみなす |

`cookie-demo.mjs` のページでは、`HttpOnly` の付いた `visits` は `document.cookie` に出てこず、付けていない `theme` だけが出てきます。**セッションの Cookie には、必ず `HttpOnly` を付けます。** 第21章のエスケープの付け忘れがあっても、ページの JavaScript からセッションの ID を読まれずに済みます。

`Secure` は、HTTPS で公開するときには必ず付けます。この教材のサーバは `http://127.0.0.1` で動かすので、`Secure` を付けると Cookie が保存されないブラウザがあります（Chromium と Firefox は `localhost`・`127.0.0.1` を例外として扱いますが、Safari は扱いが異なります）。そのため、この章では `secure` をオプションにして、既定を `false` にしています。HTTPS の仕組みは第2部 第8章で見ました。HTTPS で公開するのは第12部です。

### 2.2 名前の頭の決まり

名前が `__Host-` で始まる Cookie は、`Secure` が付いていて、`Path=/` で、`Domain` が無いときだけ、ブラウザが受け付けます。サブドメインや別のパスから、同じ名前の Cookie を上書きされないための決まりです。HTTPS で公開するなら、セッションの Cookie の名前は `__Host-sid` のようにするのがおすすめです。

### 2.3 Cookie は利用者のもの

Cookie はブラウザの中にあるので、利用者は DevTools でいつでも見られ、書き換えられます。`cookie-demo.mjs` の訪問回数は、利用者が好きな数にできます。**Cookie の値は、ボディやクエリと同じ「客から来たもの」です。** 「ログインしている」「管理者だ」のような大事なことを、そのまま Cookie に書いてはいけません。それを解決するのが、4節（中身をサーバに置く）と5節（署名する）です。

## 3. Cookie を読む・書く

[samples/cookie-basic.mjs](samples/cookie-basic.mjs) に、いちばん簡単な関数があります。

```js
parseCookies('a=1; b=hello%20world')        // { a: '1', b: 'hello world' }
serializeCookie('visits', '3', { maxAge: 60 })  // 'visits=3; Path=/; Max-Age=60; HttpOnly; SameSite=Lax'
```

- 値は `encodeURIComponent` でエンコードしておきます。Cookie の値には、`;`・空白・`,`・`"`・日本語をそのまま入れられないからです。読むときは `decodeURIComponent` で戻します
- 同じ名前の Cookie が2つ来たら、最初のものを使います。`Path` が違う同じ名前の Cookie があると、両方が送られてくるからです（練習問題1）
- `decodeURIComponent` は、`100%` のような、`%xx` として読めないものに例外を投げます。Cookie ヘッダは客が自由に送れるので、例外でサーバが 500 にならないようにします

名前の確かめや、属性の決まり（`SameSite=None` には `Secure` が要る、など）を足した版は、練習問題2で作ります。

## 4. セッション: Cookie には ID だけを入れる

いちばんよく使われる方法は、Cookie には**ランダムな ID だけ**を入れ、中身は**サーバに**置くことです。[samples/session-demo.mjs](samples/session-demo.mjs) を見てください。

```js
const sessions = new Map(); // ID → { data, expires }
const newId = () => crypto.randomBytes(32).toString('base64url');
```

```sh
$ node session-demo.mjs   # ブラウザで http://127.0.0.1:9221/
```

Cookie に入っているのは `sid=Xk3…`（43 文字）だけで、回数はサーバのメモリにあります。利用者が ID を書き換えても、それは「サーバが知らない ID」になるだけです。

### 4.1 ID は推測できないものに

セッションの ID を知っている人は、その人として振る舞えます。だから ID は、**他の人に推測されないこと**が何より大事です。

| 作り方 | 使ってよいか |
| --- | --- |
| 連番（`1`、`2`、`3`…） | だめ。次の人の ID が分かる |
| 時刻、時刻 + 名前のハッシュ | だめ。時刻はおおよそ分かる |
| `Math.random()` | だめ。速さのための乱数で、推測されないことを約束していない |
| `crypto.randomBytes(32)`（256 ビット） | よい。OS が用意する、暗号に使える乱数 |
| `crypto.randomUUID()` | よい（122 ビットの乱数）。少し短い |

32 バイトの乱数を base64url にすると、43 文字です。base64url は、`+` `/` の代わりに `-` `_` を使い、最後の `=` を付けない base64 です。Cookie や URL に、そのまま入れられます。

### 4.2 期限

セッションは、いつか切らなければいけません。ブラウザの Cookie の期限（`Max-Age`）は利用者が変えられるので、**サーバの側でも**期限を持ちます。

- **最後に使ってからの期限**（例: 30 分）: 使うたびに延ばす。`session-demo.mjs` と練習問題4はこちら
- **作ってからの期限**（例: 最長 7 日）: 延ばさない。銀行のサイトのように、使い続けていても一定の時間でログインし直してもらう

切れたセッションは、`get` のときに消すほか、ときどきまとめて掃除します（`prune`）。

### 4.3 メモリに置く限界

`Map` に置いたセッションは、サーバを止めると全部消えます。サーバを2台にすると、1台目で作ったセッションを2台目は知りません。本物のアプリでは、データベースや Redis にセッションを置きます。第6部でデータベースを使うときに、置き場所を取り替えます。そのため、練習問題4では、置き場所を `SessionStore` というクラスに分けておきます。

## 5. 署名付きの値

Flask の `session` のように、中身を Cookie そのものに入れる方法もあります。そのままでは利用者が書き換えられるので、**署名**を付けます。[samples/signed-demo.mjs](samples/signed-demo.mjs) を動かしてください。

```sh
$ node signed-demo.mjs
```

```js
const mac = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('base64url');
const sign = (value, secret) => `${value}.${mac(value, secret)}`;
```

**HMAC** は、秘密の鍵を使って作るハッシュです。同じ値と同じ鍵からは同じ署名ができ、鍵を知らなければ、正しい署名は作れません。サーバは、受け取った `値.署名` の値から、もう一度署名を計算して、送られてきた署名と比べます。同じなら「この値は、鍵を持っている自分が作ったもの」と分かります。

- 比べるときは `===` ではなく `crypto.timingSafeEqual` を使います。`===` は、違う文字が見つかった時点で止まるので、何文字目まで合っていたかが、かかった時間に少しだけ表れます
- 鍵はコードに書かず、環境変数から読みます（第3部 第16章の `.env`）。鍵が漏れたら、だれでも正しい署名を作れます
- **署名は暗号化ではありません。** `signed-demo.mjs` の最後のように、中身はだれでも読めます。パスワードや、人に見られて困るものは入れません

### 5.1 どちらを使うか

| | Cookie には ID、中身はサーバ（4節） | 中身を署名して Cookie に（Flask の方法） |
| --- | --- | --- |
| サーバに置くもの | セッションの中身 | 鍵だけ |
| 中身の大きさ | いくらでも | Cookie 1つは約 4KB まで。毎回のリクエストで送られる |
| 中身が見られるか | 見られない | 見られる（暗号化しない限り） |
| ログアウト・強制的に切る | サーバから消せばすぐ使えなくなる | 期限まで有効のまま。止めるには、鍵を変える（全員がログアウトになる）か、サーバで「使えない一覧」を持つ |
| サーバが複数台 | 置き場所を共有する必要がある | 鍵を同じにすれば済む |

この教材では、ログインには「ID とサーバの中身」を使います（ログアウトですぐ切れるため）。署名は、「中身を見られてもよいが、書き換えられては困る」小さな値（画面の設定、CSRF トークンの元など）に向いています。練習問題3では、鍵を取り替えるときの工夫と、署名に時刻を入れて期限を持たせる方法を作ります。

## 6. ログインとログアウト

[samples/login-demo.mjs](samples/login-demo.mjs) は、ここまでの部品を合わせたログインのサンプルです。

```sh
$ node login-demo.mjs   # ブラウザで http://127.0.0.1:9222/（ryota / dev-only-password）
```

### 6.1 パスワードは、ハッシュで持つ

パスワードを、そのままサーバに持ってはいけません。データが漏れたとき、そのまま使われてしまいます（同じパスワードを他のサイトでも使っている人は多い）。`login-demo.mjs` は、パスワードから **scrypt** で作ったハッシュだけを持ちます。

```js
const salt = crypto.randomBytes(16);
const hash = await scrypt(password, salt, 32);  // 保存するのは salt と hash
// ログインのとき: 同じ salt で計算し直して、timingSafeEqual で比べる
```

- **salt** は、人ごとに違う乱数です。同じパスワードでも、人が違えばハッシュが違うようにします
- scrypt は、わざと計算に時間とメモリがかかるように作られたハッシュです。SHA-256 のような速いハッシュは、総当たりで試されやすいので、パスワードには使いません

パスワードの扱いは、第10部 第51章でくわしく扱います（bcrypt・argon2 との比べ、強さの調整）。

### 6.2 ログインしたら、ID を作り直す

ログインの前から持っていたセッションの ID を、ログインの後もそのまま使うと、困ることがあります。もし、ログインの前の ID を他の人が知っていたら（たとえば、その人が前もって決めた ID を、何かの方法で使わせていたら）、ログインした後のセッションまで、その人に使われてしまいます。これを**セッション固定化**と呼びます。

守り方は2つです。

1. **知らない ID は使わない**: サーバが作っていない ID が送られてきたら、使わずに新しい ID を作る
2. **ログインしたら ID を作り直す**: ログインに成功したら、古いセッションを消し、新しい ID で始める

`login-demo.mjs` の `regenerate` と、練習問題4の `req.regenerateSession()` が 2 です。Flask の `session` は中身を Cookie に入れる方式なので、この問題の形が少し違いますが、Flask-Login のようなライブラリは、ログインのときに同じような手当てをしています。

### 6.3 ログアウトは、サーバからも消す

ログアウトで、ブラウザの Cookie を消す（`Max-Age=0`）だけでは足りません。サーバにセッションが残っていると、ID を控えていた人は、まだ使えます。サーバの記録を消し、そのうえで Cookie も消します。

### 6.4 失敗の知らせは同じにする

ログインに失敗したとき、「そのユーザーはいません」と「パスワードが違います」を言い分けると、他の人が「このユーザー名は使われている」と調べられます。どちらも「ユーザー名かパスワードが違います」にします。`login-demo.mjs` は、無いユーザーのときも、ダミーのハッシュで scrypt を計算して、かかる時間もそろえています。

## 7. flash: 次の1回だけの知らせ

「保存しました」「ログインしました」のような知らせは、POST の後の 303 で移動した先のページで表示したいものです（第20章の PRG）。でも、移動した先のページは別のリクエストなので、知らせを渡す方法が要ります。

Flask の `flash()` と同じく、セッションに入れておき、次のページで**読んだら消します**。

```js
req.session.flash = 'ログインしました';   // POST の処理の中で
// 次の GET で
const f = req.session.flash;
delete req.session.flash;                 // 消し忘れると、ページを開き直すたびに出る
```

## 8. CSRF の入り口

Cookie には、もう1つ気をつけることがあります。ブラウザは、**どのページから送られたリクエストでも**、送り先のサイトの Cookie を付けてしまうことがあります。もし、別のサイトのページに、こちらのサイトへ送るフォームが置かれていて、ログインしたままの利用者がそれを送ってしまうと、こちらのサーバには「ログインした本人からの POST」に見えます。これを **CSRF**（クロスサイトリクエストフォージェリ）と呼びます。

守り方は2つ重ねます。

1. **`SameSite=Lax`**: 別のサイトから来た POST には、Cookie を付けないようにブラウザに頼む
2. **CSRF トークン**: セッションに推測できない値を1つ持ち、自分のサイトのフォームには `<input type="hidden" name="csrf" value="…">` で入れておく。POST を受け取ったら、送られてきた値とセッションの値が同じかを確かめ、違えば 403。別のサイトのページは、この値を知らないので、正しいフォームを作れない

`login-demo.mjs` の `checkCsrf` が 2 です。第5部で JSON の API を作るとき（`fetch` で送るとき）の守り方や、`Origin` ヘッダを使う方法は、第10部 第55章で扱います。

## 9. Flask との対応

| やりたいこと | Flask | この章 |
| --- | --- | --- |
| Cookie を読む | `request.cookies.get('name')` | `parseCookies(req.headers.cookie).name` |
| Cookie を書く | `resp.set_cookie('name', v, max_age=…, httponly=True, samesite='Lax')` | `res.setHeader('Set-Cookie', serializeCookie('name', v, { maxAge }))` |
| Cookie を消す | `resp.delete_cookie('name')` | `clearCookie('name')` |
| セッション | `session['user_id'] = 1`（署名付き Cookie） | `req.session.userId = 1`（ID とサーバの中身。練習問題4） |
| 署名の鍵 | `app.secret_key` | `sign(value, process.env.SECRET)`（練習問題3） |
| ログアウト | `session.clear()` | `req.destroySession()` |
| ログインで ID を作り直す | Flask-Login などのライブラリ | `req.regenerateSession()` |
| 1回だけの知らせ | `flash()`、`get_flashed_messages()` | `req.session.flash` と、読んだら消す |
| CSRF トークン | Flask-WTF の `csrf_token()` | `csrfToken(req)`・`checkCsrf(req, form)` |
| パスワードのハッシュ | `werkzeug.security.generate_password_hash` | `crypto.scrypt` と salt |

## まとめ

- Cookie は、`Set-Cookie` で渡し、`Cookie` で返ってくる。属性は送り返されない。
- セッションの Cookie には `HttpOnly`・`SameSite=Lax`・`Path=/` を付ける。HTTPS では `Secure` と `__Host-` も。
- Cookie の値は客から来たもの。大事なことをそのまま書かない。
- セッション ID は `crypto.randomBytes(32)` で。期限はサーバの側でも持つ。
- 署名（HMAC）で書き換えには気づけるが、中身は読める。比べるときは `timingSafeEqual`。鍵は環境変数に。
- パスワードは salt 付きの scrypt で。ログインで ID を作り直し、知らない ID は使わない。ログアウトはサーバからも消す。失敗の知らせは同じに。
- flash は、読んだら消す。CSRF は `SameSite` とトークンの2つで守る。

## 練習問題

[exercises/README.md](exercises/README.md) に5問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「HTTP Cookie の使用」: https://developer.mozilla.org/ja/docs/Web/HTTP/Cookies
- MDN「Set-Cookie」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Set-Cookie
- RFC 6265「HTTP State Management Mechanism」: https://www.rfc-editor.org/rfc/rfc6265
- Node.js「Crypto: crypto.randomBytes / createHmac / timingSafeEqual / scrypt」: https://nodejs.org/api/crypto.html
- OWASP「Session Management Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP「Cross-Site Request Forgery Prevention Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP「Password Storage Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Flask「Sessions」「Message Flashing」: https://flask.palletsprojects.com/en/stable/quickstart/#sessions

前の章: [第21章 HTML を生成する](../ch21-html-templates/README.md) ／ 次: [第4部の成果物 簡易掲示板](../project-bbs/README.md)
