# 第51章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part10/ch51-auth-basics/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | メールアドレスをそろえる | [email.ts](email.ts)、[email.test.ts](email.test.ts) | 5 |
| 2 | 基本 | PHC 文字列を作る・読む | [phc.ts](phc.ts)、[phc.test.ts](phc.test.ts) | 3 |
| 3 | 基本 | パスワードの決まりを設定できる形に | [policy.ts](policy.ts)、[policy.test.ts](policy.test.ts) | 4 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 2〜7 |
| 5 | 応用 | 古いハッシュを作り直す | [rehash.ts](rehash.ts)、[rehash.test.ts](rehash.test.ts) | 3 |
| 6 | 応用 | 失敗が続くほど待たせる | [backoff.ts](backoff.ts)、[backoff.test.ts](backoff.test.ts) | 6 |
| 7 | 応用 | 共有されたタスクの認可 | [authorize.ts](authorize.ts)、[authorize.test.ts](authorize.test.ts) | 7 |
| 8 | 発展 | パスワードを変える API | [app.ts](app.ts)、[app.test.ts](app.test.ts) | 5 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第7部と同じです。問題4以外は、`○○.ts` の `// ここを書く` の所を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。最初は、「型: tsc のエラーが無い」以外のテストが失敗します。

```sh
$ node --test email.test.ts
```

- 書きかけの関数は `throw new Error('まだ書いていません…')` になっています。書くときに、この行を消してください。`void z;` のような行は「まだ使っていない import を、tsc と ESLint に注意させないため」の行なので、書き終えたら消してかまいません。
- 模範解答で試すには `MODULE=../solutions/email.ts node --test email.test.ts` のように、`MODULE` に模範解答のファイルを指定します。
- このフォルダの [password.ts](password.ts)・[policy-sample.ts](policy-sample.ts)・[common-passwords.txt](common-passwords.txt) は、本文の samples のコピーです。問題5・8で使います。書き換えなくてかまいません。
- [typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です（第7部と同じ）。

---

## 基本

### 問題1 メールアドレスをそろえる

[email.ts](email.ts) に、`normalizeEmail(input)` を書いてください（本文5節の `Credentials` の `email`）。

- 前後の空白を除いて、小文字にそろえた文字列を返す
- メールアドレスの形でない（`z.email()` が通さない）なら `null`
- そろえた後の長さが 254 文字より長いなら `null`（メールアドレスの長さの上限）
- 文字列でない値（数・`undefined`・配列）なら `null`。引数の型が `unknown` なのは、リクエストのボディから来た値をそのまま渡すためです

```sh
$ node --test email.test.ts
```

ヒント: `z.string().trim().toLowerCase()` の後に `.max(254)` と `.pipe(z.email())` をつなぎ、`safeParse` します。

### 問題2 PHC 文字列を作る・読む

[phc.ts](phc.ts) に、2つの関数を書いてください（本文3節）。

| 関数 | すること |
| --- | --- |
| `formatPhc(params, salt, hash)` | `$argon2id$v=19$m=19456,t=2,p=1$<ソルト>$<ハッシュ>` の文字列を作る。ソルトとハッシュは base64 で、最後の `=` を付けない |
| `parsePhc(text)` | `formatPhc` の逆。`{ m, t, p, salt, hash }`（salt・hash は Buffer）を返す。次のどれかなら `null`: 種類が `argon2id` でない、版が `v=19` でない、`m=数,t=数,p=数` の形でない、`$` で区切った数が違う、ソルトやハッシュに base64 でない文字がある |

```sh
$ node --test phc.test.ts
```

ヒント: `text.split('$')` は、最初の `$` の前の空の文字列も含めて、6つに分かれます。base64 の文字は `A-Z`・`a-z`・`0-9`・`+`・`/` です。

### 問題3 パスワードの決まりを設定できる形に

[policy.ts](policy.ts) に、`checkPassword(password, email, policy)` を書いてください（本文4節の `policy.ts` を、決まりを引数で受け取る形にしたもの）。

- `policy` は `{ min, max, common }`。`common` は、よく使われるパスワード（小文字）の `Set`
- 守れていない決まりを、次の順に配列で返す。全部守れていれば `[]`
  - `'too_short'`: 文字の数が `min` より少ない
  - `'too_long'`: 文字の数が `max` より多い
  - `'common'`: NFKC にそろえて小文字にしたものが `common` に入っている
  - `'contains_email'`: メールアドレスの `@` の前の部分（3文字以上のときだけ）を、大文字と小文字を区別せずに含む
- 文字の数は、NFKC にそろえてから `[...文字列].length` で数える（絵文字は1文字）

```sh
$ node --test policy.test.ts
```

本文の `policy.ts` は文（「12 文字以上にしてください」など）を返しました。ここでは、文の代わりに決まった名前（コード）を返します。文は、画面を作る側が、言葉に合わせて選べます。

### 問題4 考えて答える（調べる問題）

[predict.md](predict.md) の6つの問いに答えてください。サンプルを動かして確かめてかまいません。

---

## 応用

### 問題5 古いハッシュを作り直す

パスワードのハッシュの重さ（`m`・`t`）は、コンピュータが速くなるにつれて、上げていきます。でも、保存してあるハッシュは、元のパスワードが分からないので、作り直せません。そこで、**ログインに成功したとき**（パスワードが手元にある、ただ1つの時）に作り直します。

[rehash.ts](rehash.ts) に、2つの関数を書いてください。

| 関数 | すること |
| --- | --- |
| `needsRehash(stored, current = PARAMS)` | 保存してある PHC 文字列の `m` か `t` が `current` より小さい、または `p` が違うなら `true`。今より重いものは `false`。PHC 文字列として読めなければ `true` |
| `verifyAndUpgrade(stored, password)` | `verifyPassword` で確かめる。違えば `{ ok: false, newHash: null }`。合っていて `needsRehash` なら `{ ok: true, newHash: 新しいハッシュ }`、要らなければ `{ ok: true, newHash: null }` |

```sh
$ node --test rehash.test.ts
```

### 問題6 失敗が続くほど待たせる

本文6節の `createLoginLimiter` は、5回失敗すると、15分間すべて断りました。これでは、ほかの人が alice をわざと締め出せます（問題4の(5)）。ここでは、締め出す代わりに、**失敗が続くほど、次に試せるまでの時間を長くする**形を作ります。

[backoff.ts](backoff.ts) の `createBackoff({ free, baseSeconds, maxSeconds, now })` を書いてください。返すオブジェクトは3つの関数を持ちます。

| 関数 | すること |
| --- | --- |
| `fail(key)` | 続けて失敗した数を1つ増やし、次に試してよい時刻を決める。失敗が `free` 回（既定 3）までは待たない。その後は `baseSeconds × 2^(失敗の数 − free − 1)` 秒（既定では 1, 2, 4, 8 … 秒）。ただし `maxSeconds`（既定 300）より長くしない |
| `wait(key)` | 次に試してよい時刻まで、あと何秒か（切り上げ）。過ぎていれば `0`。一度も失敗していないキーも `0` |
| `succeed(key)` | そのキーの数を消す |

- 今の時刻は `Date.now()` ではなく、引数の `now()` で読みます（テストが時計を進めるため。第5部 第24章 5節と同じ）

```sh
$ node --test backoff.test.ts
```

### 問題7 共有されたタスクの認可

本文7節の `can` に、「共有」と「締め」を足します。[authorize.ts](authorize.ts) に、2つの関数を書いてください。

`Task` は `{ id, ownerId, sharedWith, locked }` です。`sharedWith` は、共有された人の id の配列です。

| 操作 | してよい人 |
| --- | --- |
| `read` | 持ち主、共有された人、管理者（`role: 'admin'`） |
| `update` | 持ち主と共有された人。ただし `locked` なら、だれも直せない |
| `delete`・`share` | 持ち主だけ |

`statusFor(user, action, task)` は、`task` が `undefined`（無い）か、その人が読めないなら `404`、読めるがその操作はできないなら `403`、できるなら `200` を返します。

```sh
$ node --test authorize.test.ts
```

---

## 発展

### 問題8 パスワードを変える API

本文5節の `auth-api.ts` を元に、[app.ts](app.ts) の `createAuthApp()` に3つのルートを書いてください。回数の制限（`limiter.ts`）は使わなくてかまいません。

| ルート | ボディ | 応答 |
| --- | --- | --- |
| `POST /api/register` | `{ email, password }` | 201 `{ id, email }`。形が違えば 400、決まり（`policy-sample.ts` の `checkPassword`）に合わなければ 422、登録済みなら 409 |
| `POST /api/login` | `{ email, password }` | 200 `{ id, email }`。違えば 401（いない人でも、同じ文） |
| `POST /api/password` | `{ email, currentPassword, newPassword }` | 204（ボディ無し）。形が違えば 400、今のパスワードが違えば 401、新しいパスワードが決まりに合わない・今と同じなら 422 |

- メールアドレスは、本文と同じく、前後の空白を除いて小文字にそろえます
- ユーザーがいないときも、ダミーのハッシュで同じ計算をします（本文5節）
- id は 1 から順に付けます。ユーザーはメモリ（`Map`）に置きます

```sh
$ node --test app.test.ts
```

パスワードの変更で「今のパスワード」を聞くのは、だれかが alice の開いたままの画面を使っても、パスワードを変えられないようにするためです。第52章でセッションを足すと、メールアドレスはボディではなく、ログインしている人から分かるようになります。
