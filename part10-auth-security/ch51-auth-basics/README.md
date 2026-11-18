# 第51章 認証の基礎

ここまでのタスク管理アプリは、だれでも、どのタスクでも読んだり消したりできました。第10部では、**ユーザー**を足します。この章では、その土台として、「あなたはだれか」を確かめる**認証**と、「その人は、それをしてよいか」を決める**認可**を分けて考えます。そして、パスワードを安全に保存する方法と、登録・ログインの API を、自分で書いて確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第2部 第8章（ハッシュ・HMAC）、第4部 第22章（scrypt と `timingSafeEqual`）、第5部 第24・25章（回数の制限・Zod）、第7部（TypeScript） |
| この章のゴール | 認証と認可の違い、401 と 403 の違いを説明できる / パスワードを SHA-256 で保存してはいけない理由と、ソルト・遅いハッシュの役目を説明できる / Argon2id でパスワードをハッシュにし、PHC 文字列で保存・確かめられる / 長さとよく使われるパスワードで決まりを作れる / 登録とログインの API を、ユーザーの列挙と総当たりに気を付けて書ける / 認可の決まりを1つの関数にまとめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第10部の最初の章です。先に、第10部のフォルダを `~/dev/part10` にコピーします（[第10部の README](../README.md) の「準備」。1回だけ）。
>
>   ```sh
>   $ bash （ここに Finder から part10-auth-security フォルダの中の setup-part10.sh をドラッグ）
>   ```
>
> - この章のコマンドは、`~/dev/part10/ch51-auth-basics/` で実行します。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part10/ch51-auth-basics
>   ```
>
> - 5節でポート **9617** を使います。
> - 第10部も、第7部と同じく TypeScript を `node ○○.ts` で動かし、`npx tsc` で型を確かめます（第7部 第35章）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 認証と認可、401 と 403（1・7節） | 第52章（ログインしている人を決める）、第55章（認可の漏れの点検）、成果物（自分のタスクだけを見せる） |
| パスワードのハッシュ（2・3節） | 第53章（パスワードの再設定）、成果物（ユーザーの表の `password_hash`） |
| パスワードの決まり（4節） | 成果物（登録の画面で、決まりの文を出す） |
| 列挙と総当たりへの備え（5・6節） | 第53章（「確認のメールを送りました」と同じ応答にする）、成果物 |
| 認可を1つの関数に（7節） | 成果物（タスクの持ち主）、第13部 |

---

## 1. 認証と認可

| | 認証（authentication） | 認可（authorization） |
| --- | --- | --- |
| 確かめること | あなたはだれか | その人は、それをしてよいか |
| 例 | メールアドレスとパスワードが合うか | alice は、このタスクを消してよいか |
| 失敗したとき | **401** Unauthorized（「だれか分からない。ログインして」） | **403** Forbidden（「だれかは分かったが、それはできない」） |

401 の名前は「Unauthorized（認可されていない）」ですが、意味は「認証されていない」です。HTTP の決まり（RFC 9110）が作られたときの名前が、そのまま残っています。

**Flask では**: Flask-Login は、ログインしたユーザーの id をセッション（署名付きの Cookie。第4部 第22章）に入れ、`@login_required` でログインしていない人を止めます。パスワードは Werkzeug の `generate_password_hash`（今の既定は scrypt）でハッシュにし、`check_password_hash` で確かめます。どちらも、この章で自分で書く部品が、中に入っています。

この章では、認証のうち「パスワードを確かめる」まで（2〜6節）と、認可（7節）を書きます。「ログインした状態を、次のリクエストでも覚えておく」のは、第52章のセッションです。

## 2. パスワードをそのまま保存しない

ユーザーの表は、いつか漏れるかもしれない、と考えて作ります。SQL インジェクション（第6部 第31章）、バックアップの置き忘れ、社員の持ち出しなど、原因はいろいろです。漏れても、すぐには元のパスワードが分からないように、パスワードは**ハッシュ**（一方向の計算の結果。第2部 第8章）にして保存します。

### 2.1 手を動かす: SHA-256 だけでは足りない

`naive-hash.ts` を作ります。

```ts
import { createHash } from 'node:crypto';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

// 同じパスワードは、だれのものでも同じ値になる
console.log('alice:', sha256('neko-daisuki'));
console.log('bob:  ', sha256('neko-daisuki'));

// 1秒間に、何回計算できるか
let count = 0;
const end = Date.now() + 1000;
while (Date.now() < end) {
  sha256(`password${count}`);
  count++;
}
console.log(`1秒で ${count.toLocaleString()} 回`);
```

```sh
$ node naive-hash.ts
alice: 4b4e8264eff5fb9d08e0769a8be7def232f2cd74c23485bd78c26377cb684173
bob:   4b4e8264eff5fb9d08e0769a8be7def232f2cd74c23485bd78c26377cb684173
1秒で 997,787 回
```

（回数は、コンピュータによって違います。）

| 見えたこと | 困ること |
| --- | --- |
| 同じパスワードは、同じ値 | 漏れた表で同じ値の人は、同じパスワード。1人分かれば全員分かる。よく使われるパスワードのハッシュを前もって並べた表（**レインボーテーブル**）を引くだけで分かる |
| 1秒に約100万回 | これは JavaScript で1つの CPU を使った数です。専用の道具と GPU を使うと、1秒に何十億回も試せます。8文字の英小文字（約2000億通り）なら、数分で全部試せます |

SHA-256 は、大きなファイルを速く確かめるために作られました。**速いことが、パスワードには弱点**になります。

### 2.2 手を動かす: ソルト

1つ目の問題は、ユーザーごとのランダムな値（**ソルト**、salt）を混ぜると解けます。`salted.ts` を作ります。

```ts
import { createHash, randomBytes } from 'node:crypto';

function saltedSha256(password: string, salt: Buffer): string {
  return createHash('sha256').update(salt).update(password).digest('hex');
}

for (const user of ['alice', 'bob']) {
  const salt = randomBytes(16); // 16バイト（128ビット）のランダムな値。ユーザーごとに作り、ハッシュと一緒に保存する
  console.log(user, salt.toString('base64'), saltedSha256('neko-daisuki', salt));
}
```

```sh
$ node salted.ts
alice oZxDppioAaAlyd6RhJM/gw== c5e17ae5a481614666609f93c691cc5b67e44226af2c1579c77d4399451d061d
bob cP3WsAwZYRGgqP/ackyStA== e15c1296f75ac2c6013adde7e2e6ebb362ac3a7402b689dca68a78ffb232bf75
```

- 同じ `neko-daisuki` でも、違う値になりました。レインボーテーブルは、ソルトごとに作り直す必要があるので、使えなくなります。
- ソルトは秘密ではありません。ハッシュと一緒に保存し、ログインのときに同じソルトで計算し直します。
- `randomBytes` は、予想できない乱数を作る関数です（第4部 第22章）。`Math.random()` は予想できることがあるので、使いません。

でも、2つ目の問題（速すぎる）は残っています。攻撃する人は、ソルトを知っているので、1人ずつ、1秒に何十億回試せます。

### 2.3 手を動かす: わざと遅いハッシュ

パスワードのためのハッシュは、**わざと遅く、たくさんのメモリを使う**ように作られています。`slow-hash.ts` を作ります。

```ts
import { argon2, createHash, randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const argon2Async = promisify(argon2);
const salt = randomBytes(16);
const password = 'neko-daisuki';

async function time(label: string, fn: () => unknown) {
  const start = performance.now();
  await fn();
  console.log(`${label.padEnd(10)} ${(performance.now() - start).toFixed(1)} ms`);
}

await time('SHA-256', () => createHash('sha256').update(salt).update(password).digest());
// scrypt: N（計算の量とメモリ）を 2^15 にする。maxmem はメモリの上限（足りないとエラーになる）
// （promisify は、scrypt のように省略できる引数がある関数では、型がうまく付かないので、Promise を自分で作る）
await time('scrypt', () =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  ),
);
// Argon2id: memory は KiB（19456 KiB = 19 MiB）、passes は繰り返しの回数（OWASP のおすすめの値）
await time('argon2id', () =>
  argon2Async('argon2id', { message: password, nonce: salt, memory: 19456, passes: 2, parallelism: 1, tagLength: 32 }),
);
```

```sh
$ node slow-hash.ts
SHA-256    0.6 ms
scrypt     87.6 ms
argon2id   36.2 ms
```

- `promisify`（第3部 第12章）は、コールバックの関数を、Promise を返す関数に変えます。
- 1回のログインで 40〜90 ミリ秒なら、利用者は気になりません。でも、攻撃する人にとっては、1秒に 10〜30 回しか試せなくなります。SHA-256 の何万分の一です。
- たくさんのメモリを使うのは、GPU や専用の回路で並べて計算するのを難しくするためです。

| 方法 | 特徴 | この教材では |
| --- | --- | --- |
| **Argon2id** | 2015年のパスワードハッシュのコンテストで選ばれた。メモリの量・繰り返し・並列の数を決められる。RFC 9106 | **使う**（Node.js 24.7 から `node:crypto` に入った） |
| scrypt | メモリを多く使う。Node.js に昔からある。Werkzeug（Flask）の既定 | 第4部 第22章で使った |
| bcrypt | 古くから使われる。72バイトより長いパスワードは切り捨てる | npm のパッケージが要る。名前だけ |
| PBKDF2 | メモリを使わないので、GPU で速く試されやすい。古い決まりで求められる所がある | 使わない |

重さの値（Argon2id のメモリ 19 MiB・2回）は、OWASP の「Password Storage Cheat Sheet」のおすすめです。サーバの速さに合わせて、1回 0.5 秒を超えない範囲で、なるべく重くします。

## 3. パスワードを保存する形

ハッシュを確かめるには、ソルトと、重さの値（メモリ・回数）も要ります。そこで、全部を1つの文字列にまとめて保存します。決まった書き方として、**PHC 文字列**がよく使われます。

```text
$argon2id$v=19$m=19456,t=2,p=1$jdiMOHk7vXMS09RlgrHS4g$2uwwnEdA60EtZUGU/bPpG05vEIhPWfJu0TFZH3l4TFI
 ───┬───  ─┬── ───────┬──────  ──────────┬──────────── ──────────────────┬──────────────────────
   種類    版     重さの値         ソルト（base64）          ハッシュ（base64）
```

`m` はメモリ（KiB）、`t` は繰り返しの回数、`p` は並列の数です。base64 の最後の `=` は付けません。重さの値が文字列に入っているので、後で重さを上げても、昔のハッシュを確かめられます（練習問題5）。

### 3.1 手を動かす: hashPassword と verifyPassword

`password.ts` を作ります。

```ts
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const argon2Async = promisify(argon2);

/** 計算の重さ。m はメモリ（KiB）、t は繰り返しの回数、p は並列の数（OWASP のおすすめの値） */
export const PARAMS = { m: 19456, t: 2, p: 1 };

type Params = { m: number; t: number; p: number };

/** PHC 文字列の中の base64 は、最後の = を付けない */
const b64 = (buf: Buffer) => buf.toString('base64').replace(/=+$/, '');

function derive(password: string, salt: Buffer, params: Params): Promise<Buffer> {
  return argon2Async('argon2id', {
    message: password,
    nonce: salt,
    memory: params.m,
    passes: params.t,
    parallelism: params.p,
    tagLength: 32,
  });
}

/** パスワードを PHC 文字列にする。同じパスワードでも、毎回違う文字列になる（ソルトが毎回違うので） */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, PARAMS);
  return `$argon2id$v=19$m=${PARAMS.m},t=${PARAMS.t},p=${PARAMS.p}$${b64(salt)}$${b64(hash)}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

/** PHC 文字列とパスワードが合うか。形がおかしい文字列なら false */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const m = PHC.exec(stored);
  if (m === null) return false;
  const params = { m: Number(m[1]), t: Number(m[2]), p: Number(m[3]) };
  const salt = Buffer.from(m[4] ?? '', 'base64');
  const expected = Buffer.from(m[5] ?? '', 'base64');
  const actual = await derive(password, salt, params);
  // 長さが違うと timingSafeEqual は例外を投げるので、先に比べる。比べる時間は、どこまで合っているかによらない
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
```

| 書き方 | 意味 |
| --- | --- |
| `argon2('argon2id', { message, nonce, … })` | `message` がパスワード、`nonce` がソルト、`tagLength` が作るハッシュのバイト数 |
| `` `…$${b64(salt)}` `` | テンプレート文字列の中の `$` は、そのまま `$` です。`${…}` だけが値に置きかわります |
| `PHC.exec(stored)` | 正規表現に合えば、`( )` で囲んだ部分が `m[1]`〜`m[5]` に入る |
| `timingSafeEqual(a, b)` | 中身を比べる時間が、どこまで合っているかによらない（第4部 第22章）。`===` は最初に違う所で止まるので、時間から少しずつ当てられるおそれがある |

試す `try-password.ts` を作ります。

```ts
import { hashPassword, verifyPassword } from './password.ts';

const stored = await hashPassword('neko-daisuki');
console.log(stored);
console.log(await hashPassword('neko-daisuki')); // もう1回。違う文字列になる
console.log('正しい:', await verifyPassword(stored, 'neko-daisuki'));
console.log('違う:  ', await verifyPassword(stored, 'neko-daisuki!'));
```

```sh
$ node try-password.ts
$argon2id$v=19$m=19456,t=2,p=1$jdiMOHk7vXMS09RlgrHS4g$2uwwnEdA60EtZUGU/bPpG05vEIhPWfJu0TFZH3l4TFI
$argon2id$v=19$m=19456,t=2,p=1$J0qCeTHsVyhdNXNdLy2TPw$5VWuTAI+NBsmzrUgQVyJbAZAZ2nb0ZILKlNQeW9tzsE
正しい: true
違う:   false
$ npx tsc
```

ソルトは毎回違うので、表示される文字列も、毎回違います。`npx tsc` が何も出さなければ、型も合っています。

> **注意**: パスワードを、ログ・エラーの文・画面に、決して出さないでください。`console.log(req.body)` と書くと、ボディの中のパスワードがログに残ります。

## 4. パスワードの決まり

昔は「大文字・小文字・数字・記号を必ず入れる」「90日ごとに変える」が勧められていました。今は、どちらも**勧められていません**。決まりを満たすだけの `Password1!` のようなパスワードが増え、変えるたびに少しだけ変えるようになるからです。アメリカの NIST（国の標準の機関）の SP 800-63B は、次のように勧めています。

- 長さで決める（パスワードだけでログインするなら、15 文字以上を求める。64 文字以上まで受け付ける）
- よく使われるパスワード・漏れたことのあるパスワードの一覧と比べて、当てはまれば断る
- 文字の種類の組み合わせを求めない。定期的な変更を求めない（漏れたと分かったときだけ変えてもらう）
- 貼り付け（パスワード管理ソフト）を禁止しない

この教材では、長さを 12〜128 文字にします（試しやすさとの兼ね合い。本番では、NIST に合わせて 15 文字以上も考えてください）。

### 4.1 手を動かす: checkPassword

`samples/common-passwords.txt`（よく使われるパスワードの短い見本）を、章のフォルダにコピーします。

```sh
$ cp samples/common-passwords.txt .
```

`policy.ts` を作ります。

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';

// よく使われるパスワードの一覧（本物の一覧は数万〜数億件。ここでは短い見本）
const COMMON = new Set(
  readFileSync(path.join(import.meta.dirname, 'common-passwords.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== ''),
);

export const MIN_LENGTH = 12;
export const MAX_LENGTH = 128;

/** 守れていない決まりの文を返す。空の配列なら合格 */
export function checkPassword(password: string, email: string): string[] {
  // NFKC: 全角の英数字を半角にするなど、見た目が同じ文字を1つの形にそろえる
  const normalized = password.normalize('NFKC');
  // 長さは「文字の数」で数える（[...文字列] は、絵文字なども1文字として数える）
  const length = [...normalized].length;
  const errors: string[] = [];
  if (length < MIN_LENGTH) errors.push(`パスワードは ${MIN_LENGTH} 文字以上にしてください`);
  if (length > MAX_LENGTH) errors.push(`パスワードは ${MAX_LENGTH} 文字までにしてください`);
  if (COMMON.has(normalized.toLowerCase())) errors.push('よく使われるパスワードです。別のものにしてください');
  const localPart = email.split('@')[0] ?? '';
  if (localPart !== '' && normalized.toLowerCase().includes(localPart.toLowerCase())) {
    errors.push('メールアドレスを含まないパスワードにしてください');
  }
  return errors;
}
```

| 書き方 | 意味 |
| --- | --- |
| `path.join(import.meta.dirname, …)` | このファイルと同じフォルダの `common-passwords.txt`（第3部 第15章）。打ったフォルダによらず読める |
| `new Set(配列)` | 「入っているか」を `has` ですぐ調べられる入れ物 |
| `normalize('NFKC')` | 全角の `ｐａｓｓ` を半角の `pass` にする、など。そろえずに比べると、全角で打つだけで一覧の確かめをすり抜ける |
| `[...normalized].length` | 文字の数。`'🐱'.length` は 2（UTF-16 の単位の数）だが、`[...'🐱'].length` は 1 |

試す `try-policy.ts` を作ります。

```ts
import { checkPassword } from './policy.ts';

console.log(checkPassword('password1234', 'alice@example.com'));
console.log(checkPassword('ＰＡＳＳＷＯＲＤ１２３４', 'alice@example.com'));
console.log(checkPassword('alice-no-pass', 'alice@example.com'));
console.log(checkPassword('neko-to-inu-to-tori', 'alice@example.com'));
```

```sh
$ node try-policy.ts
[ 'よく使われるパスワードです。別のものにしてください' ]
[ 'よく使われるパスワードです。別のものにしてください' ]
[ 'メールアドレスを含まないパスワードにしてください' ]
[]
```

全角で打った2つ目も、NFKC でそろえたので、一覧の `password1234` と同じだと分かりました。

本物のサービスでは、漏れたことのあるパスワードの一覧（数億件）と比べます。有名なのは「Have I Been Pwned」の Pwned Passwords で、パスワードの SHA-1 の最初の5文字だけを送り、続きの一覧を受け取って手元で比べる（パスワードそのものは送らない）しくみがあります。この教材では、外のサービスは使わず、短い見本の一覧で考え方だけを確かめます。

## 5. 登録とログインの API

ここまでの部品を、Express の API にまとめます。ユーザーは、まずメモリ（`Map`）に置きます（データベースは成果物で使います）。

### 5.1 手を動かす: auth-api.ts

回数の制限（6節）で使う `limiter.ts` を、先に `samples/` からコピーしておきます（中身は6節で読みます）。

```sh
$ cp samples/limiter.ts .
```

`auth-api.ts` を作ります。

```ts
import express, { type ErrorRequestHandler } from 'express';
import { z } from 'zod';
import { createLoginLimiter } from './limiter.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { checkPassword } from './policy.ts';

type User = { id: number; email: string; passwordHash: string };

const Credentials = z.object({
  // メールアドレスは、前後の空白を除いて小文字にそろえる（Alice@Example.com と alice@example.com を同じ人にする）
  email: z.string().trim().toLowerCase().pipe(z.email()),
  // 長すぎるパスワードは、ハッシュの計算に時間がかかるので、確かめる前に断る
  password: z.string().min(1).max(256),
});

/** ユーザーがいないときにも、同じ重さの計算をするためのハッシュ（中身は何でもよい） */
const DUMMY_HASH = await hashPassword('dev-only-dummy-password');

export function createAuthApp() {
  const users = new Map<string, User>(); // メールアドレス → ユーザー
  let nextId = 1;
  const limiter = createLoginLimiter({ max: 5, windowMs: 15 * 60_000 });

  const app = express();
  app.use(express.json());

  app.post('/api/register', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const { email, password } = parsed.data;
    const errors = checkPassword(password, email);
    if (errors.length > 0) return res.status(422).json({ detail: 'パスワードが決まりに合いません', errors });
    // このままでは、だれでも「このアドレスは登録済みか」を調べられる。第53章で、メールで確かめる形に直す
    if (users.has(email)) return res.status(409).json({ detail: 'このメールアドレスは登録できません' });
    const user = { id: nextId++, email, passwordHash: await hashPassword(password) };
    users.set(email, user);
    res.status(201).json({ id: user.id, email: user.email });
  });

  app.post('/api/login', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ detail: 'email と password を送ってください' });
    const { email, password } = parsed.data;

    const limit = limiter.check(email);
    if (!limit.ok) {
      res.set('Retry-After', String(limit.retryAfter));
      return res.status(429).json({ detail: 'ログインの失敗が多すぎます。しばらくしてから、もう一度やってください' });
    }

    const user = users.get(email);
    // ユーザーがいなくても、ダミーのハッシュで同じ計算をする（応答の時間で「いるかどうか」が分からないように）
    const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
    if (user === undefined || !ok) {
      limiter.fail(email);
      // メールアドレスとパスワードの、どちらが違ったのかは言わない
      return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });
    }
    limiter.reset(email);
    res.json({ id: user.id, email: user.email });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ detail: 'サーバの中で失敗しました' });
  };
  app.use(onError);
  return app;
}

if (import.meta.main) {
  createAuthApp().listen(9617, '127.0.0.1', () => console.log('http://127.0.0.1:9617'));
}
```

| 書き方 | 意味 |
| --- | --- |
| `z.string().trim().toLowerCase().pipe(z.email())` | 空白を除いて小文字にしてから、その値がメールアドレスの形かを確かめる。`pipe` は「前のスキーマを通した値を、次のスキーマにも通す」 |
| トップレベルの `await hashPassword(…)` | ES Modules では、関数の外でも `await` を書ける（第3部 第14章）。起動のときに1回だけ計算する |
| `user?.passwordHash ?? DUMMY_HASH` | ユーザーがいれば、そのハッシュ。いなければダミー（下で説明） |
| `import.meta.main` | このファイルを `node auth-api.ts` で直接動かしたときだけ `true`（第5部 第26章）。テストから import したときは、ポートを開かない |

1つ目のターミナルで動かします。

```sh
$ node auth-api.ts
http://127.0.0.1:9617
```

2つ目のターミナルで、`curl` で試します（`-i` は応答のヘッダも表示する、`-H` はヘッダを足す、`-d` はボディを送る。第2部 第6章）。

```sh
$ cd ~/dev/part10/ch51-auth-basics
$ J='Content-Type: application/json'
$ curl -i -X POST localhost:9617/api/register -H "$J" -d '{"email":"alice@example.com","password":"password1234"}'
HTTP/1.1 422 Unprocessable Entity
…
{"detail":"パスワードが決まりに合いません","errors":["よく使われるパスワードです。別のものにしてください"]}
$ curl -i -X POST localhost:9617/api/register -H "$J" -d '{"email":" Alice@Example.com ","password":"neko-to-inu-to-tori"}'
HTTP/1.1 201 Created
…
{"id":1,"email":"alice@example.com"}
$ curl -i -X POST localhost:9617/api/login -H "$J" -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}'
HTTP/1.1 200 OK
…
{"id":1,"email":"alice@example.com"}
$ curl -i -X POST localhost:9617/api/login -H "$J" -d '{"email":"alice@example.com","password":"wrong"}'
HTTP/1.1 401 Unauthorized
…
{"detail":"メールアドレスかパスワードが違います"}
```

- `J='…'` は、長いヘッダを `J` という名前で覚えておくシェルの書き方です。`"$J"` で使います。
- `…` の所には、ほかのヘッダが表示されます。

### 5.2 どちらが違ったのかは言わない

ログインに失敗したとき、「そのメールアドレスは登録されていません」と言うと、だれでも、あるアドレスが登録されているかを調べられます（**ユーザーの列挙**）。そこで、

- 文は、どちらの場合も同じ「メールアドレスかパスワードが違います」にする
- **時間**も同じにする。ユーザーがいないときにすぐ 401 を返すと、「速く返ってきたら、いない人」と分かってしまいます。そこで、いないときも `DUMMY_HASH` で同じ重さの計算をします

試してみます。`-w '%{time_total}'` は、応答までにかかった秒数を表示するオプション、`-o /dev/null` はボディを捨てる、`-s` は進み具合を表示しないオプションです。

```sh
$ curl -s -o /dev/null -w '%{http_code} %{time_total}\n' -X POST localhost:9617/api/login -H "$J" -d '{"email":"nobody@example.com","password":"wrong"}'
401 0.046477
```

いる人のときとほぼ同じ時間（数十ミリ秒）です。`DUMMY_HASH` の行を消して試すと、ずっと速く返ることを確かめられます（試したら元に戻す）。

ただし、`/api/register` には、まだ問題が残っています。登録済みのアドレスに 409 を返すので、ここからも列挙できます（練習問題4）。第53章で、「確認のメールを送りました」と、どちらの場合も同じ応答にする形に直します。

## 6. 総当たりを遅くする

パスワードのハッシュは、漏れた表を手元で試す攻撃への備えでした。もう1つ、ログインの API に、パスワードを次々に送ってくる攻撃（**総当たり**、オンラインの攻撃）にも備えます。

### 6.1 手を動かす: 失敗を数える

さきほどコピーした `limiter.ts` を開いて読みます。

```ts
export type LimitResult = { ok: true } | { ok: false; retryAfter: number };

export function createLoginLimiter({ max = 5, windowMs = 15 * 60_000, now = Date.now } = {}) {
  /** キー（メールアドレスなど）ごとの、窓の始まりと失敗の数 */
  const failures = new Map<string, { start: number; count: number }>();

  function current(key: string) {
    const entry = failures.get(key);
    if (entry === undefined || now() - entry.start >= windowMs) return undefined; // 窓が終わっていれば、数え直し
    return entry;
  }

  return {
    /** ログインを試してよいか（パスワードを確かめる前に呼ぶ） */
    check(key: string): LimitResult {
      const entry = current(key);
      if (entry === undefined || entry.count < max) return { ok: true };
      return { ok: false, retryAfter: Math.ceil((entry.start + windowMs - now()) / 1000) };
    },
    /** 失敗したら呼ぶ */
    fail(key: string): void {
      const entry = current(key);
      if (entry === undefined) failures.set(key, { start: now(), count: 1 });
      else entry.count++;
    },
    /** 成功したら呼ぶ（数を消す） */
    reset(key: string): void {
      failures.delete(key);
    },
  };
}
```

第5部 第24章 5節の「固定の窓」と同じ考え方です。違いは、**失敗だけを数える**ことです。正しいパスワードで何回ログインしても、止まりません。

さらに4回まちがえてから（さきほどの1回と合わせて5回）、正しいパスワードで試します。`for i in 1 2 3 4; do …; done` は、`…` を4回くり返すシェルの書き方です。

```sh
$ for i in 1 2 3 4; do curl -s -o /dev/null -w '%{http_code} ' -X POST localhost:9617/api/login -H "$J" -d '{"email":"alice@example.com","password":"wrong"}'; done; echo
401 401 401 401
$ curl -i -X POST localhost:9617/api/login -H "$J" -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}'
HTTP/1.1 429 Too Many Requests
…
Retry-After: 900
…
{"detail":"ログインの失敗が多すぎます。しばらくしてから、もう一度やってください"}
```

確かめたら、1つ目のターミナルで `Ctrl+C` を押してサーバを止めます（止めると、メモリのユーザーと数も消えます）。

### 6.2 締め出しの問題と、ほかの守り方

5回で 15 分止めると、**悪意のある人が、わざと alice を締め出せます**。数え方には、それぞれ良い点と悪い点があります。

| 数え方・止め方 | 良い点 | 困る点 |
| --- | --- | --- |
| メールアドレスごとに止める（この節） | 1人を集中して狙う攻撃を止める | 本人を締め出せる |
| IP アドレスごと | 1か所からの大量の試しを止める | 同じ IP の大勢（会社・学校）が巻き込まれる。たくさんの IP を使う攻撃は止まらない |
| 失敗ごとに待つ時間を長くする（練習問題6） | 締め出さない。本人は少し待てば入れる | 遅くするだけで、止めはしない |
| 多要素認証（パスワードのほかに、スマートフォンのアプリなど） | パスワードが当たっても入れない | 作るのも使うのも手間 |

実際のサービスは、これらを組み合わせます。どれを選んでも、**正しいパスワードの人まで、いつまでも入れない**形は避けます。

もう1つの大きな脅威は、**ほかのサービスから漏れたメールアドレスとパスワードの組**を、そのまま試す攻撃（パスワードリスト攻撃）です。1つのアカウントには1〜2回しか試さないので、回数の制限では止まりません。漏れたパスワードの一覧と比べる（4節）、多要素認証を勧める、が備えになります。

## 7. 認可: してよいかを1か所で決める

認証で「alice だ」と分かった後、「alice は、このタスクを消してよいか」を決めるのが認可です。認可の漏れ（ほかの人のタスクを、番号を変えるだけで読める、など）は、OWASP Top 10（第55章）でいちばん上に挙げられている問題です。

### 7.1 手を動かす: can

`authorize.ts` を作ります。

```ts
export type Role = 'member' | 'admin';
export type User = { id: number; role: Role };
export type Task = { id: number; ownerId: number; title: string };
export type Action = 'read' | 'update' | 'delete';

/** してよければ true。決まりは、ここ1か所にまとめる（ルートごとに if を書き散らさない） */
export function can(user: User, action: Action, task: Task): boolean {
  if (task.ownerId === user.id) return true; // 自分のタスクは、何でもできる
  if (user.role === 'admin') return action !== 'delete'; // 管理者は、読む・直すまで（消すのは本人だけ）
  return false;
}

// 試す: node authorize.ts
if (import.meta.main) {
  const alice: User = { id: 1, role: 'member' };
  const bob: User = { id: 2, role: 'member' };
  const admin: User = { id: 3, role: 'admin' };
  const task: Task = { id: 10, ownerId: alice.id, title: '牛乳を買う' };
  for (const [name, user] of [['alice', alice], ['bob', bob], ['admin', admin]] as const) {
    const row = (['read', 'update', 'delete'] as const).map((a) => `${a}=${can(user, a, task)}`).join(' ');
    console.log(name.padEnd(5), row);
  }
}
```

```sh
$ node authorize.ts
alice read=true update=true delete=true
bob   read=false update=false delete=false
admin read=true update=true delete=false
```

### 7.2 見えないものは「無い」

bob が alice のタスク（`/api/tasks/10`）を開こうとしたとき、403 を返すと「10番のタスクはある」ことが分かります。番号を1つずつ変えて試せば、タスクの数や、いつ作られたかまで推測できます。そこで、

- **読めないもの**は、**404**（無いのと同じ）にする
- 読めるが、その操作はできないなら、**403** にする

成果物では、もっと手前で防ぎます。データベースから読むときに `WHERE owner_id = $1` を付けて、そもそも自分のタスクしか取り出さないようにします。「取り出した後で確かめる」より、「取り出せないようにする」ほうが、確かめ忘れが起きません。

> 番号の代わりにランダムな ID（UUID）を使うと、推測はしにくくなります。でも、それだけでは認可の代わりになりません。URL は、履歴やログ、共有した画面から漏れるからです。

## 8. Flask との対応

| この章 | Flask |
| --- | --- |
| `hashPassword`（Argon2id、PHC 文字列） | `werkzeug.security.generate_password_hash`（既定は `scrypt:32768:8:1$ソルト$ハッシュ` の形） |
| `verifyPassword`（`timingSafeEqual`） | `check_password_hash`（中で `hmac.compare_digest`） |
| `checkPassword` | 標準には無い。自分で書くか、WTForms のバリデータ |
| ダミーのハッシュで時間をそろえる | 標準には無い。自分で書く |
| `createLoginLimiter` | Flask-Limiter（`@limiter.limit("5 per 15 minutes")`） |
| `can(user, action, task)` | Flask-Principal、または自分で書いた関数。`abort(403)`・`abort(404)` |
| ログインした状態を覚える | Flask-Login + `session`（第52章で、Node.js で書く） |

## まとめ

- 認証は「だれか」、認可は「してよいか」。認証の失敗は 401、認可の失敗は 403。見せないものは 404 にする。
- パスワードは、そのまま保存しない。SHA-256 は速すぎ、ソルトが無いと同じパスワードが同じ値になる。
- Argon2id（`node:crypto` の `argon2`）で、ユーザーごとのソルトと、わざと重い計算でハッシュにする。ソルト・重さ・ハッシュは PHC 文字列にまとめて保存する。
- 確かめるときは `timingSafeEqual`。ユーザーがいなくても、ダミーのハッシュで同じ時間をかけ、同じ文を返す。
- パスワードの決まりは、長さと、よく使われる・漏れたパスワードの一覧で決める。記号の強制や定期的な変更はしない。
- 失敗を数えて、総当たりを遅くする。締め出しにならない数え方を選ぶ。
- 認可の決まりは1つの関数にまとめ、できればデータを読むときの条件にする。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- OWASP Cheat Sheet「Password Storage」: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Cheat Sheet「Authentication」: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- NIST SP 800-63B「Digital Identity Guidelines: Authentication and Lifecycle Management」: https://pages.nist.gov/800-63-4/sp800-63b.html
- RFC 9106「Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications」: https://www.rfc-editor.org/rfc/rfc9106
- Node.js Docs「crypto.argon2」: https://nodejs.org/api/crypto.html#cryptoargon2algorithm-parameters-callback
- PHC string format: https://github.com/P-H-C/phc-string-format/blob/master/phc-sf-spec.md
- RFC 9110「HTTP Semantics」15.5.2 401・15.5.4 403: https://www.rfc-editor.org/rfc/rfc9110

---

第10部の目次: [../README.md](../README.md) ／ 次の章: [第52章 セッションとトークン](../ch52-session-token/README.md)
