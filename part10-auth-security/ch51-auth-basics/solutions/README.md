# 第51章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=../solutions/○○.ts node --test ○○.test.ts` と打つと、テストで確かめられます。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [email.ts](email.ts) |
| 2 | [phc.ts](phc.ts) |
| 3 | [policy.ts](policy.ts) |
| 4 | このファイルの問題4 |
| 5 | [rehash.ts](rehash.ts) |
| 6 | [backoff.ts](backoff.ts) |
| 7 | [authorize.ts](authorize.ts) |
| 8 | [app.ts](app.ts) |

問題5・8の解答は、`../exercises/password.ts` と `../exercises/policy-sample.ts` を import しています（同じファイルを2つ持たないため）。

---

## 問題1 メールアドレスをそろえる

```ts
const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export function normalizeEmail(input: unknown): string | null {
  const parsed = Email.safeParse(input);
  return parsed.success ? parsed.data : null;
}
```

- `trim()`・`toLowerCase()` は、確かめる前に値を変えます（第5部 第25章 5節）。変えた後の値に `max(254)` と `z.email()` が効きます。
- `.pipe(z.email())` は「前のスキーマを通した値を、次のスキーマにも通す」書き方です。`z.string().trim().email()` のように直接つなぐ書き方は、Zod 4 では古い書き方なので、本文と同じ `pipe` にしました。
- `safeParse` は、文字列でない値でも例外を投げず、`success: false` を返します。引数を `unknown` にできるのは、このためです。

**つまずきやすい所**: `input.trim()` から書き始めると、`input` が `unknown` なので tsc に止められます。先に `typeof input === 'string'` で絞り込むこともできますが、Zod に任せるほうが短く書けます。

## 問題2 PHC 文字列を作る・読む

```ts
export function parsePhc(text: string): Phc | null {
  const parts = text.split('$'); // ['', 'argon2id', 'v=19', 'm=…,t=…,p=…', ソルト, ハッシュ]
  if (parts.length !== 6 || parts[0] !== '' || parts[1] !== 'argon2id' || parts[2] !== 'v=19') return null;
  const params = /^m=(\d+),t=(\d+),p=(\d+)$/.exec(parts[3] ?? '');
  if (params === null) return null;
  …
}
```

- 本文の `verifyPassword` は1つの正規表現で読みましたが、ここでは `split('$')` で分けてから、部分ごとに確かめました。どこが違ったのかが分かりやすく、直すのも簡単です。
- `parts[3] ?? ''` の `?? ''` は、`noUncheckedIndexedAccess`（第7部 第35章 8節）で、配列の要素が `string | undefined` になるためです。
- `Buffer.from(文字列, 'base64')` は、最後の `=` が無くても読めます。でも、base64 でない文字（`!` など）は黙って飛ばしてしまうので、先に正規表現で確かめています。

## 問題3 パスワードの決まりを設定できる形に

```ts
const normalized = password.normalize('NFKC');
const length = [...normalized].length;
const lower = normalized.toLowerCase();
```

- `'🐱'.length` は 2 です（JavaScript の文字列の長さは、UTF-16 の単位の数）。`[...'🐱'].length` は 1 です。利用者が数える「文字」に近いのは、後のほうです。
- NFKC は、全角の `ｑ` を半角の `q` に、全角の `１` を `1` にします。そろえずに比べると、全角で打っただけで「よく使われるパスワード」の確かめをすり抜けます。
- `contains_email` を「3文字以上のときだけ」にしたのは、`ab@example.com` のような短い名前だと、たまたま含むパスワードが多すぎるからです。

## 問題4 考えて答える

**(1)** 同じ値の人は、同じパスワードを使っていることが分かります。だれか1人のパスワードが分かれば（よく使われるパスワードを片端から SHA-256 にして比べれば、すぐ見つかります）、同じ値の人全員のパスワードが分かります。

**(2)** ソルトの役目は、「同じパスワードでも、人ごとに違うハッシュにする」ことです。秘密にする必要はありません。攻撃する人は、ソルトを知っていても、人ごとに1つずつ計算し直すしかなく、「よく使われるパスワードのハッシュの表」を前もって作っておく方法（レインボーテーブル）が使えなくなります。

**(3)** 「登録されていません」と返すと、だれでも、あるメールアドレスがこのサービスに登録されているかを調べられます（**ユーザーの列挙**）。登録されていると分かれば、そのアドレスあてに、このサービスを装ったメールを送るなど、次の攻撃に使えます。`auth-api.ts` の `/api/register` は、登録済みのアドレスに 409 を返すので、同じことが調べられます。第53章で、「確認のメールを送りました」と、どちらの場合も同じ応答にする形に直します。

**(4)**
- (a) **401**。だれなのかが分からない（認証されていない）ので、「ログインしてください」を意味する 401 です。
- (b) **404**。bob には、そのタスクがあることも知らせません。403 を返すと「その番号のタスクはある」と分かってしまいます。
- (c) **403**。bob はタスクを見られるので、あることは知っています。「あるが、あなたには消せない」を 403 で伝えます。

**(5)** alice は、正しいパスワードを打っても 15 分間ログインできなくなります（締め出し）。これを続ければ、alice はずっと使えません。直し方は、締め出す代わりに待つ時間を少しずつ長くする（問題6）、メールアドレスと IP アドレスの組で数える、締め出す前に追加の確かめ（第13部などで扱う多要素認証）を入れる、などです。

**(6)** Argon2 は、パスワードが長いほど、少しずつ計算が重くなります。長さに上限が無いと、何 MB もの「パスワード」を何度も送って、サーバの CPU を使い切らせることができます。ログインは、登録よりも何度も呼ばれるので、確かめる前の Zod で断ります。登録の 128 文字より長い 256 にしてあるのは、長すぎるパスワードは、どのみち登録されていないので、ここではおおまかな上限で十分だからです。

## 問題5 古いハッシュを作り直す

```ts
export function needsRehash(stored: string, current: Params = PARAMS): boolean {
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(stored);
  if (m === null) return true;
  return Number(m[1]) < current.m || Number(m[2]) < current.t || Number(m[3]) !== current.p;
}
```

- 作り直したハッシュは、呼んだ側（ログインのルート）が、データベースに保存し直します。この関数は、保存までは受け持ちません。
- 読めない文字列を `true` にすると、昔の別の形式（たとえば scrypt）で保存したユーザーも、次にログインしたときに Argon2id に移せます。ただし、そのときは `verifyPassword` も、昔の形式を読めるようにしておく必要があります。

## 問題6 失敗が続くほど待たせる

```ts
const seconds = failures <= free ? 0 : Math.min(maxSeconds, baseSeconds * 2 ** (failures - free - 1));
state.set(key, { failures, until: now() + seconds * 1000 });
```

- `**` は「べき乗」です。`2 ** 3` は 8 です。
- 待つ時間を「次に試してよい時刻」（`until`）として覚えておくと、`wait` は引き算だけで済みます。
- 締め出しと違い、本当の alice は、少し待てば試せます。攻撃する人にとっては、1回試すごとに待つ時間が倍になるので、たくさん試すのは難しくなります。

**つまずきやすい所**: `wait` を `Math.floor` で切り捨てると、「あと 0.5 秒」が `0` になり、待たずに試せてしまいます。切り上げ（`Math.ceil`）にします。

## 問題7 共有されたタスクの認可

```ts
switch (action) {
  case 'read':
    return isOwner || task.sharedWith.includes(user.id) || user.role === 'admin';
  case 'update':
    return !task.locked && (isOwner || task.sharedWith.includes(user.id));
  case 'delete':
  case 'share':
    return isOwner;
}
```

- `switch` で `Action` の4つを全部書くと、関数の最後に `return` が無くても tsc が通ります（第7部 第36章 2節の網羅）。後で `Action` に `'archive'` を足すと、tsc が「ここで返していない」と教えてくれます。
- `statusFor` は、まず `read` できるかを見て、できなければ 404 にします。こうすると「見えないものは、無いのと同じ」という決まりを、1か所で守れます。

## 問題8 パスワードを変える API

```ts
async function authenticate(email: string, password: string): Promise<User | undefined> {
  const user = users.get(email);
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
  return user !== undefined && ok ? user : undefined;
}
```

- ログインとパスワードの変更は、どちらも「メールアドレスとパスワードが合うか」を確かめます。同じ処理を `authenticate` にまとめると、ダミーのハッシュを使う決まりを、2か所に書かずに済みます。
- 401 と 422 の順番に注意します。今のパスワードを確かめる前に新しいパスワードの決まりを確かめると、「今のパスワードが分からない人」にも決まりの文を返してしまいます。だれなのかを先に確かめ（401）、その後で中身を確かめます（422）。
- 本物のサービスでは、パスワードを変えたら、ほかの端末のログインを終わらせます（第52章）。
