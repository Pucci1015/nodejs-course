# 第54章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=../solutions/○○.ts node --test ○○.test.ts` と打つと、テストで確かめられます。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [callback.ts](callback.ts) |
| 2 | [basic-auth.ts](basic-auth.ts) |
| 3 | [pick-key.ts](pick-key.ts) |
| 4 | このファイルの問題4 |
| 5 | [verify-id-token.ts](verify-id-token.ts) |
| 6 | [exchange.ts](exchange.ts) |
| 7 | [link-account.ts](link-account.ts) |
| 8 | [client-app.ts](client-app.ts) |

問題8の解答は、`../exercises/id-token.ts`（本文4節のコピー）を import しています。

---

## 問題1 戻りの URL を読む

```ts
export function parseCallback(url: string, expectedState: string): CallbackResult {
  const params = new URL(url).searchParams;
  if (expectedState === '' || params.get('state') !== expectedState) return { ok: false, reason: 'state' };
  const error = params.get('error');
  if (error === 'access_denied') return { ok: false, reason: 'denied', error };
  if (error !== null) return { ok: false, reason: 'error', error };
  const code = params.get('code');
  if (code === null || code === '') return { ok: false, reason: 'missing_code' };
  return { ok: true, code };
}
```

- いちばん先に `state` を確かめます。自分が始めていないログインの戻りは、`error` の値さえ信じません（攻撃者が「エラーです」の画面を出させて、利用者をだますこともできるため）。
- `expectedState === ''` を断るのは、セッションに何も覚えていない（`undefined` を `''` にして渡した）ときに、`state=` が空の URL を通さないためです。
- `searchParams.get` は `%2B` を `+` に戻した値を返します。URL の文字列を自分で `split('&')` して比べると、符号のままの値と比べてしまいます。

## 問題2 アプリの Basic 認証

```ts
const formEncode = (value: string) => new URLSearchParams({ v: value }).toString().slice(2);

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${formEncode(clientId)}:${formEncode(clientSecret)}`).toString('base64')}`;
}

export function parseBasicAuth(header: string): { clientId: string; clientSecret: string } | null {
  const m = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  if (m?.[1] === undefined) return null;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon === -1) return null;
  const form = new URLSearchParams(`id=${decoded.slice(0, colon)}&secret=${decoded.slice(colon + 1)}`);
  const clientId = form.get('id') ?? '';
  const clientSecret = form.get('secret') ?? '';
  if (clientId === '') return null;
  return { clientId, clientSecret };
}
```

- 先に符号にするので、`dev-only:secret word` の `:` は `%3A` になり、最初の `:` だけが区切りになります。`indexOf(':')`（最初の `:`）で分けるのは、そのためです。
- `Buffer.from(…, 'base64')` は、base64 でない文字を黙って読み飛ばします。だから、先に正規表現で文字を確かめます。末尾の `i` は大文字小文字を区別しない印で、`basic` も読みます。
- `id=…&secret=…` に読ませる方法は、値の中の `&` や `=` がもう `%26`・`%3D` になっているので混ざりません。
- 本当の IdP では、この後で `clientSecret` を `crypto.timingSafeEqual`（第52章）で比べます。

## 問題3 JWKS から鍵を選ぶ

```ts
export function pickKey(keys: readonly JsonWebKey[], header: JwtHeader): KeyObject | null {
  if (header.alg !== 'RS256') return null;
  const usable = keys.filter(
    (k) => k.kty === 'RSA' && (k.use === undefined || k.use === 'sig') && (k.alg === undefined || k.alg === 'RS256'),
  );
  let jwk: JsonWebKey | undefined;
  if (header.kid === undefined) {
    jwk = usable.length === 1 ? usable[0] : undefined;
  } else {
    jwk = usable.find((k) => k.kid === header.kid);
  }
  if (jwk === undefined) return null;
  try {
    return createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    return null;
  }
}
```

- `alg` は、ヘッダの値を信じて方式を選ぶのではなく、こちらが決めた `RS256` と一致するかだけを見ます（第52章 7.1節）。
- `use: 'enc'` は暗号化のための鍵です。同じ JWKS に、署名の鍵と暗号化の鍵が並ぶことがあります。
- `kid` が無いときに「最初の鍵」を使うと、鍵の取り替えの途中（新旧2つの鍵が並ぶ）で、違う鍵で確かめて失敗します。1つだけのときに限るのが安全です。
- JWKS は外から読んだ値なので、壊れていることもあります。`createPublicKey` の例外を `null` にして、アプリが落ちないようにします。

## 問題4 考えて答える

### (1) state を確かめないと

古い作りのアプリでは、alice のブラウザはそのまま「bob としてログインした状態」になります。alice は自分のアカウントだと思って、タスクに個人的なことを書いたり、カードの番号を登録したりするかもしれません。それはすべて攻撃者（bob）のアカウントに保存され、攻撃者が後で読めます（ログインの CSRF）。

`oidc-client.ts` では、3つのそれぞれが止めます。

- `state`: alice のセッションに、攻撃者の `state` は無いので、最初の `if` で 400。
- PKCE: たとえ `state` を通っても、コードは攻撃者の `verifier` に結びついています。alice のセッションの `verifier`（か、無い）では `token_endpoint` が `invalid_grant` を返し、502。
- `nonce`: さらに PKCE も無かったとしても、ID トークンの `nonce` は攻撃者のログインのもので、alice のセッションの値と違うので、4節の確かめで止まり、502。

1つが漏れても、ほかが止める作りにしておくのが大事です。RFC 9700 も、PKCE を使えば CSRF を防げるとしつつ、`state` を一緒に使うことを認めています。

### (2) redirect_uri を少し変える

3つとも、IdP は「redirect_uri が登録されたものと一致しません」の画面を出し（400）、どこにも戻しません。最後の `/`、`127.0.0.1` と `localhost`、クエリの有無は、すべて別の URL として扱われます。

「だいたい合っていれば戻す」作り（たとえば前方一致）だと、攻撃者は `http://127.0.0.1:9647/auth/callback/../../other`、`https://app.example.com.attacker.example/` のような、登録した文字列で始まる別の場所を書けます。コードがそこに届くと、攻撃者が使える場合があります。だから、決まり（RFC 9700）は完全な一致を求めています。本物の IdP でも、`localhost` と `127.0.0.1` を両方使うなら、両方を登録します。

### (3) PKCE と client_secret

- `client_secret` を持てないアプリは、配ったアプリの中に secret を書くしかなく、だれでも取り出せます。コードを盗まれたら、それだけでトークンに取り替えられます。PKCE の `verifier` は、ログインのたびに作り、そのアプリの中にしか無いので、盗んだコードだけでは使えません。
- secret を持つアプリでも、攻撃者が盗んだコードを、自分のブラウザからそのアプリの `/auth/callback` に送り込むと、アプリ自身が secret を付けて取り替えてくれます。そうすると、攻撃者のブラウザが、被害者としてログインした状態になります（コードの差し込み、authorization code injection）。PKCE があれば、攻撃者のブラウザのセッションの `verifier` はそのコードに結びついていないので、取り替えが失敗します。

### (4) ID トークンとアクセストークン

受け付けてはいけません。4節の5番、`aud` の確かめで止まります。A の ID トークンの `aud` は A の `client_id` なので、B の `client_id` を含みません。

ID トークンは「A に、この人がだれかを伝える」ためのものです。B が受け付けると、A を作った人（や、A に入り込んだ人）が、集めた ID トークンで B に利用者として入れてしまいます。API に送るのはアクセストークンで、B はそれが自分（B の API）あてに出されたものかを確かめます。

### (5) メールアドレスで結びつける

IdP がアドレスを確かめていないなら、だれでも好きなアドレスで IdP のアカウントを作れます。攻撃者が IdP で「bob@example.com」と名乗るアカウントを作ってログインすると、このアプリにパスワードで登録している本物の bob のアカウントに結びつけられ、bob のタスクを読めてしまいます（アカウントの乗っ取り）。逆に、攻撃者が先にアプリで bob@example.com を（確認せずに）登録しておき、後で本物の bob が IdP でログインして結びつけられると、攻撃者のパスワードでも bob のアカウントに入れます。両方で確認済みのときだけ結びつけるのは、この2つを防ぐためです。

### (6) トークンをどこに置くか

- `localStorage` に置く作り: XSS のスクリプトは `localStorage` を読めるので、アクセストークンそのものが攻撃者のサーバへ送られます。攻撃者は、利用者がページを閉じた後も、期限まで、どこからでも API を使えます。
- サーバのセッションに置く作り: `HttpOnly` の Cookie はスクリプトから読めないので、トークンも Cookie の値も漏れません。XSS のスクリプトは、ページが開いている間、そのブラウザから API を呼べてしまいますが（だから XSS 自体を防ぐのが第一。第55章）、持ち出して後で使うことはできません。

この考え方を **BFF**（Backend for Frontend）と呼び、ブラウザで動くアプリでも、トークンはサーバに置く作りがすすめられています。成果物も、この形です。

## 問題5 ID トークンを確かめて、理由を値で返す

```ts
export function verifyIdToken(idToken: string, keys: readonly JsonWebKey[], options: IdTokenOptions): IdTokenResult {
  const { issuer, clientId, nonce, now = Date.now(), leewaySec = 60 } = options;
  const parts = idToken.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed' };
  const [h = '', p = '', s = ''] = parts;
  const header = decodePart(h);
  const claims = decodePart(p);
  if (header === null || claims === null || !/^[A-Za-z0-9_-]+$/.test(s)) return { ok: false, error: 'malformed' };

  if (header.alg !== 'RS256') return { ok: false, error: 'alg' };
  const key = pickKey(keys, header.kid);
  if (key === null) return { ok: false, error: 'key' };
  if (!verify('sha256', Buffer.from(`${h}.${p}`), key, Buffer.from(s, 'base64url'))) return { ok: false, error: 'signature' };

  if (claims.iss !== issuer) return { ok: false, error: 'iss' };
  const aud = claims.aud;
  const audList = typeof aud === 'string' ? [aud] : Array.isArray(aud) ? aud : [];
  if (!audList.includes(clientId)) return { ok: false, error: 'aud' };
  if (audList.length > 1 && claims.azp !== clientId) return { ok: false, error: 'aud' };
  const nowSec = Math.floor(now / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + leewaySec <= nowSec) return { ok: false, error: 'expired' };
  if (typeof claims.iat !== 'number' || claims.iat - leewaySec > nowSec) return { ok: false, error: 'iat' };
  if (claims.nonce !== nonce) return { ok: false, error: 'nonce' };
  return { ok: true, claims };
}
```

（`decodePart` と `pickKey` は、第52章 練習問題2 と問題3 のコピーです。全体は [verify-id-token.ts](verify-id-token.ts)。）

- 署名を確かめる前に、中身（`iss` など）を見ても安全ですが、見た結果で何かを決めてはいけません。この解答は、署名が合った後に中身を確かめる順にしています。
- `${h}.${p}` は、受け取った文字列のまま使います。`JSON.stringify(header)` などで作り直すと、空白や順番が変わって署名が合いません。
- `leewaySec` は、IdP とアプリの時計が少しずれていても困らないようにするためです。大きくしすぎると、期限が切れたトークンを長く受け付けてしまいます。
- `exp` が無いトークンを「期限なし」として通さないのが大事です（`undefined + 60` は `NaN` で、`NaN <= nowSec` は `false` なので、`typeof` を確かめないと通ってしまいます）。

## 問題6 コードをトークンに取り替える関数

全体は [exchange.ts](exchange.ts) です。

```ts
const TokenSet = z.object({
  access_token: z.string().min(1),
  token_type: z.string().refine((t) => t.toLowerCase() === 'bearer'),
  id_token: z.string().min(1),
  expires_in: z.number().int().positive().optional(),
  scope: z.string().optional(),
});
const ErrorBody = z.object({ error: z.string(), error_description: z.string().optional() });

// …fetchFn で POST した後
let body: unknown;
try {
  body = await res.json();
} catch {
  body = undefined;
}
if (!res.ok) {
  const e = ErrorBody.safeParse(body);
  if (e.success) throw new OAuthError(res.status, e.data.error, e.data.error_description);
  throw new OAuthError(res.status, 'server_error');
}
const tokens = TokenSet.safeParse(body);
if (!tokens.success) throw new OAuthError(res.status, 'invalid_response', '応答の形が違います');
return tokens.data;
```

- `res.json()` の例外を先に `undefined` にしておくと、「JSON でない」と「形が違う」を、同じ `safeParse` の失敗として扱えます。
- 決まり（RFC 6749 7.1）では、`token_type` は大文字小文字を区別しません。`Bearer` と `bearer` の両方を返す IdP があります。
- `fetchFn` を引数にすると、テストで IdP を動かさなくても、決めた応答（502 の HTML など）を試せます。第11部で、この考え方をもっと使います。
- エラーの `message` に `client_secret` やコードを入れないようにします。ログに残るからです。

## 問題7 外のログインとユーザーを結びつける

全体は [link-account.ts](link-account.ts) です。

```ts
signIn(profile: ExternalProfile): SignInResult {
  const key = keyOf(profile.provider, profile.sub);
  const known = identities.get(key);
  if (known !== undefined) return { kind: 'existing', userId: known };

  const email = profile.email?.trim().toLowerCase();
  const sameEmail = email === undefined ? undefined : [...users.values()].find((u) => u.email === email);
  if (sameEmail !== undefined) {
    if (profile.emailVerified && sameEmail.emailVerified) {
      identities.set(key, sameEmail.id);
      return { kind: 'linked', userId: sameEmail.id };
    }
    return { kind: 'conflict' };
  }
  const user: LocalUser = { id: nextId++, email: email ?? '', emailVerified: email !== undefined && profile.emailVerified };
  users.set(user.id, user);
  identities.set(key, user.id);
  return { kind: 'created', userId: user.id };
},
```

- いちばん先に `provider` + `sub` で探します。2回目以降は、メールアドレスが変わっていても同じ人です。メールアドレスで先に探すと、IdP でアドレスを変えた人が別のユーザーになってしまいます。
- `conflict` のとき、アプリは「このアドレスはもう登録されています。パスワードでログインしてから、設定の画面で結びつけてください」と案内します。何を返すかで「このアドレスが登録済みか」が分かってしまう点は、第51章 5節の列挙と同じ問題ですが、外のログインでは、IdP で本人が確かめられているので、多くのサービスがこの案内を出しています。
- データベースでは、`identities` の表を作り、`(provider, sub)` に一意制約を付けます（成果物）。

## 問題8 設定を IdP から読むログインのアプリ

全体は [client-app.ts](client-app.ts) です。本文5節との違いだけを挙げます。

```ts
let discovered: Promise<{ meta: …; keys: … }> | undefined;
function discover() {
  discovered ??= (async () => {
    const metaRes = await fetch(`${config.issuer}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000) });
    const meta = Discovery.parse(await metaRes.json());
    if (meta.issuer !== config.issuer) throw new Error('issuer が違います');
    const jwksRes = await fetch(meta.jwks_uri, { signal: AbortSignal.timeout(5000) });
    return { meta, keys: Jwks.parse(await jwksRes.json()).keys };
  })().catch((err: unknown) => {
    discovered = undefined; // 失敗したら、次にまた読み直す
    throw err;
  });
  return discovered;
}

export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}
```

- 結果ではなく `Promise` を覚えるので、IdP の設定を読んでいる途中に2つ目のリクエストが来ても、同じ `Promise` を待ち、読むのは1回です。失敗した `Promise` を覚えたままにすると、IdP が一時的に落ちただけで、アプリを起動し直すまでログインできなくなるので、消しておきます。
- 設定の `issuer` が、自分が思っている IdP と同じかを確かめます（OpenID Connect Discovery 4.3）。違えば、ID トークンの `iss` の確かめが意味を持ちません。
- `returnTo` は、ログインを始めるときに `safeReturnTo` で確かめてからセッションに覚えます。戻ってきたときにクエリから読むと、IdP の戻りの URL に書き足された値を信じることになります。
- 成功した後と、断られた後の移動は 303 です（POST ではないので 302 でも動きますが、「GET で次のページへ」の意味をはっきりさせています。第2部 第7章）。
- この解答の JWKS は、最初に読んだものをずっと使います。IdP が鍵を取り替えると、アプリを起動し直すまでログインできません。「知らない `kid` なら、一度だけ JWKS を読み直す」ように広げてみてください（`discovered = undefined` にしてから、もう一度 `discover()`）。
