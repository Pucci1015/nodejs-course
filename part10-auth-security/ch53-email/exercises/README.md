# 第53章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part10/ch53-email/exercises/` で行います。最初に `cd exercises` で移動してください。問題4の (1) 以外は、メールの受け取り口（Mailpit・`npm run mail`）は要りません。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 再設定のメールを作る | [reset-mail.ts](reset-mail.ts)、[reset-mail.test.ts](reset-mail.test.ts) | 5.1 |
| 2 | 基本 | DATA の後に送る文字列 | [smtp-data.ts](smtp-data.ts)、[smtp-data.test.ts](smtp-data.test.ts) | 2.2 |
| 3 | 基本 | SMTP の応答を読む | [smtp-reply.ts](smtp-reply.ts)、[smtp-reply.test.ts](smtp-reply.test.ts) | 2.3 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 2〜6 |
| 5 | 応用 | トークンの保存場所を広げる | [token-store.ts](token-store.ts)、[token-store.test.ts](token-store.test.ts) | 4 |
| 6 | 応用 | 一時的な失敗だけやり直す | [retry.ts](retry.ts)、[retry.test.ts](retry.test.ts) | 3.3 |
| 7 | 応用 | メールを後ろで送る列 | [mail-queue.ts](mail-queue.ts)、[mail-queue.test.ts](mail-queue.test.ts) | 7 |
| 8 | 発展 | パスワードの再設定の API | [reset-app.ts](reset-app.ts)、[reset-app.test.ts](reset-app.test.ts) | 5・6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第51章と同じです。問題4以外は、`○○.ts` の `// ここを書く` の所を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。最初は、「型: tsc のエラーが無い」以外のテストが失敗します（問題8だけは、本文と同じ前半のテストも通ります）。

- 模範解答で試すには `MODULE=../solutions/reset-mail.ts node --test reset-mail.test.ts` のように、`MODULE` に模範解答のファイルを指定します。
- [mailer.ts](mailer.ts)・[mails.ts](mails.ts)・[token.ts](token.ts) は本文のサンプルの、[password.ts](password.ts) は第51章のコピーです。書き換えなくてかまいません。
- [typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です。

---

## 基本

### 問題1 再設定のメールを作る

[reset-mail.ts](reset-mail.ts) に、`buildResetMail(to, link, minutes)` を書いてください。本文5.1節の `buildVerifyMail` を、パスワードの再設定のために変えたものです。

- 件名は `パスワードの再設定`
- `text`: リンクだけの行がある。`○分`（`minutes` の数）と、`心当たりが無ければ` という言葉が入る
- `html`: リンクは `<a href="…">` に入れ、`escapeHtml` を通す（`&` が `&amp;` になる）。`○分` も入れる
- `link` の `new URL(link).protocol` が `http:` か `https:` でなければ、例外を投げる（第4部 第21章の `safeUrl` と同じ考え方。メールのリンクに `javascript:` などを入れない）

```sh
$ node --test reset-mail.test.ts
```

### 問題2 DATA の後に送る文字列

[smtp-data.ts](smtp-data.ts) に、`toSmtpData(message)` を書いてください。2.2節で `DATA` の後に打った文字列を作る関数です。

- 改行を、すべて CRLF（`\r\n`）にそろえる（`\r\n`・`\r`・`\n` のどれで来ても）
- `.` で始まる行は、頭に `.` をもう1つ足す（ドットの詰め物）
- 最後に `.` だけの行（`.\r\n`）を足す
- `message` が改行で終わっていても、空の行を足さない（`'Hello\n'` → `'Hello\r\n.\r\n'`）。空の `message` は `'.\r\n'`

```sh
$ node --test smtp-data.test.ts
```

ヒント: `message.split(/\r\n|\r|\n/)` で行に分けられます（`|` は「または」。`\r\n` を先に書くのが大事です）。最後の要素が `''` なら除きます。

### 問題3 SMTP の応答を読む

[smtp-reply.ts](smtp-reply.ts) に、`parseReply(text)` を書いてください。サーバの応答（1行か複数行。行は `\r\n` で区切られ、最後にも `\r\n` があることが多い）を読んで、`{ code, kind, lines }` を返します。

| 項目 | 値 |
| --- | --- |
| `code` | 3桁の番号（数） |
| `kind` | 最初の数字が 2 なら `'ok'`、3 なら `'intermediate'`、4 なら `'temporary'`、5 なら `'permanent'` |
| `lines` | 各行の、番号と区切りの後の文。`250` だけの行は `''` |

次のどれかなら `null` を返します。

- 空、または `2`〜`5` で始まる3桁の数字で始まらない行がある
- 番号の後が `-` か空白でない（`250` だけの行は許す）
- 行によって番号が違う
- 最後の行以外に空白の区切りがある、または最後の行が `-` の区切り（2.3節）

```sh
$ node --test smtp-reply.test.ts
```

ヒント: 1行は `/^([2-5][0-9]{2})(?:([- ])(.*))?$/` で読めます。`(?:…)?` は「この部分は、あっても無くてもよい」、`[- ]` は「`-` か空白」です。`for (const [i, row] of rows.entries())` で、何行目かも分かります。

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。

---

## 応用

### 問題5 トークンの保存場所を広げる

[token-store.ts](token-store.ts) に、本文4.1節の `createTokenStore` を広げたものを書いてください。`issue` と `consume` は本文と同じ動きで、次を足します。

| 足すもの | すること |
| --- | --- |
| `issue` の変更 | 同じ人・同じ使い道の古いトークンは、使えなくする（再設定のメールを2回頼んだら、新しいほうだけが効く） |
| `check(token, purpose)` | 使えるトークンなら userId、そうでなければ `null`。`consume` と違い、使ったことにはしない（新しいパスワードを打つ画面を出すとき、リンクがまだ使えるか確かめる） |
| `revokeAll(userId)` | その人のトークンを、使い道に関係なくすべて使えなくする |
| `purge()` | 期限が切れたもの・使い終わったものを消して、消した数を返す |
| `size()` | 覚えている数 |

```sh
$ node --test token-store.test.ts
```

ヒント: `for (const [hash, record] of records)` で `Map` を回しながら、`records.delete(hash)` で消してかまいません。`consume` と `check` で同じ判断をするので、「使える記録を返す」小さな関数を作ると重ならずに書けます。

### 問題6 一時的な失敗だけやり直す

[retry.ts](retry.ts) に、2つの関数を書いてください（本文3.3節）。

`isTransient(err)`: やり直せば届くかもしれない失敗なら `true`。

1. `err` に `permanent`（真偽値）があれば、`!permanent`
2. 無くて、`responseCode`（数）があれば、400 以上 500 未満なら `true`
3. どちらも無ければ、`code` が `ESOCKET`・`ETIMEDOUT`・`ECONNECTION` のどれかなら `true`
4. それ以外（`Error` でない値も）は `false`

`sendWithRetry(send, mail, { retries, baseDelayMs, sleep })`: `send(mail)` を呼び、送れたら「何回目で送れたか」を返す。

- 失敗して、`isTransient` が `true` で、まだ `retries` 回（既定 3）やり直していなければ、`sleep(baseDelayMs × 2^(やり直した回数))` を待ってからやり直す（既定 1000ms なので 1秒、2秒、4秒）
- そうでなければ、そのエラーをそのまま投げる
- `sleep` は「ミリ秒を受け取って、その後に解決する Promise を返す関数」。テストでは、本当に待たない偽物を渡します

```sh
$ node --test retry.test.ts
```

### 問題7 メールを後ろで送る列

[mail-queue.ts](mail-queue.ts) に、`createMailQueue(send, { onError })` を書いてください。本文7節の `deliver` を、「1通ずつ順に送る列」にしたものです。

| 返すもの | すること |
| --- | --- |
| `enqueue(mail)` | 列に足して、**すぐ戻る**（送り終わるのを待たない）。何も送っていなければ、送り始める |
| `pending()` | まだ送り始めていない数（送っている途中の1通は数えない） |
| `idle()` | 列が空になり、送っている途中のものも終わったら解決する Promise。何もしていなければ、すぐ解決する |

- 同時に送るのは1通だけ。入れた順に送る。送っている間に `enqueue` されたものも、続けて送る
- `send` が失敗したら、`onError(mail, err)` を呼んで、次のメールに進む（列を止めない）

```sh
$ node --test mail-queue.test.ts
```

ヒント: 「送っている途中か」を `let running = false` で覚え、列を空になるまで回す `async function run()` を作ります。`enqueue` の中では `await` せずに `void run()` と呼びます。`idle()` を待っている人の `resolve` を配列に覚えておき、`run` が終わったら、まとめて呼びます。

---

## 発展

### 問題8 パスワードの再設定の API

[reset-app.ts](reset-app.ts) は、本文5.2節の `email-app.ts` と同じ前半（登録・確認・ログイン）を持つ `createResetApp` です。最後の `// ここを書く` に、本文6節の2つの API を足してください。

`POST /api/password/forgot`（`{ email }`）:

- `email` が文字列でなければ 400。前後の空白を除いて小文字にそろえる
- 登録していれば（確認がまだでも）、`tokens.issue(user.id, 'reset', 30分)` でトークンを作り、`${baseUrl}/reset?token=…` のリンクを本文（`text`）に入れたメールを `deliver` で送る（件名・文は自由。問題1の `buildResetMail` を import して使ってもよい）
- 同じアドレスへは、前に送ってから 60 秒たつまで送らない（時刻は `now()` で）
- いつでも 202 と `{ "detail": "登録されていれば、再設定のメールを送りました" }`（いない人・送らなかったときも同じ）

`POST /api/password/reset`（`{ token, newPassword }`）:

- `token` が文字列でない、`newPassword` が 12〜128 文字の文字列でなければ 400（このとき、トークンは使ったことにしない）
- `tokens.consume(token, 'reset')` が `null` なら、400 と `{ "detail": "リンクが正しくないか、期限が切れています" }`
- 使えたら、新しいパスワードのハッシュを保存し、確認がまだなら `emailVerifiedAt` を今の時刻にして、204

```sh
$ node --test reset-app.test.ts
```

ヒント: 新しいパスワードのハッシュ（`await hashPassword(…)`）は、`consume` の**前**に計算します。`consume` の後に `await` を挟むと、その間に同じトークンの別のリクエストが来たときの順番を考える必要が出てくるからです。リンクの先の画面（`/reset`）は、成果物で作ります。
