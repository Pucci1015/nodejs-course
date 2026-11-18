# 第53章 メール送信と本人確認

第51・52章で、パスワードでログインできるようになりました。でも、登録のときのメールアドレスが、本当にその人のものかは分かりません。パスワードを忘れた人を、助ける方法もありません。この章では、アプリからメールを送る仕組み（SMTP）を手で確かめてから、nodemailer で送り、**メールアドレスの確認**と**パスワードの再設定**を作ります。メールのリンクに入れるトークンの作り方と、「だれが登録しているか」を漏らさない応答の仕方が中心です。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第51・52章、第2部 第5章（DNS と `dig`）・第6章（`nc` で HTTP を話す）、第4部 第21章（HTML のエスケープ）、第6部 第32章（Docker と Compose。使わなくても進められる） |
| この章のゴール | メールが届くまでの流れ（SMTP、MX、SPF・DKIM・DMARC）を説明できる / SMTP を `nc` で話し、応答の番号の意味を読める / nodemailer で、開発用の受け取り口（Mailpit）にメールを送れる / 一時的な失敗とずっと続く失敗を見分けられる / メールのリンクに入れるトークンを、ハッシュ・期限・1回だけ・使い道つきで作れる / 登録の確認とパスワードの再設定を、だれが登録しているか分からない応答で作れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part10/ch53-email/` で実行します。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part10/ch53-email
>   ```
>
> - メールの受け取り口として、**Mailpit**（Docker）か、教材の **`tools/fake-smtp.ts`**（Docker 不要）のどちらかを使います（2節）。どちらも 127.0.0.1 の **1025**（SMTP）と **8025**（見る所）を使うので、同時には動かしません。この章の出力は `tools/fake-smtp.ts` で確かめたものです。
> - 5節のアプリは、ポート **9637** を使います。
> - 8節（SPF・DKIM）は、本番でメールを送るときの話です。練習では使わないので、表だけを読んでもかまいません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| nodemailer と `Mailer` の形（3節） | 成果物（登録の確認のメール）、第12部（メールの通知・送信サービス） |
| 失敗の見分けとやり直し（3.3節） | 第12部 第64章（バックグラウンドジョブの再試行） |
| メールのリンクのトークン（4節） | 成果物（`email_tokens` の表）、第54章（OAuth の `state`・`code` も同じ「1回だけ・短い期限」） |
| 列挙を防ぐ応答（5.3・6節） | 第55章（総点検）、成果物 |
| 送るのを待たせない（7節） | 第12部 第64章（キュー） |

---

## 1. メールが届くまで

アプリが alice にメールを送るとき、メールは何台かのサーバを渡っていきます。

| 順 | 役 | すること | 使う決まり・ポート |
| --- | --- | --- | --- |
| 1 | アプリ（nodemailer） | 送信サーバに、メールを渡す | SMTP（587 か 465。開発では Mailpit の 1025） |
| 2 | 送信サーバ（送信サービス、会社のメールサーバ） | 宛先のドメイン（`example.com`）の受信サーバを DNS の **MX** レコードで調べて、渡す | SMTP（25） |
| 3 | 受信サーバ（Gmail など） | 送ってきたサーバが、本当にそのドメインの代わりに送ってよいか確かめ（8節）、迷惑メールかを判断して、受信箱に入れる | |
| 4 | alice のメールソフト | 受信箱から読む | IMAP など |

**SMTP**（Simple Mail Transfer Protocol）は、HTTP と同じく、文字の行でやり取りする決まりです（第2部 第6章で HTTP を `nc` で話したのと同じように、2節で手で話します）。

開発のときに、本物のメールを送ってはいけません。テストで作った `alice@example.com` が、だれかの本物のアドレスかもしれないからです。そこで、**どこにも送らずに受け取るだけ**のサーバ（Mailpit）を手元で動かし、アプリはそこに渡します。

**Flask では**: Flask-Mail（`Mail(app)`、`mail.send(Message(...))`）が、Python 標準の `smtplib` を使って SMTP で送ります。`MAIL_SERVER`・`MAIL_PORT` を開発では手元の受け取り口に向けます。この章の nodemailer は、Flask-Mail + `smtplib` にあたります。

## 2. SMTP を手で話す

### 2.1 受け取り口を動かす

どちらか1つを動かします。

**A. Mailpit（Docker を入れてある人）**: 第10部のフォルダの `compose.yaml` に書いてあります（Docker と Compose は第6部 第32章）。

```sh
$ cd ~/dev/part10
$ docker compose up -d mailpit       # -d: 後ろで動かす
```

ブラウザで http://127.0.0.1:8025 を開くと、受け取ったメールの一覧の画面が出ます。止めるときは `docker compose down` です。

**B. `tools/fake-smtp.ts`（Docker が無い人）**: 教材に入れた、Mailpit の代わりの小さな SMTP サーバです（中身は読まなくてかまいません）。ターミナルを1つ使います。

```sh
$ cd ~/dev/part10
$ npm run mail
練習用の SMTP サーバ: 127.0.0.1:1025
受け取ったメール:   http://127.0.0.1:8025/api/messages
Ctrl+C で止めます（メールは消えます）
```

受け取ったメールは、http://127.0.0.1:8025/api/messages に JSON で出ます（画面はありません）。会話の行（`C:` が送ってきた行、`S:` が返した行）も、このターミナルに出ます。

> `tools/fake-smtp.ts` は、練習のために、宛先が `temp-fail@example.com` なら **451**、`no-such-user@example.com` なら **550** を返します（3.3節）。Mailpit には、この仕組みはありません。

### 2.2 手を動かす: `nc` でメールを1通送る

別のターミナルで、`nc`（第2部 第6章）で SMTP のサーバにつなぎ、1行ずつ打ちます。`>` の行が打つ行（`>` は打ちません）、それ以外がサーバの応答です。

```sh
$ nc 127.0.0.1 1025
220 fake-smtp ESMTP（練習用。どこへも送りません）
> EHLO mac.local
250-fake-smtp
250-8BITMIME
250-SMTPUTF8
250 SIZE 10485760
> MAIL FROM:<no-reply@example.test>
250 2.1.0 OK
> RCPT TO:<alice@example.com>
250 2.1.5 OK
> DATA
354 本文を送ってください。最後は . だけの行
> From: no-reply@example.test
> To: alice@example.com
> Subject: hello
>
> Hello, alice.
> ..dot line
> .
250 2.0.0 OK: queued
> QUIT
221 2.0.0 Bye
```

| 打つ行 | 意味 |
| --- | --- |
| `EHLO 名前` | あいさつ。サーバは、使える機能を複数行で返す |
| `MAIL FROM:<アドレス>` | 差出人（届かなかったときの知らせの宛先） |
| `RCPT TO:<アドレス>` | 宛先。何人分でも、この行を繰り返す |
| `DATA` | ここから本文。`354` の後に、ヘッダ・空行・本文を送り、`.` だけの行で終わる |
| `QUIT` | 終わり |

- `MAIL FROM`・`RCPT TO` は、郵便の**封筒**にあたります。本文の中の `From:`・`To:` ヘッダは、**便せん**に書いた宛名です。2つは別のもので、違っていても送れます。「`From:` が本物か」を受け取る側が確かめる仕組みが、8節の SPF・DKIM・DMARC です。
- 本文の中に `.` で始まる行があると、終わりの印と見分けがつきません。そこで送る側は、`.` で始まる行の頭に `.` をもう1つ足し（`..dot line`）、受け取る側は1つ取ります（**ドットの詰め物**、dot-stuffing）。
- SMTP の決まりでは、行の終わりは HTTP と同じく CRLF（`\r\n`）です。`fake-smtp.ts` は LF だけでも読みますが、本物のサーバに打つときは、Mac の `nc` では `-c` を付けると CRLF で送ります。

受け取ったメールを見ます。

```sh
$ curl -s http://127.0.0.1:8025/api/messages
[
  {
    "id": 1,
    "from": "no-reply@example.test",
    "to": [
      "alice@example.com"
    ],
    "subject": "hello",
    "text": "Hello, alice.\n.dot line",
    "html": "",
    "receivedAt": "2026-11-17T16:42:20.608Z"
  }
]
```

`..dot line` が `.dot line` に戻っています。

### 2.3 応答の番号

応答の最初の数字で、結果が分かります（HTTP のステータスに似ています）。

| 最初の数字 | 意味 | 例 |
| --- | --- | --- |
| 2 | うまくいった | `250 OK`、`221 Bye` |
| 3 | 続きを送って | `354`（本文を送って） |
| 4 | **一時的な**失敗。後でやり直せば、うまくいくかもしれない | `451`（今は受け取れない）、`421`（混んでいる） |
| 5 | **ずっと続く**失敗。やり直しても同じ | `550`（宛先が無い）、`554` |

複数行の応答は、最後の行以外は番号の後が `-`、最後の行だけが空白です（`250-fake-smtp` … `250 SIZE 10485760`）。

## 3. nodemailer で送る

### 3.1 手を動かす: 1通送る

**nodemailer** は、Node.js でメールを送るときによく使うパッケージです（第10部の `package.json` に入っています）。2.2節の会話を、代わりにしてくれます。`send-mail.ts` を作ります。

```ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false, // 最初から TLS でつなぐか（465 番のとき true）。練習用のサーバは TLS を使わない
});

const info = await transporter.sendMail({
  from: '"タスク管理" <no-reply@example.test>',
  to: 'alice@example.com',
  subject: 'ねこからのお知らせ',
  text: 'こんにちは、alice さん。\nこれはテキストの本文です。',
  html: '<p>こんにちは、<b>alice</b> さん。</p><p>これは HTML の本文です。</p>',
});

console.log('messageId:', info.messageId);
console.log('accepted:', info.accepted);
console.log('response:', info.response);
```

```sh
$ node send-mail.ts
messageId: <9e7c830d-7f82-f3c2-b840-c448f623e7b2@example.test>
accepted: [ 'alice@example.com' ]
response: 250 2.0.0 OK: queued
```

| 設定・項目 | 意味 |
| --- | --- |
| `createTransport({ host, port, secure })` | どのサーバに、どうつなぐか。本番の送信サービスでは、ここに `auth: { user, pass }` を足し、`port: 587`（つないでから STARTTLS で暗号化）か `465`（`secure: true`）にする |
| `from` | 本文の `From:` ヘッダ。`"表示名" <アドレス>` の形 |
| `text`・`html` | 両方を渡すと、両方が入ったメール（`multipart/alternative`）になる。メールソフトが、表示できるほうを選ぶ |
| `info.accepted` | サーバが受け取った宛先 |

Mailpit なら、画面に「ねこからのお知らせ」が出ます。`fake-smtp.ts` なら `curl -s http://127.0.0.1:8025/api/messages` で、件名と本文が読めます。`?full=1` を付けると、ヘッダと、送られてきたそのままの文字（`raw`）も見えます。

```sh
$ curl -s 'http://127.0.0.1:8025/api/messages?full=1'
…
      "subject": "=?UTF-8?B?44Gt44GT44GL44KJ44Gu44GK55+l44KJ44Gb?=",
…
      "content-type": "multipart/alternative; boundary=\"--_NmP-c5340fa7facdf10f-Part_1\""
…
```

SMTP は、もともと英語の文字だけを考えて作られたので、日本語の件名は `=?UTF-8?B?…?=`（UTF-8 のバイトを base64 にしたもの）、本文も base64 にして送られます。nodemailer が、この変換をしてくれます。

### 3.2 アプリから使う形: `Mailer`

アプリのあちこちで nodemailer を直接使うと、テストのときに困ります（毎回 SMTP のサーバが要る）。そこで、「送る」だけの小さな形を決めて、nodemailer はその中に隠します。`mailer.ts` を作ります。

```ts
import nodemailer from 'nodemailer';

export type Mail = { to: string; subject: string; text: string; html?: string };

/** アプリが使う形。テストでは、送らずに配列に覚えるだけの偽物に取り替える */
export type Mailer = { send(mail: Mail): Promise<void> };

export function createSmtpMailer({
  host = process.env.SMTP_HOST ?? '127.0.0.1',
  port = Number(process.env.SMTP_PORT ?? 1025),
  from = process.env.MAIL_FROM ?? '"タスク管理" <no-reply@example.test>',
} = {}): Mailer {
  const transporter = nodemailer.createTransport({ host, port, secure: false });
  return {
    async send(mail) {
      await transporter.sendMail({ from, ...mail });
    },
  };
}

/** テストと練習のための偽物: 送らずに、sent に覚えるだけ */
export function createMemoryMailer() {
  const sent: Mail[] = [];
  const mailer: Mailer = {
    async send(mail) {
      sent.push(mail);
    },
  };
  return { mailer, sent };
}
```

第7部の `TaskRepo`（メモリと PostgreSQL の実装を取り替える）と同じ考え方です。アプリは `Mailer` だけを知っていればよく、本番では送信サービスの API を呼ぶ実装に取り替えることもできます。

### 3.3 手を動かす: 送れなかったとき

`mail-errors.ts` を作ります（`fake-smtp.ts` で試します）。

```ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({ host: '127.0.0.1', port: 1025, secure: false });
const broken = nodemailer.createTransport({ host: '127.0.0.1', port: 1026, secure: false }); // だれも待っていないポート

const tries = [
  { label: '一時的な失敗（451）', transporter, to: 'temp-fail@example.com' },
  { label: 'ずっと失敗（550）', transporter, to: 'no-such-user@example.com' },
  { label: 'つながらない', transporter: broken, to: 'alice@example.com' },
];

for (const { label, transporter: t, to } of tries) {
  try {
    await t.sendMail({ from: 'no-reply@example.test', to, subject: 'テスト', text: 'テスト' });
    console.log(label, '→ 送れた');
  } catch (err) {
    // nodemailer のエラーには、code・responseCode・permanent が付く（付かないこともあるので、in で確かめる）
    if (err instanceof Error) {
      const info = {
        code: 'code' in err ? err.code : undefined,
        responseCode: 'responseCode' in err ? err.responseCode : undefined,
        permanent: 'permanent' in err ? err.permanent : undefined,
      };
      console.log(label, '→', info);
    }
  }
}
```

```sh
$ node mail-errors.ts
一時的な失敗（451） → { code: 'EENVELOPE', responseCode: 451, permanent: false }
ずっと失敗（550） → { code: 'EENVELOPE', responseCode: 550, permanent: true }
つながらない → { code: 'ESOCKET', responseCode: undefined, permanent: undefined }
```

| 項目 | 意味 |
| --- | --- |
| `code` | nodemailer のエラーの種類。`EENVELOPE`（宛先・差出人を断られた）、`ESOCKET`（つながらない）、`ETIMEDOUT`（時間切れ）、`EAUTH`（ログインの失敗）など |
| `responseCode` | サーバの応答の番号（2.3節）。応答が無ければ無い |
| `permanent` | `responseCode` が 5xx なら `true`、4xx なら `false`（執筆時点の nodemailer 10.2 以降。それより前の版には無い） |

一時的な失敗（4xx、つながらない）は、少し待ってからやり直す価値があります。ずっと続く失敗（5xx）は、やり直しても同じなので、やり直しません（練習問題6）。

> `'code' in err` は、「err に code という名前のものがあるか」を確かめる書き方で、TypeScript はその後で `err.code` を使ってよいと分かります（第7部 第36章 1節の絞り込み）。

## 4. メールのリンクに入れるトークン

確認のメールには、`http://127.0.0.1:9637/verify?token=…` のようなリンクを入れます。このリンクを開けた人は、そのメールを受け取った人、つまり、**そのアドレスを使える人**です。トークンは、そのことを証明する合言葉なので、次のように作ります。

| 決まり | なぜ |
| --- | --- |
| `randomBytes(32)`（256 ビット）のランダムな値 | 推測されない。`Math.random()` や、連番・時刻・メールアドレスから作った値は使わない |
| 保存するのは SHA-256 のハッシュだけ | データベースが漏れても、リンクを作れない。トークンは十分に長いランダムな値なので、パスワードと違い、速い SHA-256 でよい（総当たりできないため。第51章 2節） |
| 期限を付ける | 確認は 24 時間、再設定は 30 分〜1 時間など。メールは、転送・置き忘れ・後から読まれる |
| 1回だけ使える | 履歴やログに残ったリンクを、後で使われない |
| 使い道（purpose）を一緒に保存する | 確認のトークンで、パスワードを再設定できないように |

### 4.1 手を動かす: トークンを作って使う

`token.ts` を作ります。

```ts
import { createHash, randomBytes } from 'node:crypto';

export type Purpose = 'verify' | 'reset';

type TokenRecord = { userId: number; purpose: Purpose; expiresAt: number; usedAt: number | null };

/** 32 バイト（256 ビット）のランダムな値。URL に入れられる base64url にする */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** 保存用のハッシュ。トークンは十分に長いランダムな値なので、ソルトも遅いハッシュも要らない */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createTokenStore({ now = Date.now } = {}) {
  /** ハッシュ → 記録。データベースなら、hash の列に一意の索引を付けた表 */
  const records = new Map<string, TokenRecord>();
  return {
    /** トークンを作って、ハッシュだけを覚える。返したトークン（元の値）は、メールに入れて送ったら忘れる */
    issue(userId: number, purpose: Purpose, ttlMs: number): string {
      const token = newToken();
      records.set(hashToken(token), { userId, purpose, expiresAt: now() + ttlMs, usedAt: null });
      return token;
    },
    /** 使えるトークンなら、使ったことにして userId を返す。使えなければ null */
    consume(token: string, purpose: Purpose): number | null {
      const record = records.get(hashToken(token));
      if (record === undefined || record.purpose !== purpose) return null;
      if (record.usedAt !== null || record.expiresAt <= now()) return null;
      record.usedAt = now();
      return record.userId;
    },
  };
}
```

試すファイル `try-token.ts` を作ります。時計は、第51章 練習問題6 と同じく、自分で進めます。

```ts
import { createTokenStore, hashToken } from './token.ts';

let t = 0;
const store = createTokenStore({ now: () => t });

const token = store.issue(1, 'verify', 24 * 60 * 60 * 1000); // 24時間
console.log('メールに入れる値:', token);
console.log('保存する値:     ', hashToken(token));

console.log('reset として使う:', store.consume(token, 'reset'));
console.log('verify として使う:', store.consume(token, 'verify'));
console.log('もう1回使う:     ', store.consume(token, 'verify'));

const later = store.issue(2, 'reset', 30 * 60 * 1000); // 30分
t += 31 * 60 * 1000;
console.log('31分後に使う:    ', store.consume(later, 'reset'));
```

```sh
$ node try-token.ts
メールに入れる値: U0ynMyaJwD6dqwhiL43CvSyWL_phpqepaCpcAl9_HJA
保存する値:      43068a7e3ef36180c5c4cb6ead1fd604de90c7404ab1ed3e29cceb6faba736b2
reset として使う: null
verify として使う: 1
もう1回使う:      null
31分後に使う:     null
```

（トークンとハッシュは、毎回違います。）

- トークンからハッシュを求めて、`Map` を引きます。保存しているのはハッシュだけなので、`records` を全部見ても、メールに入れた値は分かりません。
- ハッシュで引くので、トークンを `===` で1文字ずつ比べることがありません。比べる時間の差（第51章 3節の `timingSafeEqual` の話）から、トークンを推測されることもありません。

## 5. 登録とメールアドレスの確認

### 5.1 手を動かす: メールの中身を作る関数

`mails.ts` を作ります。HTML の本文に値を入れるときは、第4部 第21章と同じく、エスケープします。

```ts
import type { Mail } from './mailer.ts';

/** HTML に入れる文字を、ただの文字にする（第4部 第21章） */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** 登録の確認のメール */
export function buildVerifyMail(to: string, link: string): Mail {
  return {
    to,
    subject: 'メールアドレスの確認',
    text: [
      'タスク管理への登録を受け付けました。',
      '次のリンクを開いて、メールアドレスを確認してください（24時間有効）。',
      '',
      link,
      '',
      'このメールに心当たりが無ければ、何もしなくてかまいません。',
    ].join('\n'),
    html: [
      '<p>タスク管理への登録を受け付けました。</p>',
      '<p>次のリンクを開いて、メールアドレスを確認してください（24時間有効）。</p>',
      `<p><a href="${escapeHtml(link)}">メールアドレスを確認する</a></p>`,
      '<p>このメールに心当たりが無ければ、何もしなくてかまいません。</p>',
    ].join('\n'),
  };
}
```

- 「心当たりが無ければ、何もしなくてかまいません」は、だれかが alice のアドレスを勝手に登録したときのための文です。確認しなければ、そのアカウントは使えません（5.2節）。
- リンクの `&` は、HTML の中では `&amp;` と書くのが正しい書き方です。`escapeHtml` で、そうなります。
- [samples/mails.ts](samples/mails.ts) には、5.3節で使う `buildAlreadyRegisteredMail` も入っています。コピーして使ってください。

### 5.2 手を動かす: 登録 → 確認 → ログイン

`email-app.ts` を作ります。長いので、[samples/email-app.ts](samples/email-app.ts) をコピーしてから読み進めてもかまいません（`cp samples/email-app.ts samples/password.ts .`）。要所を見ます。

**登録**（`POST /api/register`）: ユーザーを「確認がまだ」（`emailVerifiedAt: null`）で作り、確認のメールを送ります。

```ts
const passwordHash = await hashPassword(password);
const existing = users.get(email);
if (existing === undefined) {
  const user: User = { id: nextId++, email, passwordHash, emailVerifiedAt: null };
  users.set(email, user);
  sendVerifyMail(user);
} else if (existing.emailVerifiedAt === null) {
  // 確認がまだなら、新しいパスワードにして、確認のメールを送り直す
  existing.passwordHash = passwordHash;
  sendVerifyMail(existing);
} else {
  deliver(buildAlreadyRegisteredMail(email, `${baseUrl}/login`));
}
// どの場合も、同じ応答（だれが登録しているかを、応答から分からないようにする）
res.status(202).json({ detail: '確認のメールを送りました。メールのリンクを開いてください' });
```

`sendVerifyMail` は、4節のトークンを作って、リンクに入れて送ります。

```ts
function sendVerifyMail(user: User) {
  const token = tokens.issue(user.id, 'verify', DAY);
  deliver(buildVerifyMail(user.email, `${baseUrl}/verify?token=${token}`));
}
```

**確認**（`GET /verify` と `POST /verify`）: リンクを開くと、「確認する」のボタンだけのページを返します。ボタンを押すと `POST /verify` にトークンが送られ、そこで初めて確認します。

```ts
app.post('/verify', (req, res) => {
  const body: unknown = req.body;
  const token = typeof body === 'object' && body !== null && 'token' in body && typeof body.token === 'string' ? body.token : '';
  const userId = tokens.consume(token, 'verify');
  const user = [...users.values()].find((u) => u.id === userId);
  if (user === undefined) {
    return res.status(400).type('html').send(page('確認できませんでした', '<p>リンクが正しくないか、期限が切れています。もう一度登録してください。</p>'));
  }
  user.emailVerifiedAt = now();
  res.type('html').send(page('確認できました', '<p>ログインしてください。</p>'));
});
```

GET で確認しないのは、**GET は状態を変えない**決まり（第2部 第10章）を守るためです。会社のメールの安全の仕組みや、メールソフトのリンクの下見は、届いたメールのリンクを自動で開きます。GET で確認すると、本人が開く前に確認が済んでしまいます。また、ほかのサイトに `<img src="…/verify?token=…">` を置かれても、何も起きないようにできます。

**ログイン**（`POST /api/login`）: 第51章と同じですが、確認がまだの人には 403 を返します。**パスワードが合った後で**判断するのが大事です。パスワードが違うときに「確認がまだです」と返すと、その人が登録していることが分かってしまいます。

```ts
if (user === undefined || !ok) return res.status(401).json({ detail: 'メールアドレスかパスワードが違います' });
// パスワードが合った人にだけ、確認がまだであることを教える
if (user.emailVerifiedAt === null) return res.status(403).json({ detail: 'メールアドレスを確認してください' });
```

起動して、別のターミナルで試します（受け取り口も動かしておきます）。

```sh
$ node email-app.ts
http://127.0.0.1:9637
```

```sh
$ curl -s -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}' http://127.0.0.1:9637/api/register
{"detail":"確認のメールを送りました。メールのリンクを開いてください"}
$ curl -s -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}' http://127.0.0.1:9637/api/login
{"detail":"メールアドレスを確認してください"}
$ curl -s http://127.0.0.1:8025/api/messages
[
  {
    "id": 3,
    …
    "subject": "メールアドレスの確認",
    "text": "タスク管理への登録を受け付けました。\n次のリンクを開いて、メールアドレスを確認してください（24時間有効）。\n\nhttp://127.0.0.1:9637/verify?token=JoDjcIZ78Hodat9nYTs1ZTqOujRtUOfVAmWEEns1h_k\n\n…",
    …
```

メールのリンク（`http://127.0.0.1:9637/verify?token=…`）をブラウザで開いて、「確認する」を押します（Mailpit なら、画面のメールのリンクをそのまま押せます）。`curl` で同じことをするなら、トークンの部分を自分のものに変えて、こう打ちます（`-d` だけだと、`application/x-www-form-urlencoded` の POST になります）。

```sh
$ curl -s -d 'token=JoDjcIZ78Hodat9nYTs1ZTqOujRtUOfVAmWEEns1h_k' http://127.0.0.1:9637/verify
<!doctype html><html lang="ja"><meta charset="utf-8"><title>確認できました</title><h1>確認できました</h1><p>ログインしてください。</p></html>
$ curl -s -d 'token=JoDjcIZ78Hodat9nYTs1ZTqOujRtUOfVAmWEEns1h_k' http://127.0.0.1:9637/verify
<!doctype html>…<h1>確認できませんでした</h1><p>リンクが正しくないか、期限が切れています。もう一度登録してください。</p></html>
$ curl -s -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"neko-to-inu-to-tori"}' http://127.0.0.1:9637/api/login
{"id":1,"email":"alice@example.com"}
```

2回目の確認は、トークンを使い終わっているので失敗しました。

### 5.3 だれが登録しているかを漏らさない

登録の API が「このメールアドレスは登録済みです」（409）と返すと、だれでも、あるアドレスがこのアプリを使っているかを調べられます（**ユーザーの列挙**。第51章 5節）。出会い系や病院の予約のアプリなら、それだけで困る人がいます。

そこで、登録済みのアドレスでも、同じ 202 と同じ文を返し、本当のことは**メールで本人にだけ**伝えます。

```sh
$ curl -s -H 'content-type: application/json' \
    -d '{"email":"alice@example.com","password":"another-password-1"}' http://127.0.0.1:9637/api/register
{"detail":"確認のメールを送りました。メールのリンクを開いてください"}
$ curl -s http://127.0.0.1:8025/api/messages
[
  {
    "id": 4,
    …
    "subject": "登録済みのメールアドレスです",
    "text": "このメールアドレスは、すでに登録されています。\nログインはこちら: http://127.0.0.1:9637/login\nパスワードを忘れたときは、ログインの画面から再設定できます。\n\n…",
```

（`/login` のページは、成果物の画面で作ります。）

応答の**時間**にも気を付けます。新しい人のときだけパスワードのハッシュを計算すると（第51章で約 50ms）、登録済みのアドレスは速く返り、時間で分かってしまいます。`email-app.ts` では、どの場合もハッシュを計算してから分かれています。メールを送る時間も同じ問題があるので、7節で扱います。

## 6. パスワードの再設定

パスワードを忘れた人は、メールのリンクで本人だと示して、新しいパスワードを決めます。流れと、それぞれの決まりです。

| 順 | API | すること | 決まり |
| --- | --- | --- | --- |
| 1 | `POST /api/password/forgot` `{ email }` | 登録していれば、再設定のリンクをメールで送る | いてもいなくても、同じ 202。同じアドレスへは1分に1通まで（メールで相手を困らせる使い方を防ぐ） |
| 2 | （メールのリンク） | 新しいパスワードを打つ画面を開く | トークンの期限は短く（30分など）、使い道は `reset` |
| 3 | `POST /api/password/reset` `{ token, newPassword }` | トークンを使って、パスワードのハッシュを書き換える | 1回だけ。新しいパスワードも第51章の決まりで確かめる。ほかの端末のセッションを消す（第52章 8節） |

- 再設定のリンクを開けた人は、そのアドレスを使える人です。確認がまだの人なら、確認できたことにしてかまいません。
- 再設定しても、「いま使っているパスワード」が分からないことは変わりません。メールで今のパスワードを送る、という作りは、パスワードをハッシュにして保存していれば、そもそもできません（第51章 3節）。
- 再設定が済んだら、「パスワードが変わりました」というメールを送ると、本人が知らない変更にすぐ気付けます。

練習問題8で、本文の `email-app.ts` に、この2つの API を足します。

## 7. 送るのを待たせない

`email-app.ts` の `deliver` は、`mailer.send(…)` を `await` していません。

```ts
/** メールを送る。応答は待たせない（7節）。失敗はログに残す */
function deliver(mail: Mail) {
  mailer.send(mail).catch((err: unknown) => console.error('メールを送れませんでした', mail.to, err));
}
```

| `await` したとき | 困ること |
| --- | --- |
| 送信サーバが遅いと、登録の応答も遅い | 使う人が待たされる |
| 送るときだけ時間がかかる | 5.3節と同じく、「メールを送った（登録している）か」が時間で分かる |
| 送信サーバが落ちていると、登録が 500 になる | ユーザーは作られたのに、エラーに見える |

ただし、`await` しないだけでは、プロセスが止まると送る前のメールが消えますし、失敗してもやり直しません。本番では、送る仕事を**キュー**（データベースの表や Redis）に入れて、別のプロセス（ワーカー）が、やり直しも含めて送ります（第12部 第64章）。練習問題7では、その手前の「プロセスの中の列」を作ります。

> `.catch(…)` を付け忘れると、送れなかったときに unhandled rejection になり、Node.js はプロセスを止めます（第3部 第12章）。`await` しない Promise には、必ず `.catch` を付けます。ESLint の `no-floating-promises`（第7部 第37章）が、付け忘れを教えてくれます。

## 8. 届くメールにする（本番の話）

ここまでは、手元の受け取り口に渡すだけでした。本番で Gmail などに届けるには、受信サーバに「迷惑メールではない」と判断してもらう必要があります。`From: no-reply@example.test` は、だれでも書けるからです。

| 仕組み | DNS に書くもの | 受信サーバが確かめること |
| --- | --- | --- |
| **SPF** | `example.com` の TXT レコード: `v=spf1 include:送信サービスのドメイン -all` | 送ってきたサーバの IP アドレスが、そのドメインのメールを送ってよい一覧に入っているか（封筒の差出人のドメインで見る） |
| **DKIM** | `セレクタ._domainkey.example.com` の TXT レコード: 公開鍵 | メールに付いた署名（送信サーバが秘密鍵で付ける）が、その公開鍵で確かめられるか。途中で書き換えられていないか（第2部 第8章の署名と同じ） |
| **DMARC** | `_dmarc.example.com` の TXT レコード: `v=DMARC1; p=quarantine; rua=mailto:…` | SPF か DKIM が通り、そのドメインが `From:` のドメインと合っているか。合わなければどうするか（`none`・`quarantine` 迷惑メールへ・`reject` 断る） |

調べるときは、`dig`（第2部 第5章）で TXT レコードを見ます。次は、説明のための**出力例**です（`example.com` のような説明用のドメインには、実際にはこのレコードはありません）。

```sh
$ dig +short TXT example.com
"v=spf1 include:_spf.mail-service.example -all"
$ dig +short TXT _dmarc.example.com
"v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

自分でメールサーバを動かすのは大変なので、ふつうは**メール送信サービス**（Amazon SES、SendGrid、Postmark、Resend など。執筆時点の例です）を使います。サービスの説明に従って DNS に SPF・DKIM を書き、nodemailer の `createTransport` に、サービスの SMTP のホストと、`auth: { user, pass }` を渡します（パスワードや API キーは環境変数で。第12部 第60章）。Gmail などの大きな受信サービスは、執筆時点では、たくさん送る送信者に SPF・DKIM・DMARC のすべてを求めています。必ず、使うサービスの最新の説明を確かめてください。

## 9. Next.js では

| この章 | Next.js |
| --- | --- |
| `createSmtpMailer`・`Mailer` | 同じものを `lib/mailer.ts` に置き、1行目で `import 'server-only'`（第9部 第48章）。ブラウザに送られるコードに、SMTP の設定が入らないように |
| `POST /api/register`・`/api/password/forgot` | Server Action（フォームから）か Route Handler。応答は同じ形にする |
| `GET /verify` → ボタン → `POST /verify` | `app/verify/page.tsx`（`searchParams` からトークンを読み、フォームに入れる）と、確認する Server Action |
| `deliver`（待たない） | `after()`（`next/server`。応答を返した後に動かす）が使える。でも、プロセスが止まれば消えるのは同じ |

## 10. Flask との対応

| この章 | Flask |
| --- | --- |
| nodemailer の `createTransport`・`sendMail` | Flask-Mail の `Mail(app)`・`mail.send(Message(...))`（中は `smtplib`） |
| Mailpit・`fake-smtp.ts` | 同じ Mailpit を使える。`MAIL_SERVER='127.0.0.1'`・`MAIL_PORT=1025` |
| `Mailer` と `createMemoryMailer` | Flask-Mail の `MAIL_SUPPRESS_SEND`・`mail.record_messages()`（テストで送らずに記録する） |
| `token.ts`（ランダムな値のハッシュを保存） | itsdangerous の `URLSafeTimedSerializer`（中身に署名し、保存しない。第52章の JWT に近い）。1回だけにするには、自分で記録する必要がある |
| `GET /verify` はボタンだけ | 同じ考え方で書く |
| `deliver` とキュー | Celery・RQ（第12部） |

## まとめ

- メールは、アプリ → 送信サーバ → 受信サーバと SMTP で渡っていく。開発では、どこにも送らない受け取り口（Mailpit）に渡す。
- SMTP は文字の行の会話。応答の番号の 4xx は一時的、5xx はずっと続く失敗。nodemailer のエラーの `responseCode`・`permanent`・`code` で見分ける。
- アプリは `Mailer` の形だけを知り、nodemailer は中に隠す。テストでは偽物に取り替える。
- メールのリンクのトークンは、ランダムな 32 バイト、ハッシュで保存、期限つき、1回だけ、使い道つき。
- 確認は GET ではなくボタンの POST で。ログインで「確認がまだ」と教えるのは、パスワードが合った後だけ。
- 登録とパスワードの再設定は、登録しているかどうかに関係なく、同じ応答・同じ時間で返し、本当のことはメールで本人にだけ伝える。
- メールを送るのを応答で待たない。本番ではキューで送り、SPF・DKIM・DMARC を設定した送信サービスを使う。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- RFC 5321「Simple Mail Transfer Protocol」: https://www.rfc-editor.org/rfc/rfc5321
- RFC 7208「Sender Policy Framework (SPF)」: https://www.rfc-editor.org/rfc/rfc7208
- RFC 6376「DomainKeys Identified Mail (DKIM) Signatures」: https://www.rfc-editor.org/rfc/rfc6376
- RFC 7489「DMARC」: https://www.rfc-editor.org/rfc/rfc7489
- Nodemailer: https://nodemailer.com/
- Mailpit: https://mailpit.axllent.org/
- OWASP Cheat Sheet「Forgot Password」: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- OWASP Cheat Sheet「Authentication」（ユーザーの列挙）: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Google「メール送信者のガイドライン」: https://support.google.com/a/answer/81126

---

前の章: [第52章 セッションとトークン](../ch52-session-token/README.md) ／ 第10部の目次: [../README.md](../README.md) ／ 次の章: [第54章 OAuth 2.0 と OpenID Connect](../ch54-oauth-oidc/README.md)
