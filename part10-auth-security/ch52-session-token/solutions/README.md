# 第52章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=../solutions/○○.ts node --test ○○.test.ts` と打つと、テストで確かめられます。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [cookie-options.ts](cookie-options.ts) |
| 2 | [base64url.ts](base64url.ts) |
| 3 | [require-auth.ts](require-auth.ts) |
| 4 | このファイルの問題4 |
| 5 | [origin-check.ts](origin-check.ts) |
| 6 | [verify-jwt.ts](verify-jwt.ts) |
| 7 | [timeout.ts](timeout.ts) |
| 8 | [logout-all.ts](logout-all.ts) |

問題8の解答は、`../exercises/password.ts` を import しています。

---

## 問題1 環境変数から Cookie の設定を作る

```ts
const DAY_MS = 24 * 60 * 60 * 1000;

export function cookieOptions(env: Env): SessionCookie {
  const production = env.NODE_ENV === 'production';
  const daysText = env.SESSION_DAYS ?? '7';
  if (!/^[0-9]+$/.test(daysText)) throw new Error('SESSION_DAYS は 1〜30 の整数にしてください');
  const days = Number(daysText);
  if (days < 1 || days > 30) throw new Error('SESSION_DAYS は 1〜30 の整数にしてください');
  return {
    // __Host- の名前は「Secure・Path=/・Domain なし」のときだけブラウザが受け取る。HTTPS の本番だけで使う
    name: production ? '__Host-sid' : 'sid',
    cookie: { httpOnly: true, sameSite: 'lax', secure: production, path: '/', maxAge: days * DAY_MS },
  };
}
```

- 開発（`http://127.0.0.1`）で `__Host-sid` にすると、`Secure` が付けられないので、ブラウザがその Cookie を受け取りません。ログインしても、次のリクエストでログインしていないことになります。だから、本番だけにします。
- 正規表現 `/^[0-9]+$/` は、「最初（`^`）から最後（`$`）まで、数字（`[0-9]`）が1つ以上（`+`）」です。`' 3'`・`'1.5'`・`'-2'`・`'1e1'`・`''` はどれも当てはまりません。
- 設定の誤りは、起動したときに例外で止めます（第5部 第26章の `loadConfig` と同じ考え方）。間違った値のまま動き続けるより、すぐに気付けます。

**つまずきやすい所**: `Number(env.SESSION_DAYS)` だけで書くと、`''` が `0`、`'1e1'` が `10` になり、`Number.isInteger` でも見分けられません。`parseInt(' 3')` も `3` を返します。

## 問題2 base64url の JSON を作る・読む

```ts
export function encodePart(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export function decodePart(text: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  if (text.length % 4 === 1) return null;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

- `Buffer.from('eyJhIjoxfQ=', 'base64url')` のように知らない文字（`=`）があっても、Node.js は例外を投げずに飛ばして読みます。「読めた」から正しい、とは言えないので、先に文字の種類を確かめます。
- `JSON.parse` の戻り値は `any` です。`let value: unknown` に入れて、型ガードで確かめてから返します（第7部 第38章 1節）。
- `typeof [] === 'object'`、`typeof null === 'object'` なので、配列と `null` は別に除きます。

**つまずきやすい所**: テストの `'eyJuYW1lIjoi44Gt44GTPz4-In0'` のように、日本語や `?>` を含むと、base64 では `+`・`/` が出る所に、base64url では `-`・`_` が出ます。`toString('base64')` を使うと、このテストで失敗します。

## 問題3 ログインしている人を探すミドルウェア

```ts
export function requireAuth(findUser: (id: number) => User | undefined): RequestHandler {
  return (req, res, next) => {
    const id = req.session.userId;
    if (id === undefined) {
      res.status(401).json(UNAUTHORIZED);
      return;
    }
    const user = findUser(id);
    if (user === undefined) {
      req.session.destroy((err) => {
        if (err) {
          next(err);
          return;
        }
        res.clearCookie('sid');
        res.status(401).json(UNAUTHORIZED);
      });
      return;
    }
    res.locals.user = user;
    next();
  };
}
```

- `requireAuth(findUser)` は「ミドルウェアを作る関数」です（第5部 第24章の `requireKey` と同じ形）。`findUser` を引数にしたので、メモリの `Map` でも、データベースでも、同じミドルウェアが使えます。
- ユーザーが消されたのにセッションを残すと、同じ id のユーザーがまた作られたとき、前のセッションで新しい人としてログインできてしまいます。テストの「ユーザーが戻っても使えない」は、それを確かめています。
- `destroy` のコールバックの中で応答を返します。`destroy` を呼んだ直後に `res.status(401)` を書くと、消し終わる前に応答が出ます（第3部 第12章のコールバックの順番）。
- ファイルの先頭の `import 'express-session';` は、`req.session` の型を読み込むための行です。この行が無いと、`declare module 'express-session'` の相手が見つからず、tsc が `Invalid module name in augmentation` と言います。

## 問題4 考えて答える

**(1)** Cookie には、ランダムなセッションの ID と、その署名だけが入っています。サーバは、署名を確かめてから、その ID で保存場所（メモリ・Redis）を引き、`userId: 1` を見つけます。`SESSION_SECRET` を変えると、前の Cookie の署名が合わなくなるので、express-session は「セッションが無い」として扱い、全員がログアウトした状態になります。全員をログアウトさせずに鍵を替えたいときは、`secret: [新しい鍵, 古い鍵]` のように配列にします（新しい鍵で署名し、どちらの鍵でも確かめる。第4部 第22章の鍵の取り替えと同じ）。

**(2)** 3回とも 401 ですが、毎回 `Set-Cookie: sid=…` が付き、違う ID のセッションが保存場所に3つ増えます（`curl` は Cookie を覚えないので、毎回新しいセッションになる）。見るだけの人やボットのたびにセッションが増えて、メモリや Redis を使い続けます。また、同意を取る前に Cookie を出すことになります。

```sh
$ curl -s -i http://127.0.0.1:9627/api/me
HTTP/1.1 401 Unauthorized
…
Set-Cookie: sid=s%3AXNr-2QJInGax8MKU7KTf7OqmrcIRwBwh.HK7m…; Path=/; Expires=…; HttpOnly; SameSite=Lax
```

**(3)**

| | 送るか | 理由 |
| --- | --- | --- |
| a | 送る | `Lax` は、ほかのサイトからのリンク（ページの移動の GET）には付ける。付けないと、メールのリンクから来たときにログインしていない画面になる |
| b | 送らない | ほかのサイトから始まった POST には付けない。CSRF のいちばんよくある形を防げる |
| c | 送る | `blog.example.com` と `app.example.com` は、オリジンは違うが、**同じサイト**（`example.com`）。`SameSite` はサイトで判断するので付く |

c のように、同じサイトの別のサブドメインのページ（だれかが書いたブログ、古いキャンペーンのページなど）から送られた POST は、`SameSite` では止まりません。`Origin`（`https://blog.example.com`）はオリジンの単位なので、`allowed` に入っていなければ止められます。

**(4)** JWT の2つ目の部分は、base64url で、だれでも読めます。パスワードのハッシュが見えると、それを手元で総当たりできます（第51章 2節）。トークンを盗まれないようにしても、トークンは**本人のブラウザ**に渡すものなので、本人（や、本人のパソコンの拡張機能、ログ、画面の共有）からは見えます。JWT には、見られてよいもの（`sub` など）だけを入れます。

**(5)** 署名も期限も合っているので、**通ります**。ブラウザから消しても、サーバはそのトークンを覚えていないので、取り消せません（本文7.2節）。サーバのセッションなら、ログアウトのときに保存場所から消すので、コピーした Cookie を送っても 401 になります（本文2.3節の `old.txt`）。

**(6)** `requireAuth` は「だれか分からない」ので 401（ログインすれば通るかもしれない）。`requireSameOrigin` は、ログインしているかどうかに関係なく「この送り方は受け付けない」ので 403（ログインし直しても変わらない）。画面は 401 を見たらログインのページに移るので、`Origin` の失敗を 401 にすると、ログインしても同じ所に戻ってくるだけになります。

## 問題5 `Origin` が無いときは `Referer` で

```ts
export function isAllowedRequest(method: string, headers: FromHeaders, allowed: readonly string[]): boolean {
  if (SAFE.has(method.toUpperCase())) return true;
  if (headers.origin !== undefined) return allowed.includes(headers.origin);
  if (headers.referer === undefined) return false;
  try {
    return allowed.includes(new URL(headers.referer).origin);
  } catch {
    return false;
  }
}
```

- `Origin` があるときに `Referer` を見に行かないのは、`Origin` のほうが確かだからです。片方でも通れば OK、にすると、ほかのサイトの `Origin` と、何かの方法で作った `Referer` の組み合わせで通るかもしれません。
- `Origin: null` は、`allowed` に `'null'` が入っていないので、そのまま断られます。
- `new URL(…).origin` は、`http://localhost:5173.other.example/` から `http://localhost:5173.other.example` を取り出すので、前方一致の間違い（`startsWith`）を避けられます。
- 判断を `isAllowedRequest` に分けたので、テストの多くは、サーバを起動せずに関数を呼ぶだけで書けました。

## 問題6 JWT を確かめて、理由を値で返す

[verify-jwt.ts](verify-jwt.ts) を見てください。順番が大事です。

1. 形（`malformed`）→ 2. `alg` → 3. 署名 → 4. 中身（`exp`・`nbf`・`iss`・`aud`）

- **署名を確かめる前に、中身を信じない**。たとえば `exp` を先に見て `expired` を返すと、だれでも作れる偽のトークンで「期限の判断」が動きます。害は小さくても、確かめていない値で分岐しない、という習慣にします。
- 戻り値を `{ ok: true; claims } | { ok: false; error }`（判別できるユニオン）にしたので、呼ぶ側は `if (!result.ok)` の後で `result.error` を、`else` で `result.claims` を、`as` なしで使えます。
- `leewaySec` は、発行したサーバと確かめるサーバの時計が少しずれていても困らないための幅です。大きくしすぎると、期限の意味が薄れます（数十秒まで）。
- `aud` は、文字列のことも配列のこともあります（RFC 7519 4.1.3）。`Array.isArray(aud) && aud.includes(audience)` で両方を扱います。

**つまずきやすい所**: `exp` の判定を `claims.exp < nowSec` にすると、ちょうど期限の秒（`exp === nowSec`）で通ってしまいます。RFC 7519 は「`exp` の時刻**以降**は受け付けない」と決めているので、`<=` で比べます。

## 問題7 使っていない時間・ログインしてからの時間

```ts
export function checkTimes(times: Times, now: number, { idleMs, absoluteMs }: Limits): TimeState {
  if (now - times.createdAt >= absoluteMs) return 'absolute';
  if (now - times.lastSeenAt >= idleMs) return 'idle';
  return 'ok';
}
```

ミドルウェアは [timeout.ts](timeout.ts) を見てください。

- `absolute` を先に見るのは、両方が切れていたら、より強い理由（「どれだけ使っていても、いつかはログインし直す」）を返すためです。画面で「長い間ログインしたままでした」と出し分けるときに使えます。
- 時計を引数（`now`）にしたので、テストで `Date.now` を待たずに、時間を進められます（第51章 練習問題6と同じ）。
- `lastSeenAt` を毎回書き換えるので、`resave: false` でも、リクエストのたびにセッションが保存されます。Redis のように速い保存場所なら問題ありませんが、データベースの表に保存するときは「1分に1回だけ書き換える」のように間引くこともあります。

## 問題8 すべての端末からログアウト

[logout-all.ts](logout-all.ts) を見てください。要点です。

```ts
const store = new session.MemoryStore();
const sessionsOf = new Map<number, Set<string>>();

async function destroyAllOf(userId: number, keep?: string) {
  const set = sessionsOf.get(userId) ?? new Set<string>();
  for (const sid of set) {
    if (sid === keep) continue;
    await destroySid(sid);
    set.delete(sid);
  }
}
```

- ログインでは、`regenerate` の**コールバックの中**で `req.sessionID` を覚えます。`regenerate` の前の ID は、すぐに消えるものなので、覚えても意味がありません。
- `/api/logout-all` は、自分も含めて消します。`/api/password` は、`keep` に今の `req.sessionID` を渡して、今の端末だけ残します。パスワードを変えた本人まで、ログインし直しになると不便だからです。
- 失敗した変更（400・401）では、何も消しません。テストの最後の問題で、ほかの端末が 200 のままであることを確かめています。
- `for … of` の中で `Set` から `delete` しても、JavaScript の `Set` は、まだ見ていない要素を正しくたどります（消した要素は飛ばすだけ）。
- `MemoryStore` の代わりに Redis の store（connect-redis）やデータベースの store を使っても、`store.destroy(sid, コールバック)` は同じ形です（express-session の store の決まり）。成果物では、セッションの表に `user_id` の列を持たせて、`Map` を使わずに `DELETE FROM sessions WHERE user_id = $1 AND sid <> $2` の1行で消します。

**つまずきやすい所**: `/api/logout-all` で `store` から消しただけで `req.session.destroy` を呼ばないと、今のリクエストの `req.session` はまだメモリにあるので、後で中身を変えると保存し直されます。また、`clearCookie` をしないと、ブラウザは消えたセッションの Cookie を送り続けます（害はありませんが、無駄です）。
