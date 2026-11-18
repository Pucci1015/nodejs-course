# 第53章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=../solutions/○○.ts node --test ○○.test.ts` と打つと、テストで確かめられます。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [reset-mail.ts](reset-mail.ts) |
| 2 | [smtp-data.ts](smtp-data.ts) |
| 3 | [smtp-reply.ts](smtp-reply.ts) |
| 4 | このファイルの問題4 |
| 5 | [token-store.ts](token-store.ts) |
| 6 | [retry.ts](retry.ts) |
| 7 | [mail-queue.ts](mail-queue.ts) |
| 8 | [reset-app.ts](reset-app.ts) |

解答は、`../exercises/` の `mailer.ts`・`mails.ts`・`password.ts`・`token.ts` を import しています。

---

## 問題1 再設定のメールを作る

```ts
export function buildResetMail(to: string, link: string, minutes: number): Mail {
  const protocol = new URL(link).protocol;
  if (protocol !== 'https:' && protocol !== 'http:') throw new Error('リンクは http か https にしてください');
  return {
    to,
    subject: 'パスワードの再設定',
    text: [ /* …リンクだけの行・${minutes}分・心当たりが無ければ… */ ].join('\n'),
    html: [ /* …<a href="${escapeHtml(link)}">… */ ].join('\n'),
  };
}
```

- `new URL('javascript:void(0)').protocol` は `'javascript:'` です。URL として読めない文字列なら、`new URL` 自身が例外を投げるので、それも断れます。
- テキストの本文では、リンクを1行に単独で置きます。前後に文字をつなげると、メールソフトによっては、つながった文字までリンクだと思われます。
- 「パスワードは変わりません」と書いておくと、心当たりの無い人が安心できます。

## 問題2 DATA の後に送る文字列

```ts
export function toSmtpData(message: string): string {
  const lines = message.split(/\r\n|\r|\n/);
  if (lines.at(-1) === '') lines.pop();
  const stuffed = lines.map((line) => (line.startsWith('.') ? `.${line}` : line));
  return `${stuffed.map((line) => `${line}\r\n`).join('')}.\r\n`;
}
```

- `/\n|\r\n|\r/` の順に書くと、`\r\n` の `\r` と `\n` が別々の区切りになり、間に空の行ができます。正規表現の `|` は、左から試すからです。
- 空の `message` は `[''] → []` になり、`.\r\n` だけが残ります。
- nodemailer も、中で同じことをしています。自分で SMTP を話すプログラムを書く機会はほとんどありませんが、「本文の `.` の行」は、メールのテンプレートに `.` で始まる行を書いたときに、受け取る側で1文字消える原因として出会うことがあります（送る側が詰め物をし忘れた場合）。

## 問題3 SMTP の応答を読む

[smtp-reply.ts](smtp-reply.ts) を見てください。

- `/^([2-5][0-9]{2})(?:([- ])(.*))?$/` は、3桁の番号、区切り（`-` か空白）、残りの文、の3つを取り出します。区切りと文はまとめて省けるので、`250` だけの行も読めます。
- `(sep === '-') === last` は、「`-` なのに最後の行」か「空白なのに最後でない行」のどちらかで `true` になります。真偽値どうしを `===` で比べる書き方です。
- 分割代入の既定値（`[, rowCode = '', sep = ' ', rest = '']`）は、`noUncheckedIndexedAccess`（第7部）で `string | undefined` になる要素を、`string` にするためです。区切りが無い行（`250`）では、`sep` は `undefined` なので、既定値の空白（最後の行の扱い）になります。

## 問題4 考えて答える

**(1)** メールは、封筒の `RCPT TO` の **alice** に届きます。`To:` の欄には、便せんに書いた **bob@example.com** と出ます。`fake-smtp.ts` では、`to` が `["alice@example.com"]`、`headers.to` が `"bob@example.com"` です。メールの BCC は、この仕組みを使っています（封筒にはあるが、便せんには書かない宛先）。

**(2)** 漏れたトークンで、期限の間なら、だれのアドレスの確認も、だれのパスワードの再設定もできてしまいます。ハッシュだけなら、そこから元のトークンは作れません。パスワードは人が覚えられる短い文字列なので、速いハッシュだと総当たりで見つかりますが、トークンは 256 ビットのランダムな値なので、1秒に何十億回試しても、終わるまでに宇宙の年齢よりずっと長くかかります。だから、遅いハッシュにする必要がありません（ソルトも要りません。同じトークンが2つ作られることは、まず無いからです）。

**(3)** 本文の「自動でリンクを開く仕組み」「ほかのサイトに置いた `<img>`」のほかに、次のようなことがあります。

- 確認のページに外の画像やスクリプトがあると、`Referer` に URL（トークンを含む）が付いて、外のサーバに送られることがある
- アクセスのログや、ブラウザの履歴に、使える状態のトークンが残る（GET で確認した瞬間に使い終わるなら害は小さいが、「GET のページで表示だけして、別の操作で使う」作りにしたときに効いてくる）
- 再設定のリンクを GET で「使って」しまうと、本人が開いたときには使い終わっている

**(4)** A は、応答の番号と本文で、登録しているかが分かります（列挙）。B は、応答は同じですが、時間が違います（約 60ms と約 2ms）。新しいアドレスのときだけ、パスワードのハッシュを計算したり、メールを `await` で送ったりしていると、こうなります。本文5.3節・7節のように、どちらでもハッシュを計算し、メールを待たずに返すと、時間もそろいます。

**(5)**

| | 答え | 理由 |
| --- | --- | --- |
| a | やり直さない | 550 は「宛先が無い」などのずっと続く失敗 |
| b | やり直す | 452 は「今は受け取れない（容量が足りない）」などの一時的な失敗 |
| c | やり直す | つながらなかった。サーバが再起動中かもしれない |
| d | やり直さない | 535 はログインの失敗。設定（ユーザー名・パスワード）を直すまで、何回やっても同じ。人に知らせる |

**(6)** 例:

- ほかの端末のセッション（第52章 8節）。パスワードが盗まれていたなら、攻撃する人がまだログインしている
- 同じ人の、ほかの再設定のトークン（何通も頼んでいた場合）。練習問題5の `issue` で古いものを消す、または `revokeAll`
- 「ログインの失敗の回数」（第51章 6節）。本人が正しいパスワードを決め直したので、数え直してよい

## 問題5 トークンの保存場所を広げる

[token-store.ts](token-store.ts) を見てください。

- `usable(token, purpose)` に「使えるか」の判断をまとめ、`check` と `consume` の両方から使いました。片方だけ直して、もう片方を直し忘れることがなくなります。
- `issue` で古いものを消すのは、「同じ人・同じ使い道」だけです。確認のトークンと再設定のトークンは、別々に生きています。
- `purge` は、データベースなら `DELETE FROM email_tokens WHERE used_at IS NOT NULL OR expires_at <= now()` の1行です。定期的に動かす仕組みは、第12部 第64章で作ります。

**つまずきやすい所**: `Map` を `for … of` で回しながら `delete` しても、JavaScript では安全です（消した要素を飛ばして続く）。配列を `for` で回しながら `splice` するのとは違います。

## 問題6 一時的な失敗だけやり直す

```ts
export async function sendWithRetry(send, mail, { retries = 3, baseDelayMs = 1000, sleep = realSleep } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await send(mail);
      return attempt;
    } catch (err) {
      if (attempt > retries || !isTransient(err)) throw err;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
```

- `for (let attempt = 1; ; attempt++)` は、終わりの条件の無いループです。`return` か `throw` でしか抜けません。
- `attempt > retries` は、「最初の1回 + やり直し `retries` 回」を使い切ったかです。`retries = 2` なら、3回目の失敗で投げます。
- `isTransient` の順番が大事です。nodemailer の `EENVELOPE` は、451 でも 550 でも同じ `code` なので、`code` より先に `permanent`・`responseCode` を見ます。
- 第3部 第12章の `retry`（指数バックオフ）と同じ形です。本番では、待つ時間に少しランダムな幅（ジッター）を足して、たくさんのワーカーが同じ瞬間にやり直さないようにします。

## 問題7 メールを後ろで送る列

[mail-queue.ts](mail-queue.ts) を見てください。

- `enqueue` は `void run()` と呼ぶだけで、`run` の終わりを待ちません。`void` は「この Promise は待たない」ことを、ESLint（`no-floating-promises`）と読む人に示す書き方です（第7部 第37章）。`run` の中で失敗は `try`/`catch` しているので、unhandled rejection にはなりません。
- `running` を `run` の最初で `true` にして、終わりで `false` に戻すので、`run` が2つ同時に動くことはありません（JavaScript は1つのスレッドで動くので、`if (!running)` と `running = true` の間に割り込まれません。第3部 第13章）。
- `for (let mail = waiting.shift(); mail !== undefined; mail = waiting.shift())` は、「列の先頭を取り出し、無くなるまで繰り返す」ループです。送っている間に `enqueue` されたものも、`shift` で取り出されます。
- この列は、プロセスのメモリの中にあります。プロセスが止まると、送っていないメールは消えます。本番では、データベースや Redis のキューに置きます（第12部 第64章）。

## 問題8 パスワードの再設定の API

[reset-app.ts](reset-app.ts) の、`// 追加` の印の所を見てください。

- `forgot` は、いない人でも、1分以内の2回目でも、同じ 202 を返します。送るかどうかの判断は、応答の後ろに隠れています。
- `lastResetMail` はアドレスごとの時刻です。いない人のアドレスは覚えません（覚えても害はありませんが、だれでも好きなだけ `Map` を大きくできてしまいます）。本番では、IP アドレスごとの回数の制限（第5部 第24章、第6部 第34章）も足します。
- `reset` では、`hashPassword` の `await` を `consume` の前に置きました。`consume` の後に `await` があると、その間に同じトークンでもう1つのリクエストが来ても、`consume` は1回しか成功しないので、二重に変わることはありません。でも、「使ったのに、パスワードは変わらなかった」（ハッシュの計算が失敗した）ときに、リンクを無駄にしてしまいます。先に計算すれば、失敗はトークンを使う前に起きます。
- `user.emailVerifiedAt ??= now()` は、「`null` か `undefined` のときだけ入れる」書き方です（`??=`）。
- 成果物では、ここに「ほかの端末のセッションを消す」（第52章 8節）と「パスワードが変わりましたのメール」を足します。
