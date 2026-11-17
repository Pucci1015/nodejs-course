# 第54章 OAuth 2.0 と OpenID Connect

「Google でログイン」「GitHub でログイン」のボタンは、パスワードをこのアプリに渡さずに、ほかのサービス（**IdP**）に「この人はだれか」を教えてもらう仕組みです。この章では、その決まりである **OAuth 2.0** と **OpenID Connect**（OIDC）を、練習用の IdP を相手に、1歩ずつ手で動かして確かめます。ライブラリに任せる前に、中で何が行き来しているかを自分の目で見ておくと、設定を間違えたときに原因を探せるようになります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第2部 第9章（オリジン、`safeRedirectPath`）、第52章（セッション、JWT と署名の確かめ、`SameSite`）、第53章（1回だけのトークン、ユーザーの列挙） |
| この章のゴール | OAuth 2.0 と OpenID Connect の違い、4つの役者を説明できる / 認可コードフローの1歩ずつを、URL とリクエストで追える / `state`・`nonce`・PKCE が、それぞれ何を防ぐかを説明できる / ID トークン（RS256 の JWT）を JWKS の公開鍵で確かめられる / OIDC でログインするアプリを書ける / `sub` とメールアドレスの違いと、アカウントを結びつけるときの注意を説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part10/ch54-oauth-oidc/` で実行します。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part10/ch54-oauth-oidc
>   ```
>
> - 練習用の IdP をポート **9640**、ログインするアプリを **9647** で動かします。IdP は、別のターミナルで `~/dev/part10` から `npm run idp` と打って動かしたままにします（2節）。
> - 7節の GitHub のログインは、GitHub にアプリを登録する必要があります。登録したくなければ、読むだけで進めてかまいません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 認可コードフローと `state`・PKCE（3節） | 成果物（「練習用の IdP でログイン」）、第13部（Google・GitHub でログイン） |
| ID トークンを公開鍵で確かめる（4節） | 成果物、第12部（本物の IdP の鍵の取り替えに備える） |
| ログインするアプリ（5節） | 成果物の `/api/auth/idp/...` |
| `sub` とアカウントを結びつける（6節） | 成果物（ユーザーの表と `identities` の表） |
| 気を付けること（8節） | 第55章（オープンリダイレクト・CSRF の総点検） |

---

## 1. OAuth 2.0 と OpenID Connect

| | OAuth 2.0（RFC 6749） | OpenID Connect |
| --- | --- | --- |
| 何のためか | **認可**: アプリに「この人の代わりに API を使ってよい」という鍵（**アクセストークン**）を渡す | **認証**: アプリに「この人はだれか」を教える |
| もらうもの | アクセストークン（中身はアプリが読むものではない） | アクセストークン + **ID トークン**（だれか、を書いた署名付きの JWT） |
| 例 | GitHub の API でリポジトリを読む | 「Google でログイン」 |

OpenID Connect は、OAuth 2.0 の上に「ID トークン」を足した決まりです。OAuth 2.0 だけでログインを作ると、「このアクセストークンは、本当に自分のアプリのために出されたものか」を確かめる方法が決まっていないので、穴が空きやすくなります。ログインには OpenID Connect を使います。

登場する4つの役者です。

| 役者 | 決まりの中の名前 | この章では |
| --- | --- | --- |
| ログインする人 | リソースオーナー（resource owner） | alice（ブラウザを使う） |
| ログインさせたいアプリ | クライアント（client）。OIDC では RP（Relying Party） | タスク管理アプリ（`task-app`、9647） |
| 「この人はだれか」を知っているサービス | 認可サーバ（authorization server）。OIDC では **IdP**（OpenID Provider） | 練習用の IdP（9640） |
| アクセストークンで使える API | リソースサーバ（resource server） | IdP の `/userinfo`、GitHub の API |

**Flask では**: Authlib（`authlib.integrations.flask_client`）の `oauth.register(name, server_metadata_url=…)` で IdP を登録し、`authorize_redirect(redirect_uri)` でログインを始め、戻ってきたところで `authorize_access_token()` を呼びます。この1行の中で、`state` を確かめ、コードをトークンに取り替え、ID トークンを確かめています。この章では、その中身を自分で書きます。

## 2. 練習用の IdP を動かす

本物の Google や GitHub は、アプリの登録が必要で、中の動きも見えません。この教材には、OpenID Connect の決まりの大事な所だけを実装した、練習用の IdP（`tools/mini-idp.ts`）があります。中身は読まなくてかまいません。

### 2.1 手を動かす: IdP を起動して、設定を読む

別のターミナルで起動します。

```sh
$ cd ~/dev/part10
$ npm run idp
練習用の IdP: http://127.0.0.1:9640
設定: http://127.0.0.1:9640/.well-known/openid-configuration
登録してあるアプリ: client_id=task-app client_secret=dev-only-client-secret
Ctrl+C で止めます
```

元のターミナルで、IdP の設定を読みます。OpenID Connect の IdP は、決まった場所 `/.well-known/openid-configuration` に、自分の URL の一覧を JSON で置いています（**ディスカバリ**、discovery）。

```sh
$ curl -s http://127.0.0.1:9640/.well-known/openid-configuration
{"issuer":"http://127.0.0.1:9640","authorization_endpoint":"http://127.0.0.1:9640/authorize","token_endpoint":"http://127.0.0.1:9640/token","userinfo_endpoint":"http://127.0.0.1:9640/userinfo","jwks_uri":"http://127.0.0.1:9640/jwks","response_types_supported":["code"],"subject_types_supported":["public"],"id_token_signing_alg_values_supported":["RS256"],"scopes_supported":["openid","email","profile"],"code_challenge_methods_supported":["S256"],"token_endpoint_auth_methods_supported":["client_secret_basic","client_secret_post"]}
```

| 項目 | 意味 |
| --- | --- |
| `issuer` | IdP の名前。ID トークンの `iss` と一致する |
| `authorization_endpoint` | ブラウザを送り出す先（ログインの画面） |
| `token_endpoint` | アプリのサーバが、コードをトークンに取り替える先 |
| `jwks_uri` | ID トークンの署名を確かめる**公開鍵**の一覧（JWKS） |
| `code_challenge_methods_supported` | PKCE（3節）の方式。`S256` |

`jwks_uri` も見ておきます（長いので途中で切っています。鍵は IdP を起動するたびに作り直されます）。

```sh
$ curl -s http://127.0.0.1:9640/jwks
{"keys":[{"kty":"RSA","n":"r0TVW-0qL0lpTZIP5Yslyad7hMvf…","e":"AQAB","kid":"dev-69f5…","use":"sig","alg":"RS256"}]}
```

第52章の JWT は、1つの秘密の鍵で署名して、同じ鍵で確かめる HS256 でした。IdP の ID トークンは **RS256**（RSA の公開鍵暗号。第2部 第8章）で署名します。署名する**秘密鍵**は IdP だけが持ち、確かめる**公開鍵**はこのように誰でも読めます。アプリは秘密を何も持たずに、「IdP が出したトークンか」を確かめられます。`kid` は鍵の名前で、鍵を取り替えたときに、どの鍵で確かめるかを選ぶのに使います（4節）。

練習用の IdP には、2人のユーザーがいます。

| ユーザー | `sub` | メールアドレス | メールの確認 |
| --- | --- | --- | --- |
| alice | `u-1001` | alice@example.com | 済み（`email_verified: true`） |
| bob | `u-1002` | bob@example.com | まだ（`email_verified: false`） |

## 3. 認可コードフローを手で動かす

ログインの流れ（**認可コードフロー**、authorization code flow）は、次の順に進みます。

| 歩 | だれが → だれへ | 何をする |
| --- | --- | --- |
| 1 | アプリ → ブラウザ | 「IdP の `/authorize?…` へ行って」とリダイレクトする |
| 2 | ブラウザ ⇄ IdP | 本人がログインし、「task-app にメールアドレスを教えてよいか」に答える |
| 3 | IdP → ブラウザ → アプリ | `redirect_uri?code=…&state=…` へリダイレクトで戻す |
| 4 | アプリのサーバ → IdP | `code` を `token_endpoint` に送り、トークンをもらう（ブラウザを通らない） |
| 5 | アプリ | ID トークンを確かめ、ログインした状態にする（第52章のセッション） |

ブラウザを通る 1〜3 は、URL が履歴やログに残り、途中で書き換えられることもあります。だから、ブラウザを通るのは、それだけでは使えない**コード**（1回だけ・1分だけ有効）にして、本物のトークンは 4 でサーバどうしで受け取ります。

### 3.1 手を動かす: ログインのリンクを作る

`pkce.ts` を作ります。

```ts
import { createHash, randomBytes } from 'node:crypto';

const random = () => randomBytes(32).toString('base64url');

const state = random();
const nonce = random();
const verifier = random();
const challenge = createHash('sha256').update(verifier).digest('base64url');

const url = new URL('http://127.0.0.1:9640/authorize');
url.search = new URLSearchParams({
  response_type: 'code',
  client_id: 'task-app',
  redirect_uri: 'http://127.0.0.1:9647/auth/callback',
  scope: 'openid email profile',
  state,
  nonce,
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).toString();

console.log('state:    ', state);
console.log('nonce:    ', nonce);
console.log('verifier: ', verifier);
console.log('challenge:', challenge);
console.log();
console.log(url.href);
```

```sh
$ node pkce.ts
state:     6vbJjtJQHvsasjzX2Pm0Ox4fGnE3BijyjD0UYzxsZws
nonce:     uhcBDgVkwdXaw0ws9bTDuBqPuVDL-RNGjMj7Jiu_bSs
verifier:  BrN-SF_nLV6-GB1aa08t-o0E4xvneaB1ZqcBLoYWdps
challenge: JnmhlrDwUdYT7s38cX1N6o1C8FB6pNNsz4jeGFB07RI

http://127.0.0.1:9640/authorize?response_type=code&client_id=task-app&redirect_uri=http%3A%2F%2F127.0.0.1%3A9647%2Fauth%2Fcallback&scope=openid+email+profile&state=6vbJ…&nonce=uhcB…&code_challenge=Jnmh…&code_challenge_method=S256
```

値は毎回変わります。この後で使うので、ターミナルを閉じずにおきます。うまく動かないときは [samples/pkce.ts](samples/pkce.ts) と比べてください。

| パラメータ | 意味 |
| --- | --- |
| `response_type=code` | 認可コードフローを使う |
| `client_id` | どのアプリか（IdP に登録した名前） |
| `redirect_uri` | 戻り先。IdP に登録したものと**1文字も違わず一致**しないと、IdP は戻さない |
| `scope` | 何を教えてほしいか。`openid` があると OpenID Connect（ID トークンが出る）。`email`・`profile` はメールアドレスと名前 |
| `state` | 戻ってきたとき「自分が始めたログインか」を確かめる値（3.2節） |
| `nonce` | ID トークンに入れてもらい、「このログインのためのトークンか」を確かめる値（4節） |
| `code_challenge` | **PKCE**（ピクシー、Proof Key for Code Exchange）。合言葉 `verifier` の SHA-256 を先に渡しておく（3.3節） |

3つのランダムな値は、第53章のトークンと同じく、32 バイトを base64url にしたものです。

### 3.2 手を動かす: ブラウザでログインして、戻りの URL を見る

最後の行の URL をコピーし、ブラウザで開きます。練習用の IdP の画面が出るので、**alice** のボタンを押します。

ブラウザは `http://127.0.0.1:9647/auth/callback?code=…&state=…` へ移り、「接続できません」の画面になります。9647 ではまだ何も動いていないので、それで正しい動きです。アドレスバーの URL を見てください（Chromium で確かめました）。

```
http://127.0.0.1:9647/auth/callback?code=O3xnD-O9oWbDgmre_ItZJXnEOoaSOuHsWFtlKTnGcC0&state=6vbJjtJQHvsasjzX2Pm0Ox4fGnE3BijyjD0UYzxsZws
```

- `state` が、3.1節で出した `state` と同じであることを確かめます。アプリは、ログインを始めたときに `state` をセッションに覚えておき、戻ってきた値と比べます。違えば、自分が始めたログインではありません。攻撃者が「自分のアカウントでログインするコード」を被害者のブラウザに踏ませると、被害者は気付かずに攻撃者のアカウントで操作してしまいます（ログインの CSRF。第4部 第22章）。`state` が合わなければ断ることで、これを防ぎます。
- `code` は1回だけ・60 秒だけ使えます。次の 3.3節は、すぐに進めてください。間に合わなければ、3.1節からやり直します。

もう一度 3.1節の URL を開いて、今度は「断る」を押すと、`…/auth/callback?error=access_denied&state=…` に戻ります。アプリは `error` を見て、ログインしなかったことを画面に出します。

### 3.3 手を動かす: コードをトークンに取り替える

アプリのサーバが、IdP の `token_endpoint` にコードを送ります。`exchange.ts` を作ります。

```ts
const [code, verifier] = process.argv.slice(2);
if (code === undefined || verifier === undefined) {
  console.error('使い方: node exchange.ts コード verifier');
  process.exit(2);
}

const basic = Buffer.from('task-app:dev-only-client-secret').toString('base64');

const res = await fetch('http://127.0.0.1:9640/token', {
  method: 'POST',
  headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'http://127.0.0.1:9647/auth/callback',
    code_verifier: verifier,
  }),
});
const body: unknown = await res.json();
console.log(res.status, body);

if (typeof body === 'object' && body !== null && 'id_token' in body && typeof body.id_token === 'string') {
  const [, payload = ''] = body.id_token.split('.');
  console.log(JSON.parse(Buffer.from(payload, 'base64url').toString()));
}
```

`code` は 3.2節の URL から、`verifier` は 3.1節の出力からコピーします。

```sh
$ node exchange.ts O3xnD-O9oWbDgmre_ItZJXnEOoaSOuHsWFtlKTnGcC0 BrN-SF_nLV6-GB1aa08t-o0E4xvneaB1ZqcBLoYWdps
200 {
  access_token: 'jFZ_GeDQg3kr45ov2RpKaN0RazsMllsKjZ7A2xM7WEc',
  token_type: 'Bearer',
  expires_in: 3600,
  scope: 'openid email profile',
  id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRldi02OWY1MTU1MiJ9.eyJpc3Mi…'
}
{
  iss: 'http://127.0.0.1:9640',
  sub: 'u-1001',
  aud: 'task-app',
  iat: 1794935061,
  exp: 1794935361,
  nonce: 'uhcBDgVkwdXaw0ws9bTDuBqPuVDL-RNGjMj7Jiu_bSs',
  email: 'alice@example.com',
  email_verified: true,
  name: 'alice'
}
```

（ID トークンの長い値は途中で切っています。）同じコマンドをもう一度打つと、コードはもう使えません。

```sh
$ node exchange.ts O3xnD-O9oWbDgmre_ItZJXnEOoaSOuHsWFtlKTnGcC0 BrN-SF_nLV6-GB1aa08t-o0E4xvneaB1ZqcBLoYWdps
400 { error: 'invalid_grant', error_description: 'コードはもう使われています' }
```

| 送るもの | 意味 |
| --- | --- |
| `Authorization: Basic …` | アプリの確かめ。`client_id:client_secret` を base64 にしたもの（**Basic 認証**。下の注意） |
| `grant_type=authorization_code` | 認可コードを取り替える |
| `redirect_uri` | 1歩目で送ったものと同じ値。違えば断られる |
| `code_verifier` | PKCE の合言葉そのもの。IdP は SHA-256 を計算し、1歩目の `code_challenge` と比べる |

| 受け取るもの | 意味 |
| --- | --- |
| `access_token` | IdP の API（`/userinfo`）を使う鍵。中身はアプリが読むものではない |
| `id_token` | だれか、を書いた JWT。**署名を確かめるまで信じない**（4節） |
| `expires_in` | アクセストークンの有効な秒数 |

**PKCE が防ぐこと**: コードは、ブラウザを通って届きます。もし途中でコードを盗まれても、`verifier` は一度もブラウザを通っていない（アプリのサーバのセッションにだけある）ので、盗んだ人はトークンに取り替えられません。`client_secret` を持てないアプリ（スマートフォンのアプリや、ブラウザだけの SPA）のために作られましたが、今は**すべてのアプリで使う**ことがすすめられています（OAuth 2.0 Security Best Current Practice、RFC 9700）。

**Basic 認証の注意**: OAuth 2.0 の決まり（RFC 6749 2.3.1）では、`client_id` と `client_secret` を、それぞれ先に**フォームの形**（`application/x-www-form-urlencoded`。空白は `+`、`:` は `%3A`）にしてから `:` でつなぎます。`task-app` のような英数字と `-` だけの値なら変わりませんが、`:` を含む値でも区切りを間違えないための決まりです。1つの値をフォームの形にするには、`URLSearchParams` に入れて文字列にし、先頭の `v=` を落とします。

```sh
$ node -e "console.log(new URLSearchParams({ v: 'dev-only:secret word' }).toString().slice(2))"
dev-only%3Asecret+word
```

`encodeURIComponent`（第2部 第7章）は空白を `%20` にするので、フォームの形とは違います。

### 3.4 失敗を見る

IdP は、おかしなリクエストを断ります。どれも、決まりのとおりの動きです。

| 試すこと | IdP の応答 |
| --- | --- |
| 3.3節を2回 | `400 invalid_grant`「コードはもう使われています」 |
| 3.3節の `verifier` を、3.1節をもう一度動かした別の値に変える | `400 invalid_grant`「code_verifier が合いません」 |
| 3.1節の `redirect_uri` を `http://127.0.0.1:9999/x` に変えて開く | IdP の画面に「redirect_uri が登録されたものと一致しません」。**どこにも戻さない** |
| 3.1節の `response_type` を `token` に変えて開く | `…/auth/callback?error=unsupported_response_type&state=…` に戻る |

`redirect_uri` が合わないときに戻さないのは、攻撃者が自分のサイトを `redirect_uri` に書いた URL を踏ませて、コードを自分のサイトへ届けさせるのを防ぐためです。IdP の登録画面では、戻り先を前方一致などではなく、完全な URL で登録します。

`response_type=token`（**インプリシットフロー**）は、アクセストークンを URL に直接入れて返す古いやり方で、今は使わないことになっています（RFC 9700）。練習用の IdP も受け付けません。

## 4. ID トークンを確かめる

3.3節の ID トークンは、まだ中身を読んだだけです。アプリは、次のことを確かめてから使います（OpenID Connect Core 3.1.3.7）。

| 順 | 確かめること | 防ぐこと |
| --- | --- | --- |
| 1 | ヘッダの `alg` が、こちらが決めた `RS256` か | `alg: none` や、公開鍵を HS256 の鍵として使わせる手口（第52章 7.1節） |
| 2 | ヘッダの `kid` の鍵が、JWKS にあるか | |
| 3 | その公開鍵で、署名が合うか | 中身の書き換え、IdP 以外が作ったトークン |
| 4 | `iss` が IdP の `issuer` か | 別の IdP のトークン |
| 5 | `aud` に自分の `client_id` があるか | 別のアプリのために出されたトークンの使い回し |
| 6 | `exp` が過ぎていないか | 古いトークン |
| 7 | `nonce` が、ログインを始めたときにセッションに覚えた値か | 前のログインのトークンを、もう一度使わせる手口 |

### 4.1 手を動かす: 公開鍵で署名を確かめる

`id-token.ts` を作ります。JWKS の鍵（JSON の形、**JWK**）は、`createPublicKey({ key: jwk, format: 'jwk' })` で Node.js の公開鍵（`KeyObject`）にできます。署名は、第2部 第8章の `verify('sha256', データ, 公開鍵, 署名)` で確かめます。

```ts
import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { z } from 'zod';

const Jwks = z.object({ keys: z.array(z.looseObject({ kid: z.string().optional(), kty: z.string() })) });

export async function fetchJwks(jwksUri: string) {
  const res = await fetch(jwksUri, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`JWKS を読めません: ${res.status}`);
  return Jwks.parse(await res.json()).keys;
}

export function verifyIdToken(idToken: string, keys: JsonWebKey[], opts: { issuer: string; clientId: string; nonce: string; now?: number }) {
  const [h = '', p = '', s = '', ...rest] = idToken.split('.');
  if (rest.length > 0 || s === '') throw new Error('JWT の形ではありません');
  const header = z.object({ alg: z.string(), kid: z.string().optional() }).parse(JSON.parse(Buffer.from(h, 'base64url').toString()));

  if (header.alg !== 'RS256') throw new Error(`alg が RS256 ではありません: ${header.alg}`);
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (jwk === undefined) throw new Error('鍵が見つかりません');
  const ok = verify('sha256', Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(s, 'base64url'));
  if (!ok) throw new Error('署名が合いません');
  // ここから下は 4節の表の 4〜7（samples/id-token.ts を見て書き足す）
}
```

`z.looseObject` は、書いていない項目（`n`・`e`・`use` など）も消さずに残すオブジェクトのスキーマです（第7部 第38章の `z.object` は、知らない項目を捨てます）。続きの 4〜7 と、コマンドから試す部分は [samples/id-token.ts](samples/id-token.ts) を見て書き足してください。

3.3節の ID トークンと、3.1節の `nonce` で試します。ID トークンの有効期間は5分なので、過ぎていたら 3.1節からやり直します。

```sh
$ node id-token.ts eyJhbGciOiJSUzI1NiIs…（ID トークン） uhcBDgVkwdXaw0ws9bTDuBqPuVDL-RNGjMj7Jiu_bSs
{
  iss: 'http://127.0.0.1:9640',
  sub: 'u-1001',
  aud: 'task-app',
  exp: 1794935361,
  iat: 1794935061,
  nonce: 'uhcBDgVkwdXaw0ws9bTDuBqPuVDL-RNGjMj7Jiu_bSs',
  email: 'alice@example.com',
  email_verified: true,
  name: 'alice'
}
$ node id-token.ts eyJhbGciOiJSUzI1NiIs…（同じ ID トークン） wrong
確かめられません: nonce が違います
```

IdP を起動し直すと鍵が変わるので、前の ID トークンは「鍵が見つかりません」になります。本物の IdP も、ときどき鍵を取り替えます。アプリは JWKS を毎回読まずに覚えておき（キャッシュ。練習問題8）、知らない `kid` が来たときだけ読み直すように作るのが一般的です。

## 5. ログインするアプリ

3〜4節を、1つの Express のアプリにまとめます。ブラウザを行き来する間、`state`・`nonce`・`verifier` を**セッション**（第52章）に覚えておくのが要です。

### 5.1 手を動かす: oidc-client.ts

[samples/oidc-client.ts](samples/oidc-client.ts) を開き、上から読みながら、`oidc-client.ts` として打ち込みます（4節の `id-token.ts` を `import` します）。大事な所だけ抜き出します。

```ts
// 1. ログインを始める: 3つの値を作ってセッションに覚え、IdP へ送り出す
app.get('/auth/login', (req, res) => {
  const oidc = { state: random(), nonce: random(), verifier: random() };
  req.session.oidc = oidc;
  // …3.1節と同じ URL を作る
  res.redirect(url.href);
});

// 2. IdP から戻ってくる
app.get('/auth/callback', async (req, res) => {
  const saved = req.session.oidc;
  delete req.session.oidc; // 1回だけ使う
  const { state, code, error } = req.query;
  if (saved === undefined || typeof state !== 'string' || state !== saved.state) {
    return res.status(400).send('ログインをやり直してください（state が合いません）');
  }
  // …error と code を見る → 3. コードを取り替える → 4. ID トークンを確かめる（失敗は 502）
  // 5. ログインした状態にする（第52章と同じく、ID を作り直してから）
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('ログインできませんでした');
    req.session.user = { sub: claims.sub, email: claims.email, name: claims.name };
    res.redirect('/');
  });
});
```

```sh
$ node oidc-client.ts
http://127.0.0.1:9647
```

ブラウザで http://127.0.0.1:9647 を開き、「mini IdP でログイン」→ IdP の画面で alice を押すと、`ログインしています: {"sub":"u-1001","email":"alice@example.com","name":"alice"}` と出ます。「断る」を押すと「ログインできませんでした: access_denied」です（どちらも Chromium で確かめました）。

| 書き方 | 理由 |
| --- | --- |
| `sameSite: 'lax'` | IdP から戻ってくるのは、別のサイトからのページの移動（GET）。`Lax` なら Cookie が付き、`state` を読める。`Strict` にすると付かず、ログインが必ず失敗する |
| `delete req.session.oidc` を最初に | 成功しても失敗しても、同じ `state` は2回使わせない |
| `state` を、`error` や `code` より先に確かめる | 自分が始めていないログインの戻りは、中身を何も信じない |
| 失敗を 502 に | IdP とのやり取りが失敗したのは、ブラウザのせいではない（第5部 第25章） |
| `regenerate` | ログインの前後でセッションの ID を変える（セッション固定化の対策。第52章） |

5.1節を動かしている間は、3節の手順を同時にしないでください。3.2節の戻りの URL は、9647 で動いているアプリの `/auth/callback` に届き、アプリはその `state` を知らないので 400 になります。

## 6. `sub` とメールアドレス

ID トークンのどの値で「このアプリのどのユーザーか」を決めるかは、ログインの安全に直結します。

| 値 | 変わるか | 一意か | ユーザーを決めるのに使うか |
| --- | --- | --- | --- |
| `sub` | 変わらない（決まり） | その IdP の中で一意 | **使う**。`iss`（または IdP の名前）と組にして保存する |
| `email` | 本人が変えられる | 同じアドレスが、別の IdP で別の人のものになりうる | そのままでは使わない |
| `name`・GitHub の `login` | 本人が変えられる | 一意とは限らない | 使わない（画面に出すだけ） |

困るのは、「すでにパスワードで登録している alice@example.com の人が、IdP でも alice@example.com でログインしてきた」ときです。同じ人かもしれませんが、**IdP がそのアドレスを確かめていなければ**、他人が alice@example.com を名乗った IdP のアカウントで、alice のアカウントに入れてしまいます。

結びつけてよいのは、次の両方を満たすときだけにします。

1. ID トークンの `email_verified` が `true`（IdP がアドレスを確かめた）
2. このアプリの側でも、そのユーザーのアドレスが確認済み（第53章）

満たさなければ、勝手に結びつけず「パスワードでログインしてから、設定の画面で結びつけてください」と案内します。練習問題7で、この判断を関数にします。練習用の IdP の bob は `email_verified: false` なので、試すのに使えます。

## 7. GitHub でログイン

GitHub の「OAuth App」は、OpenID Connect ではなく **OAuth 2.0 だけ**です。ID トークンが無いので、アクセストークンで GitHub の API（`/user`）を呼んで「だれか」を聞きます。[samples/github-login.ts](samples/github-login.ts) が、その形です。

| | 練習用の IdP（OIDC） | GitHub の OAuth App |
| --- | --- | --- |
| だれか | ID トークン（署名を確かめる） | `GET https://api.github.com/user`（HTTPS で GitHub に直接聞く） |
| ユーザーを決める値 | `sub` | `id`（数）。`login`（名前）は変えられる |
| メールアドレス | `email`・`email_verified` | `GET /user/emails` の、`primary` で `verified` のもの（scope `user:email` が要る） |
| トークンの応答 | JSON | `Accept: application/json` を付けないとフォームの形。失敗も `200` で `{ "error": … }` が返ることがある |
| `nonce` | 使う | 無い（ID トークンが無いため） |

動かすには、GitHub の「Settings → Developer settings → OAuth Apps」でアプリを登録し、Authorization callback URL に `http://127.0.0.1:9647/auth/github/callback` を書きます。表示された Client ID と、作った Client secret を環境変数で渡します。

```sh
$ GITHUB_CLIENT_ID=（Client ID） GITHUB_CLIENT_SECRET=（Client secret） node samples/github-login.ts
```

- `VAR=値 コマンド` は、そのコマンドの間だけ環境変数を決める書き方です（第5部 第26章）。Client secret はシェルの履歴に残るので、試した後は GitHub の画面で secret を削除して作り直してください（第1部 第3章 13.3節）。
- **このサンプルは、執筆の環境から GitHub に接続できなかったため、型と ESLint だけを確かめ、実際のログインは試していません。** GitHub の画面や API は変わることがあるので、必ず公式のドキュメント（参考資料）で確かめてください。

## 8. 気を付けること

| 気を付けること | 理由 | この章では |
| --- | --- | --- |
| `redirect_uri` は完全な URL で登録し、送るときも同じ値 | 前方一致にすると、コードを別の場所に届けさせられる | 3.4節 |
| `state` をセッションに覚えて、戻りで比べる。1回だけ | ログインの CSRF | 3.2・5節 |
| PKCE（`S256`）を、`client_secret` があっても使う | 盗まれたコードを使わせない | 3.3節 |
| `nonce` を ID トークンで確かめる | 古いトークンを使い回させない | 4節 |
| ID トークンは `alg` を決めて、JWKS の公開鍵で確かめる | 書き換え、`alg: none` | 4節 |
| インプリシットフロー（`response_type=token`）を使わない | トークンが URL に出る | 3.4節 |
| `client_secret` はサーバだけに置き、ブラウザに送るコードに書かない | 第9部 第48章 4節の `NEXT_PUBLIC_` と同じ | |
| アクセストークンを `localStorage` に置かない | XSS で読まれる（第55章）。サーバのセッションに置く | 5節（ブラウザにはセッションの Cookie だけ） |
| ログインの後の戻り先（`returnTo`）は、自分のサイトのパスだけ | オープンリダイレクト（第2部 第9章） | 練習問題8 |
| ユーザーは `iss` + `sub` で決め、メールアドレスで勝手に結びつけない | 他人のアカウントに入れてしまう | 6節 |

## 9. Next.js では

Next.js では、**Auth.js**（以前の NextAuth.js）がよく使われます。IdP を設定に書くと、`/api/auth/signin`・`/api/auth/callback/…` などの Route Handler（第9部 第49章）を作り、`state`・PKCE・`nonce`・ID トークンの確かめを中でしてくれます。この章の5節を、Route Handler とセッションの Cookie で書いたものにあたります。設定の書き方は版によって大きく変わるので、使うときは公式のドキュメント（https://authjs.dev/）で確かめてください。

## 10. Flask との対応

| この章 | Flask |
| --- | --- |
| `/.well-known/openid-configuration` を読む | Authlib の `oauth.register(…, server_metadata_url=…)` |
| `/auth/login`（`state`・`nonce`・PKCE を作ってリダイレクト） | `oauth.idp.authorize_redirect(redirect_uri)`。`state` などは Flask の `session` に入る |
| `/auth/callback`（`state` を比べ、コードを取り替え、ID トークンを確かめる） | `oauth.idp.authorize_access_token()` の1行 |
| `verifyIdToken`（JWKS と RS256） | Authlib の中（`authlib.jose`） |
| `req.session.regenerate` → `req.session.user` | `session.clear()` してから `session['user'] = …`、または Flask-Login の `login_user()` |
| GitHub の OAuth App | `oauth.register('github', api_base_url='https://api.github.com/', …)` と `oauth.github.get('user')` |

## まとめ

- OAuth 2.0 は「API を使う鍵（アクセストークン）」を渡す決まり、OpenID Connect はその上に「だれか」を書いた ID トークンを足した、ログインのための決まり。
- 認可コードフロー: ブラウザを通るのは1回だけのコード。トークンはアプリのサーバが `token_endpoint` から直接もらう。
- `state` はログインの CSRF を、PKCE は盗まれたコードの使用を、`nonce` は古い ID トークンの使い回しを防ぐ。どれもセッションに覚え、1回だけ使う。
- ID トークンは、`alg` を RS256 に決め、`kid` の公開鍵（JWKS）で署名を確かめ、`iss`・`aud`・`exp`・`nonce` を確かめてから使う。
- ユーザーは `iss` + `sub` で決める。メールアドレスで既存のユーザーに結びつけるのは、両方で確認済みのときだけ。
- `redirect_uri` は完全な一致、インプリシットフローは使わない、トークンはブラウザに置かない。
- GitHub の OAuth App は ID トークンが無いので、API で `id` を聞く。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- RFC 6749「The OAuth 2.0 Authorization Framework」: https://www.rfc-editor.org/rfc/rfc6749
- RFC 7636「Proof Key for Code Exchange (PKCE)」: https://www.rfc-editor.org/rfc/rfc7636
- RFC 9700「Best Current Practice for OAuth 2.0 Security」: https://www.rfc-editor.org/rfc/rfc9700
- RFC 7517「JSON Web Key (JWK)」: https://www.rfc-editor.org/rfc/rfc7517
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0.html
- OpenID Connect Discovery 1.0: https://openid.net/specs/openid-connect-discovery-1_0.html
- GitHub Docs「Authorizing OAuth apps」: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Node.js `crypto.createPublicKey`（JWK）: https://nodejs.org/api/crypto.html#cryptocreatepublickeykey
- Authlib「Flask OAuth Client」: https://docs.authlib.org/en/latest/client/flask.html
- OWASP Cheat Sheet「OAuth 2.0」: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html

---

前の章: [第53章 メール送信と本人確認](../ch53-email/README.md) ／ 第10部の目次: [../README.md](../README.md) ／ 次の章: [第55章 Web セキュリティの総点検](../ch55-web-security/README.md)
