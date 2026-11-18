# 第60章 本番環境の考え方

第11部までのアプリは、自分の Mac の中で、自分だけが使うものでした。**本番環境**（production）では、知らない人が、いつでも、たくさん使います。この章では、アプリを公開する前に決めておくこと、つまり設定と秘密の値の置き場所、落ちたときに起動し直す仕組み、止め方、プロキシの後ろで客を正しく見分ける方法、ヘルスチェックを、小さなサーバで手を動かして確かめます。どれも、第61章からのコンテナ・クラウド・ジョブ・CDN・監視の土台になります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第5部 第26章（設定・ログ・止め方）、第10部 第52・55章（Cookie の属性・エラーを見せない）、第11部 |
| この章のゴール | 開発と本番で変えるものを挙げられる / 設定を環境変数から読み、本番で足りなければ起動しないようにできる / `.env` と `node --env-file` を使い分けられる / 落ちたら起動し直す仕組みと、止めるときの順番を説明できる / 秘密の値を取り替えられる / `trust proxy` を、前にあるプロキシの段の数に合わせて決められる / `/healthz` と `/readyz` を書き分けられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文の「手を動かす」で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第12部の最初の章です。まだなら、部の [README.md](../README.md) の「準備」で `setup-part12.sh` を1回だけ動かし、`~/dev/part12` を作ってください。この章のコマンドは、`~/dev/part12/ch60-production/` で実行します。
>
>   ```sh
>   $ cd ~/dev/part12/ch60-production
>   ```
>
> - サーバはポート **9807**（7節のプロキシは **9808**）で待ちます。8節だけ、第6部の `compose.yaml` の PostgreSQL（127.0.0.1:5433）を使います。
> - 自分で書くファイルは、章のフォルダ（`~/dev/part12/ch60-production/`）に置きます。うまく動かないときは `samples/` の同じ名前のファイルと比べてください。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 設定を環境変数から読む・本番で必須の値（2節） | 第61章（コンテナに `-e` で渡す）、第62章（PaaS の画面で設定する）、成果物 |
| 落ちたら起動し直す・止める順番（4・5節） | 第61章（`docker stop` と PID 1）、第64章（ワーカーを止める）、第66章（複数のプロセス） |
| 秘密の値の置き場所と取り替え（6節） | 第62章（GitHub の Secrets、PaaS の環境変数）、成果物 |
| `trust proxy`・`Secure`・HSTS（7節） | 第62章（PaaS の HTTPS の後ろで動かす）、成果物 |
| `/healthz` と `/readyz`（8節） | 第61章（`HEALTHCHECK`）、第62章（デプロイの切り替え）、第66章（ロードバランサ） |

---

## 1. 開発と本番は何が違うか

開発では「すぐ直して、すぐ試す」ことが大事でした。本番では「止まらない・漏らさない・後から調べられる」ことが大事です。同じコードを、設定だけ変えて動かします。

| 項目 | 開発（自分の Mac） | 本番（公開するサーバ） |
| --- | --- | --- |
| だれが使うか | 自分だけ | 知らない人（悪意のある人も） |
| エラーの表示 | スタックトレースを画面に出してよい | 中身を見せない。ログに残す（第10部 第55章 10節） |
| 設定・秘密の値 | 既定の値・`dev-only-…` の仮の値 | 環境変数で渡す本物の値。無ければ起動しない |
| 起動のしかた | `node --watch`・`npm run dev`（変えたら起動し直す） | ふつうの `node`。落ちたら見張り役が起動し直す |
| 通信 | `http://127.0.0.1` | HTTPS。前にプロキシ（ロードバランサ）がある |
| Cookie | `sid`、`Secure` なし | `__Host-sid`、`Secure` あり、HSTS |
| ログ | 読みやすい形・ターミナルに | 1行1つの JSON・集めて探す（第66章） |
| 台数 | 1つ | 何台かになることがある（第66章） |

**Flask では**: `flask run --debug` は、Werkzeug（Flask が使う道具の集まり）の**開発用のサーバ**を起動します。コードを変えたら起動し直す機能（reloader）と、エラーの画面でコードを動かせるデバッガが付いていて、本番では使わないように、と公式に書かれています。本番では gunicorn などの WSGI サーバ（Python の Web アプリを動かすための別のプログラム）で動かします。Node.js では、`node:http` のサーバ（Express もこれを使う）そのものが本番で使えるものなので、「本番用のサーバに取り替える」ことはしません。そのかわり、**この章で扱う設定と動かし方を、自分で決める**必要があります。

### 1.1 `NODE_ENV`

Node.js の世界では、`NODE_ENV` という環境変数で「今は本番か」を伝える習慣があります。Node.js 自身はこの値を見ませんが、Express などのパッケージが見ます。

| 値 | 意味 |
| --- | --- |
| `production` | 本番。Express はエラーの中身を隠し、テンプレートを覚える |
| `development`（または無し） | 開発。Express はエラーの中身を見せる |
| `test` | テスト（この教材では、ログを出さないなどに使った） |

### 1.2 手を動かす: `NODE_ENV` で Express の動きが変わる

`env-demo.ts` を作ります。わざと、エラーのメッセージに秘密の値（の例）を入れておきます。

```ts
import express from 'express';

const app = express();
app.get('/', (_req, res) => {
  res.send(`NODE_ENV=${process.env.NODE_ENV ?? '(なし)'}、app.get('env')=${app.get('env')}\n`);
});
app.get('/boom', () => {
  throw new Error('データベースのパスワード dev-only-password が違います');
});

app.listen(9807, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:9807/ で待っています（env: ${app.get('env')}）`);
});
```

`NODE_ENV` を付けずに起動し、別のターミナルで `curl`（`-i` は応答のヘッダも出す。第2部 第6章）で頼みます。

```sh
$ node env-demo.ts
http://127.0.0.1:9807/ で待っています（env: development）
```

```sh
$ curl http://127.0.0.1:9807/
NODE_ENV=(なし)、app.get('env')=development
$ curl -i http://127.0.0.1:9807/boom
HTTP/1.1 500 Internal Server Error
…
<pre>Error: データベースのパスワード dev-only-password が違います<br> &nbsp; &nbsp;at file:///Users/alice/dev/part12/ch60-production/env-demo.ts:8:9<br> …
```

`Ctrl+C` で止め、今度は `NODE_ENV=production` を付けて起動します。`名前=値 コマンド` と書くと、そのコマンドにだけ環境変数を渡せます（第1部 第1章）。

```sh
$ NODE_ENV=production node env-demo.ts
http://127.0.0.1:9807/ で待っています（env: production）
```

```sh
$ curl -i http://127.0.0.1:9807/boom
HTTP/1.1 500 Internal Server Error
…
<pre>Internal Server Error</pre>
```

| 確かめたこと | 意味 |
| --- | --- |
| `app.get('env')` | Express は `NODE_ENV` を読み、無ければ `development` にする |
| 開発: スタックトレースとメッセージを返す | ファイルの場所・中の様子・秘密の値が、だれにでも見える |
| 本番: `Internal Server Error` だけ | 中身はサーバのターミナル（ログ）にだけ出る |

`NODE_ENV` を付け忘れると、本番でも開発の動きになります。第10部の成果物は、自分でエラーを受け取るミドルウェア（problem+json）を持っているので、この既定の画面は出ませんが、パッケージの中には `NODE_ENV` で速さや安全さを変えるものがあります。本番では必ず `NODE_ENV=production` にします。

## 2. 設定は環境変数から読む

本番のつなぎ先や鍵は、コードに書きません。**環境変数**で渡します。こうすると、同じコード（同じイメージ。第61章）を、開発・ステージング（本番の手前の試しの環境）・本番で、設定だけ変えて動かせます。この考え方は、Web アプリの作り方の指針「The Twelve-Factor App」の3番目「設定」としてよく知られています。

**Flask では**: `app.config['SECRET_KEY'] = os.environ['SECRET_KEY']` のように、`os.environ`（Python の環境変数の辞書）から読みます。Flask 2.2 からは `app.config.from_prefixed_env()` で `FLASK_` で始まる環境変数をまとめて読めます。Node.js では `process.env` が同じものです。

### 2.1 起動するときに1回だけ確かめる

第5部 第26章で、設定を zod で確かめる `loadConfig` を書きました。本番では、これに「**本番で必須の値が無ければ起動しない**」を足します。起動してから、最初のログインのときに「鍵がありません」で落ちるより、起動のときに落ちたほうが、デプロイの途中で気づけるからです（第62章 6節で、新しい版が起動しなければ、古い版のまま動き続けることを見ます）。

### 2.2 手を動かす: 本番で必須の値

`config.ts` を作ります。

```ts
import { z } from 'zod';

z.config(z.locales.ja()); // zod のエラーを日本語に（第7部 第38章）

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.string().regex(/^\d{1,5}$/).transform(Number).default(9807),
  SESSION_SECRET: z.string().min(32).optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv) {
  const r = Env.safeParse(env);
  if (!r.success) {
    // 名前と理由だけを書く（値は書かない。秘密の値が、ログやターミナルに残らないように）
    throw new Error(r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join('\n'));
  }
  const e = r.data;
  if (e.NODE_ENV === 'production' && e.SESSION_SECRET === undefined) {
    throw new Error('SESSION_SECRET は本番では必須です');
  }
  return { ...e, SESSION_SECRET: e.SESSION_SECRET ?? 'dev-only-session-secret-0123456789abcdef' };
}

if (import.meta.main) {
  try {
    const config = loadConfig(process.env);
    // 秘密の値は、ログやターミナルに出さない（長さだけ）
    console.log({ ...config, SESSION_SECRET: `（${config.SESSION_SECRET.length} 文字）` });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}
```

```sh
$ node config.ts
{
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: 9807,
  SESSION_SECRET: '（40 文字）'
}
$ NODE_ENV=production node config.ts
SESSION_SECRET は本番では必須です
$ echo $?
1
$ NODE_ENV=production PORT=abc SESSION_SECRET=x node config.ts
PORT: 無効な文字列: パターン/^\d{1,5}$/に一致する必要があります
SESSION_SECRET: 小さすぎる値: stringは32文字以上である必要があります
```

| 書いたもの | 意味 |
| --- | --- |
| `.default(…)` | 開発で便利な既定の値。**秘密の値には既定の値を持たせない**（本番で付け忘れても動いてしまうので） |
| `NODE_ENV === 'production'` のときだけ必須 | 開発では仮の値で動かし、本番では本物を渡さないと起動しない |
| エラーに値を書かない | 間違った値が本物の鍵の書き損じかもしれない。名前と理由だけ |
| `echo $?` | 直前のコマンドの終了コード（第1部 第1章 7節）。1 なら「失敗」。見張り役や PaaS は、これでデプロイの失敗に気づく |

### 2.3 手を動かす: `.env` と `node --env-file`

開発で毎回 `NODE_ENV=… SESSION_SECRET=…` と打つのは大変です。**`.env`** というファイルに書いておき、Node.js に読ませます。Node.js 20.6 から、パッケージ（dotenv）なしで読めるようになりました。

章のフォルダに `.env` を作ります（`printf` は、`\n` を改行にして書き出すコマンド。`>` でファイルに書く。第1部 第1章）。

```sh
$ printf 'NODE_ENV=production\nSESSION_SECRET=dev-only-session-secret-from-env-file-xx\n' > .env
$ node --env-file=.env config.ts
{
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: 9807,
  SESSION_SECRET: '（40 文字）'
}
$ PORT=9900 node --env-file=.env config.ts
{
  NODE_ENV: 'production',
  HOST: '127.0.0.1',
  PORT: 9900,
  SESSION_SECRET: '（40 文字）'
}
$ node --env-file=.nope config.ts
node: .nope: not found
$ node --env-file-if-exists=.nope config.ts
.nope not found. Continuing without it.
{
…
```

| オプション | 意味 |
| --- | --- |
| `--env-file=ファイル` | ファイルの `名前=値` を環境変数にしてから動かす。ファイルが無ければ止まる（終了コード 9） |
| `--env-file-if-exists=ファイル` | ファイルが無ければ、何もせずに動かす（本番には `.env` を置かないので、同じコマンドで動かせる） |
| シェルで付けた値が勝つ | `PORT=9900` は、ファイルの値より強い。「普段はファイル、今だけ変える」ができる |

`.env` には秘密の値が入るので、**Git に入れません**。第1部 第3章の `.gitignore` に `.env` を書きます。かわりに、名前と例だけを書いた `.env.example` をコミットしておくと、ほかの人（と未来の自分）が、どの設定が要るかを知れます（練習問題8で、これを見比べるコマンドを作ります）。

```text
# .env.example（コミットする。値が空のものは、本番では必須）
NODE_ENV=development
PORT=9807
SESSION_SECRET=
```

**本番では `.env` のファイルを使いません。** PaaS の画面や、コンテナを起動するときの指定（第61・62章）で、環境変数として渡します。ファイルをサーバに置くと、バックアップやイメージに紛れ込みやすいからです。

確かめたら、`.env` を消しておきます（`rm` はファイルを消すコマンド。ゴミ箱には入らないので、名前をよく確かめてから打つ）。

```sh
$ rm .env
```

## 3. 本番で何を動かすか

開発で使っている道具の多くは、本番では要りません。本番に持っていくもの・持っていかないものを分けます。

| もの | 開発 | 本番 |
| --- | --- | --- |
| API の `.ts` | `node --watch src/server.ts` | `node src/server.ts`（Node.js の型の除去で、そのまま動く。第7部 第37章 1節） |
| 型の確かめ（`tsc`）・ESLint・テスト | 手元と CI で動かす | 動かさない。CI（第11部 第59章）で通ったものだけを本番に出す |
| 画面（React） | `vite`（開発サーバ） | `vite build` で作った `dist/` の静的なファイル（第8部 第40章）。API のサーバか CDN から配る（第65章） |
| `devDependencies` | 入れる | 入れない（`npm ci --omit=dev`） |

`npm ls --omit=dev --depth=0` で、本番で要るパッケージだけを見られます（`--omit=dev` は `devDependencies` を除く、`--depth=0` は自分で入れたものだけを出す）。部のフォルダで試してみます。

```sh
$ cd ~/dev/part12
$ npm ls --omit=dev --depth=0
part12-deploy@1.0.0 /Users/alice/dev/part12
├── @aws-sdk/client-s3@3.1161.0
├── @aws-sdk/s3-request-presigner@3.1161.0
├── bullmq@6.5.4
├── express@5.3.0
├── nodemailer@10.3.1
├── pg@8.23.1
├── pino@10.4.0
├── redis@6.3.1
└── zod@4.6.7
$ cd ch60-production
```

TypeScript・ESLint・型定義（`@types/…`）は入っていません。本番に入れるものが少ないほど、イメージは小さく（第61章）、脆弱性の知らせ（`npm audit --omit=dev`。第11部 第59章）も少なくなります。

**TypeScript をビルドするか**: この教材では、本番でも `node src/server.ts` で動かします。Node.js 24 の型の除去は、型の部分を空白に置き換えるだけなので速く、ビルドの手順が要りません。一方、`tsc` で `.js` を作ってから動かす方法（第7部 第37章 1.3節）は、古い Node.js でも動き、`enum` なども使えます。どちらでも、型の確かめは CI でします。

## 4. プロセスを動かし続ける

どんなに気をつけても、思いがけない例外でプロセスが終わることはあります（第3部 第12・13章）。本番では、**落ちたことに気づいて、起動し直す役**が要ります。

### 4.1 手を動かす: ときどき落ちるサーバ

`crash.ts` を作ります。`/crash` を頼むと、コールバックの中で例外を投げます。だれも受け取らないので、プロセスが終わります。

```ts
import http from 'node:http';

const startedAt = new Date().toISOString();
const server = http.createServer((req, res) => {
  if (req.url === '/crash') {
    res.end('落ちます\n');
    // コールバックの中の throw は、どこにも受け取られないので、プロセスが終わる（第3部 第12章）
    setTimeout(() => {
      throw new Error('思いがけないエラー');
    }, 10);
    return;
  }
  res.end(`動いています（pid ${process.pid}、起動 ${startedAt}）\n`);
});
server.listen(9807, '127.0.0.1', () => console.log(`pid ${process.pid}: http://127.0.0.1:9807/ で待っています`));
// Ctrl+C（SIGINT）は、ターミナルから見張り役と子の両方に届く。どちらで止めても、1回だけ止める
let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    if (stopping) return;
    stopping = true;
    console.log(`pid ${process.pid}: ${sig} を受け取ったので止めます`);
    server.close(() => process.exit(0));
  });
}
```

```sh
$ node crash.ts
```

別のターミナルで `curl http://127.0.0.1:9807/crash` と打つと、サーバのターミナルにエラーが出て、プロセスが終わります。もう一度 `curl http://127.0.0.1:9807/` と打っても、`Failed to connect` になります。だれかが起動し直すまで、サービスは止まったままです。

### 4.2 手を動かす: 落ちたら起動し直す見張り役

`supervise.ts` を作ります。子プロセスとしてサーバを起動し（第3部 第15章の `spawn`）、終わったら、少し待って起動し直します。

```ts
import { spawn } from 'node:child_process';

const [script, ...args] = process.argv.slice(2);
if (script === undefined) {
  console.error('使い方: node supervise.ts 動かすファイル.ts');
  process.exit(2);
}

let restarts = 0;
let stopping = false;
let child = start();

function start() {
  const c = spawn(process.execPath, [script ?? '', ...args], { stdio: 'inherit' });
  c.on('exit', (code, signal) => {
    if (stopping) {
      console.log(`[見張り] 子が終わりました（code ${code}）。見張りも終わります`);
      return;
    }
    // 1秒、2秒、4秒、… と待つ時間を延ばす（すぐ落ちるものを、休みなく起動し直さないように）。上限 30 秒
    const wait = Math.min(1000 * 2 ** restarts, 30_000);
    restarts += 1;
    console.log(`[見張り] 子が終わりました（code ${code}、signal ${signal}）。${wait} ms 後に起動し直します（${restarts} 回目）`);
    setTimeout(() => {
      child = start();
    }, wait);
  });
  return c;
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopping = true;
    console.log(`[見張り] ${sig} を受け取りました。子に SIGTERM を送ります`);
    child.kill('SIGTERM');
  });
}
```

```sh
$ node supervise.ts crash.ts
pid 1609: http://127.0.0.1:9807/ で待っています
```

別のターミナルで、頼んでは落とすのを2回繰り返します。

```sh
$ curl http://127.0.0.1:9807/
動いています（pid 1609、起動 2026-11-18T13:32:50.456Z）
$ curl http://127.0.0.1:9807/crash
落ちます
$ curl http://127.0.0.1:9807/
動いています（pid 1619、起動 2026-11-18T13:32:52.446Z）
$ curl http://127.0.0.1:9807/crash
落ちます
$ curl http://127.0.0.1:9807/
動いています（pid 1629、起動 2026-11-18T13:32:54.999Z）
```

見張り役のターミナルには、次のように出ます（エラーの詳しい行は省きました）。最後に `Ctrl+C` で止めます。

```text
Error: 思いがけないエラー
…
[見張り] 子が終わりました（code 1、signal null）。1000 ms 後に起動し直します（1 回目）
pid 1619: http://127.0.0.1:9807/ で待っています
Error: 思いがけないエラー
…
[見張り] 子が終わりました（code 1、signal null）。2000 ms 後に起動し直します（2 回目）
pid 1629: http://127.0.0.1:9807/ で待っています
^Cpid 1629: SIGINT を受け取ったので止めます
[見張り] SIGINT を受け取りました。子に SIGTERM を送ります
[見張り] 子が終わりました（code 0）。見張りも終わります
```

ターミナルで `Ctrl+C` を押すと、SIGINT は、そのターミナルで動いているプロセスの全部（見張り役と子）に届きます。だから `crash.ts` も SIGINT を受け取って止まり、見張り役が送った SIGTERM は、止めている途中なので無視されます。Docker や PaaS は、見張り役だけに `SIGTERM` を送るので、見張り役が子に伝える必要があります（第61章 5節）。

| 書いたもの | 意味 |
| --- | --- |
| `spawn(process.execPath, [script])` | 今の node（`process.execPath`）で子を起動する（第3部 第16章） |
| `stdio: 'inherit'` | 子の出力を、見張り役のターミナルにそのまま出す |
| `exit` の後に `setTimeout` | 待つ時間を倍にしていく（**指数バックオフ**。第3部 第12章の `retry` と同じ考え） |
| `stopping` | 止めるために終わらせたのか、落ちたのかを分ける。止めるときは起動し直さない |
| 子に `SIGTERM` を伝える | 見張り役だけが終わると、子が残る。止める合図は子まで届ける |

pid（プロセスの番号）が変わったことと、起動の時刻が変わったことから、**別のプロセスとして起動し直した**ことが分かります。メモリに持っていたもの（第5部の SSE のハブ、メモリのレート制限）は消えます。だから本番では、残したい状態をデータベースや Redis に置きます。

この見張り役は、回数を数え直さないので、何時間も動いた後に1回落ちただけでも、待つ時間がだんだん長くなります。練習問題6で、「しばらく動いたら数え直す」「何度も続けて落ちたらあきらめる」を足します。

### 4.3 本番で見張り役をするもの

本番では、見張り役を自分で書きません。動かす場所が用意しているものを使います。

| 動かす場所 | 見張り役 | 章 |
| --- | --- | --- |
| Docker | `docker run --restart unless-stopped`、Compose の `restart:` | 第61章 |
| PaaS（Render・Fly.io など） | 落ちたら自動で起動し直す。`/healthz` が答えなくなっても起動し直す | 第62章 |
| Linux のサーバ | systemd（`Restart=on-failure`） | （この教材では扱わない） |
| Node.js のパッケージ | pm2 など | （この教材では扱わない） |

`node --watch` は、ファイルが変わったら起動し直す**開発用**の機能です。落ちたときに起動し直すものではありません（例外で終わると、ファイルが変わるまで止まったまま）。本番では使いません。

## 5. 止めるとき

デプロイのたびに、古い版のプロセスは止められます。第5部 第26章 8節で、`SIGTERM` を受け取ったら「新しい接続を断り、処理中のリクエストを終えてから終わる」**グレースフルシャットダウン**を書きました。本番では、だれが・いつ `SIGTERM` を送るかを知っておきます。

| 順番 | だれが | 何をする |
| --- | --- | --- |
| 1 | PaaS・Docker | 新しい版を起動し、`/healthz`（`/readyz`）が答えるのを待つ |
| 2 | ロードバランサ | 新しいリクエストを、新しい版に送り始める |
| 3 | PaaS・Docker | 古い版に `SIGTERM` を送る |
| 4 | 古い版のアプリ | `/readyz` を 503 にし、少し待ってから `server.close()`。処理中のリクエストを終える |
| 5 | 古い版のアプリ | データベースのプールなどを閉じて、終了コード 0 で終わる |
| 6 | PaaS・Docker | 決まった時間（多くは数十秒）たっても終わらなければ、`SIGKILL` で強制的に終わらせる |

`SIGKILL` は、アプリが受け取れない合図です。片付けの途中でも、その場で終わります。だから、止める処理は、PaaS の待ち時間より短い時間で終わるようにします（第5部 第26章 8節の `SHUTDOWN_TIMEOUT_MS`）。メールを送るような長い仕事は、リクエストの中でせず、ジョブ（第64章）に回します。

## 6. 秘密の値

### 6.1 置き場所

**秘密の値**（シークレット）は、データベースのパスワード、セッションの鍵、メール送信サービスの API キー、IdP の `client_secret` などです。漏れると、なりすましやデータの持ち出しに使われます。

| 置き場所 | よいか | 理由 |
| --- | --- | --- |
| コード・Git のリポジトリ | だめ | 履歴に残り続ける。消しても、取り替えるまで危ない（第1部 第3章 13.3節） |
| コンテナのイメージ（`ENV`・`COPY .env`） | だめ | イメージを持っている人にはだれにでも読める（第61章 7節で確かめます） |
| ログ・エラーの画面 | だめ | ログは多くの人や道具が読む。URL のパスワードは `***` に（第6部） |
| PaaS の環境変数の設定 | よい | 画面か CLI で入れ、起動のときに環境変数として渡される（第62章） |
| GitHub Actions の Secrets | よい | CI・デプロイのときだけ使う値（第62章 7節） |
| 秘密を預かるサービス（Secret Manager など） | よい | 大きな組織で、だれが読めるかを細かく決めるとき |

**取り替え**（ローテーション）も決めておきます。秘密の値は、漏れたと分かったとき、やめた人が知っていたとき、定期的に、と取り替えることがあります。取り替えるとき、すぐに古い値を捨てると、古い値で署名した Cookie を持っている人が全員ログアウトします。

### 6.2 手を動かす: 鍵を取り替える

鍵を1つではなく**配列**で持ち、「署名は最初の鍵で、確かめは全部の鍵で」とします。`rotate.ts` を作ります。`sign`・`unsign` は、第4部 第22章で書いたものと同じ「値.署名」の形です。

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 値に、最初の鍵で署名を付ける（第4部 第22章の sign と同じ形: 値.署名） */
function sign(value: string, keys: string[]): string {
  const key = keys[0];
  if (key === undefined) throw new Error('鍵がありません');
  return `${value}.${createHmac('sha256', key).update(value).digest('base64url')}`;
}

/** どれかの鍵で署名が合えば、値を返す。どれでも合わなければ undefined */
function unsign(signed: string, keys: string[]): string | undefined {
  const dot = signed.lastIndexOf('.');
  if (dot < 0) return undefined;
  const value = signed.slice(0, dot);
  const given = Buffer.from(signed.slice(dot + 1));
  for (const key of keys) {
    const expected = Buffer.from(createHmac('sha256', key).update(value).digest('base64url'));
    if (expected.length === given.length && timingSafeEqual(expected, given)) return value;
  }
  return undefined;
}

const OLD = 'dev-only-old-key-0123456789abcdef0123';
const NEW = 'dev-only-new-key-0123456789abcdef0123';

const before = sign('user:42', [OLD]); // 取り替える前に配った値（ブラウザの Cookie に入っている）
console.log('取り替える前に配った値:', before);
console.log('1. 古い鍵だけ           :', unsign(before, [OLD]));
console.log('2. 新しい鍵だけ         :', unsign(before, [NEW]), '← 全員がログアウトしてしまう');
console.log('3. [新しい鍵, 古い鍵]   :', unsign(before, [NEW, OLD]), '← 古い値も読める');
const after = sign('user:42', [NEW, OLD]);
console.log('4. 取り替えた後に配る値 :', after, '（新しい鍵で署名）');
console.log('5. 古い鍵を外した後     :', unsign(after, [NEW]), '／', unsign(before, [NEW]));
```

```sh
$ node rotate.ts
取り替える前に配った値: user:42.eZOpoIDZlv56q7xjkEmDC2rNPvVZuoVuj20Gg6EbeAY
1. 古い鍵だけ           : user:42
2. 新しい鍵だけ         : undefined ← 全員がログアウトしてしまう
3. [新しい鍵, 古い鍵]   : user:42 ← 古い値も読める
4. 取り替えた後に配る値 : user:42.F5XqxZn-J8rwBE2XidHGfP7cM6nREPIwbxlTHJ1MgvY （新しい鍵で署名）
5. 古い鍵を外した後     : user:42 ／ undefined
```

取り替えの手順は、次の3つです。

| 手順 | 環境変数 `SESSION_SECRETS` | 起きること |
| --- | --- | --- |
| 1. 新しい鍵を前に足す | `新しい鍵,古い鍵` | 新しく配る値は新しい鍵で署名。古い値もまだ読める |
| 2. しばらく待つ | （そのまま） | 古い値の Cookie は、使われるたびに新しい値に置き換わるか、期限が切れる |
| 3. 古い鍵を外す | `新しい鍵` | 古い鍵で署名された値は、もう通らない |

express-session（第10部 第52章）の `secret` にも、配列を渡せます。最初の鍵で署名し、全部の鍵で確かめる、という同じ動きです。**漏れたことが分かったとき**は、待たずに古い鍵を外します（全員がログインし直すことになりますが、漏れた鍵を使い続けるよりよい）。

## 7. プロキシの後ろで動く

本番のアプリの前には、たいてい**リバースプロキシ**（ロードバランサ）があります。PaaS では、HTTPS を受けて証明書を扱うのはプロキシで、アプリはプロキシから HTTP で頼まれます（第62章）。すると、アプリから見た「つながってきた相手」は、客ではなくプロキシになります。

プロキシは、本当の客の情報を、ヘッダに書いて渡します。

| ヘッダ | 中身 |
| --- | --- |
| `X-Forwarded-For` | 客の IP アドレス。プロキシを通るたびに、右に足される（`客, プロキシ1, …`） |
| `X-Forwarded-Proto` | 客が使ったのが `https` か `http` か |
| `X-Forwarded-Host` | 客が頼んだホスト名 |

### 7.1 手を動かす: アプリから見た客

`whoami.ts` を作ります。`TRUST_PROXY` という環境変数で、Express の **`trust proxy`** の設定を変えられるようにします。

```ts
import express from 'express';

const app = express();
// TRUST_PROXY が数字なら「前に何段のプロキシがあるか」、無ければ信じない（Express の既定）
if (process.env.TRUST_PROXY !== undefined) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.get('/', (req, res) => {
  res.json({
    socket: req.socket.remoteAddress, // TCP でつながってきた相手（プロキシの後ろなら、プロキシ）
    ip: req.ip,
    ips: req.ips,
    protocol: req.protocol,
    secure: req.secure,
    hostname: req.hostname,
    xff: req.get('x-forwarded-for') ?? null,
  });
});

app.listen(9807, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:9807/ で待っています（trust proxy: ${String(app.get('trust proxy'))}）`);
});
```

次に、PaaS の代わりの、いちばん小さなプロキシ `proxy.ts` を作ります。9808 で受けて 9807 へ渡し、そのとき `X-Forwarded-…` を付けます。本物の PaaS はここで HTTPS を終わらせるので、`X-Forwarded-Proto` に `https` と書くことにします。

```ts
import http from 'node:http';

const server = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress ?? '';
  // 前に届いた X-Forwarded-For があれば、その後ろに、今の相手を足す（客, プロキシ1, プロキシ2, … の順）
  const prior = req.headers['x-forwarded-for'];
  const xff = prior === undefined ? clientIp : `${String(prior)}, ${clientIp}`;
  const upstream = http.request(
    {
      host: '127.0.0.1',
      port: 9807,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        'x-forwarded-for': xff,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': req.headers.host ?? '',
      },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end('アプリにつながりません\n');
  });
  req.pipe(upstream);
});

server.listen(9808, '127.0.0.1', () => {
  console.log('http://127.0.0.1:9808/ で受けて、http://127.0.0.1:9807/ へ渡します');
});
```

| 書いたもの | 意味 |
| --- | --- |
| `http.request({ … })` | 受けたリクエストと同じメソッド・パス・ヘッダで、アプリに頼み直す |
| `req.pipe(upstream)`・`up.pipe(res)` | 本文を、流しながら渡す（第3部 第15章の Stream） |
| 502 | つなぎ先が答えないときの状態コード（Bad Gateway）。PaaS でアプリが起動していないときにも見る |

ターミナルを3つ使います。1つ目で `node proxy.ts`、2つ目で `node whoami.ts`、3つ目で頼みます。`-H` は、頼むときにヘッダを足すオプションです（第2部 第6章）。ここでは、客が自分で `X-Forwarded-For` を書いて、うその IP アドレスを名乗る場合を試します（`192.0.2.10` は説明用のアドレス）。

```sh
$ curl http://127.0.0.1:9807/
{"socket":"127.0.0.1","ip":"127.0.0.1","ips":[],"protocol":"http","secure":false,"hostname":"127.0.0.1","xff":null}
$ curl http://127.0.0.1:9808/
{"socket":"127.0.0.1","ip":"127.0.0.1","ips":[],"protocol":"http","secure":false,"hostname":"127.0.0.1","xff":"127.0.0.1"}
```

プロキシを通しても、`protocol` は `http`、`secure` は `false` のままです。Express は、言われなければヘッダを信じません。2つ目のターミナルで `Ctrl+C` し、`TRUST_PROXY=1 node whoami.ts` で起動し直します。

```sh
$ curl http://127.0.0.1:9808/
{"socket":"127.0.0.1","ip":"127.0.0.1","ips":["127.0.0.1"],"protocol":"https","secure":true,"hostname":"127.0.0.1","xff":"127.0.0.1"}
$ curl -H 'X-Forwarded-For: 192.0.2.10' http://127.0.0.1:9808/
{"socket":"127.0.0.1","ip":"127.0.0.1","ips":["127.0.0.1"],"protocol":"https","secure":true,"hostname":"127.0.0.1","xff":"192.0.2.10, 127.0.0.1"}
$ curl -H 'X-Forwarded-For: 192.0.2.10' http://127.0.0.1:9807/
{"socket":"127.0.0.1","ip":"192.0.2.10","ips":["192.0.2.10"],"protocol":"http","secure":false,"hostname":"127.0.0.1","xff":"192.0.2.10"}
```

最後に `TRUST_PROXY=2 node whoami.ts` で起動し直して、プロキシを通して同じことをします。

```sh
$ curl -H 'X-Forwarded-For: 192.0.2.10' http://127.0.0.1:9808/
{"socket":"127.0.0.1","ip":"192.0.2.10","ips":["192.0.2.10","127.0.0.1"],"protocol":"https","secure":true,"hostname":"127.0.0.1","xff":"192.0.2.10, 127.0.0.1"}
```

この Mac の中では、客もプロキシも `127.0.0.1` なので分かりにくいですが、次のことが確かめられました。

| 試したこと | `req.ip` | 意味 |
| --- | --- | --- |
| `trust proxy` なし、プロキシ経由 | プロキシ（127.0.0.1） | 全員が同じ IP に見える。IP ごとの回数の制限（第5部）が、全員まとめて数えてしまう |
| `1`、プロキシ経由、うその XFF | プロキシが足した右端（本当の相手） | 客が書いた `192.0.2.10` は無視された。**正しい** |
| `1`、プロキシを通らずに直接、うその XFF | `192.0.2.10`（うそ） | アプリに直接届くと、うそを信じてしまう |
| `2`、プロキシは1段なのに | `192.0.2.10`（うそ） | 段の数を多く言うと、客の書いたものまで信じてしまう |

### 7.2 `trust proxy` の決め方

`X-Forwarded-For` は、だれでも書けるヘッダです。信じてよいのは、**自分のプロキシが足した部分だけ**です。

- `trust proxy` には、前にあるプロキシの**段の数**を書きます（PaaS のロードバランサが1段なら `1`）。`true`（全部信じる）は、客のうそまで信じるので使いません。段の数は、PaaS の説明で確かめます（第62章）
- アプリのポートに、プロキシを通らずに届かないようにします。PaaS では、外から届くのはプロキシだけです。自分でサーバを持つときは、アプリを `127.0.0.1` や中の網だけで待たせます
- `req.ip` は、回数の制限、ログ、不正の調べに使います。ログイン（第10部 第51章 6節）の回数の制限が正しく効くかは、ここで決まります

練習問題3で、`X-Forwarded-For` と段の数から客の IP アドレスを決める関数を、自分で書きます。

### 7.3 HTTPS のときだけの設定

`trust proxy` を正しく決めると、`req.secure` が `true` になります。これで、HTTPS のときだけの設定が効くようになります。

| 設定 | 意味 | 開発 | 本番 |
| --- | --- | --- | --- |
| Cookie の `Secure` | HTTPS のときだけ送る（第4部 第22章 2.1節） | 付けない（http://localhost） | 付ける |
| Cookie の名前 `__Host-` | `Secure`・`path=/`・`Domain` なしをブラウザに守らせる | `sid` | `__Host-sid` |
| HSTS（`Strict-Transport-Security`） | 「次から、このサイトは HTTPS でしか開かない」とブラウザに覚えさせる（第2部 第8章） | 送らない | 送る |

express-session は、`cookie.secure: true` のとき、`req.secure` が `false` なら **Cookie を送りません**（ログインしてもすぐ忘れられる）。本番で「ログインできない」ときは、`trust proxy` の付け忘れを最初に疑います。第10部の成果物は、本番では `__Host-sid` と `Secure` を使うように書いてありました。成果物（この部）で、`trust proxy` と合わせて本番の設定を仕上げます。練習問題7で、Cookie の名前の決まりと HSTS のヘッダを関数にします。

## 8. ヘルスチェック

動かす場所（Docker・PaaS・ロードバランサ）は、アプリに決まった URL を頼んで、元気かどうかを調べます。これを**ヘルスチェック**といいます。2つに分けます。

| URL | 聞いていること | 答えないとき、動かす場所がすること |
| --- | --- | --- |
| `/healthz` | プロセスが動いて、答えられるか（**生きているか**、liveness） | 起動し直す |
| `/readyz` | 頼みを受けられるか。データベースなどに届くか（**準備ができているか**、readiness） | そのプロセスにリクエストを送らない（起動し直さない） |

`/healthz` でデータベースを見てはいけません。データベースが少し止まっただけで、全部のアプリが「死んでいる」と判断されて起動し直され、データベースが戻ったときに一度に押し寄せるからです。

### 8.1 手を動かす: データベースに届くかを確かめる

第6部の PostgreSQL を動かしておきます（`(cd ~/dev/part06 && docker compose up -d --wait)`）。`health.ts` を作ります。

```ts
import express from 'express';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi',
  connectionTimeoutMillis: 1000, // つなぐのに 1 秒より長くかかったらあきらめる
});
pool.on('error', () => {}); // 使っていない接続が切れても、プロセスを落とさない（第6部 第32章）

/** promise が ms ミリ秒で終わらなければ、失敗にする */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error(`${ms} ms で終わりませんでした`)), ms).unref()),
  ]);
}

let stopping = false;
const app = express();
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' }); // ここではデータベースを見ない（見ると、DB が止まっただけでアプリまで起動し直される）
});
app.get('/readyz', async (_req, res) => {
  if (stopping) {
    res.status(503).json({ status: 'stopping' });
    return;
  }
  try {
    await withTimeout(pool.query('SELECT 1'), 1500);
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    // 理由はログに書き、応答には書かない（つなぎ先の名前やポートを外に見せない。第10部 第55章 10節）
    console.error('readyz: データベースに届きません:', err instanceof Error ? err.message : err);
    res.status(503).json({ status: 'error', db: 'error' });
  }
});

const server = app.listen(9807, '127.0.0.1', () => console.log('http://127.0.0.1:9807/healthz・/readyz で待っています'));
process.on('SIGTERM', () => {
  stopping = true; // まず /readyz を 503 にして、ロードバランサに「もう送らないで」と伝える
  setTimeout(() => server.close(() => void pool.end()), 2000);
});
```

```sh
$ node health.ts
```

```sh
$ curl -i http://127.0.0.1:9807/healthz
HTTP/1.1 200 OK
…
{"status":"ok"}
$ curl -i http://127.0.0.1:9807/readyz
HTTP/1.1 200 OK
…
{"status":"ok","db":"ok"}
```

`Ctrl+C` で止め、届かないデータベース（5999 番には何も待っていない）を指定して起動し直します。

```sh
$ DATABASE_URL=postgres://app:dev-only-password@127.0.0.1:5999/taskapi node health.ts
http://127.0.0.1:9807/healthz・/readyz で待っています
```

```sh
$ curl -i http://127.0.0.1:9807/readyz
HTTP/1.1 503 Service Unavailable
…
{"status":"error","db":"error"}
$ curl -i http://127.0.0.1:9807/healthz
HTTP/1.1 200 OK
…
{"status":"ok"}
```

サーバのターミナルには `readyz: データベースに届きません: connect ECONNREFUSED 127.0.0.1:5999` と出ます。

| 書いたもの | 意味 |
| --- | --- |
| `SELECT 1` | いちばん軽い SQL。届いて答えが返るかだけを見る |
| `withTimeout` | 答えが返らないまま待ち続けると、ヘルスチェックそのものが時間切れになる。自分で短く打ち切る |
| `connectionTimeoutMillis` | pg のプールが、新しい接続を作るのを待つ時間 |
| `stopping` | `SIGTERM` を受けたら、まず `/readyz` を 503 に。ロードバランサが気づいてから、`server.close()` |
| `503 Service Unavailable` | 「今は受けられない」の状態コード。動かす場所は、これを見て送り先から外す |

練習問題5で、確かめるものを複数（データベースと Redis など）にして、同時に確かめ、それぞれ時間を区切るルーターを作ります。

## 9. 本番に出す前の点検表

この章の内容を、表にまとめます。第61章からの章と成果物で、1つずつ実際に設定していきます。

| 点検すること | この章 | 実際に設定する場所 |
| --- | --- | --- |
| `NODE_ENV=production` | 1節 | 第61章（Dockerfile）、第62章 |
| 設定は環境変数から。本番で必須の値が無ければ起動しない | 2節 | 成果物の `config.ts` |
| `.env` は Git に入れない。`.env.example` をコミット | 2.3節 | 成果物 |
| 本番に `devDependencies` を入れない | 3節 | 第61章（`npm ci --omit=dev`） |
| 落ちたら起動し直す | 4節 | 第61章（`restart`）、第62章 |
| `SIGTERM` で、処理中を終えてから止まる | 5節 | 第61章（PID 1 と合図） |
| 秘密の値は、PaaS の環境変数と GitHub の Secrets に。取り替えの手順を決める | 6節 | 第62章 |
| `trust proxy` を段の数で。`Secure`・`__Host-`・HSTS | 7節 | 成果物、第62章 |
| `/healthz` と `/readyz` | 8節 | 第61章（`HEALTHCHECK`）、第62章 |
| ログ・エラーの監視・計測 | — | 第66章 |

## まとめ

- 本番は「止まらない・漏らさない・後から調べられる」。同じコードを、設定だけ変えて動かす。`NODE_ENV=production` を付け忘れると、Express はエラーの中身を見せる。
- 設定は環境変数から読み、起動のときに確かめる。秘密の値には既定の値を持たせず、本番で無ければ起動しない（終了コード 1）。エラーに値を書かない。
- 開発では `.env` と `node --env-file`（シェルの値が勝つ）。`.env` は Git に入れず、`.env.example` をコミットする。本番は PaaS などの環境変数で渡す。
- プロセスは落ちることがある。見張り役が、待つ時間を延ばしながら起動し直す。本番では Docker・PaaS の仕組みを使い、`node --watch` は使わない。
- 止めるときは `SIGTERM` → `/readyz` を 503 → 処理中を終える → 片付けて終了。時間内に終わらなければ `SIGKILL` される。
- 秘密の値は、Git・イメージ・ログに置かない。鍵は配列で持ち、「署名は最初、確かめは全部」で取り替える。
- `trust proxy` は前のプロキシの段の数。`X-Forwarded-For` は自分のプロキシが足した部分だけを信じる。`/healthz` は生きているか、`/readyz` は頼みを受けられるか。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- The Twelve-Factor App（日本語訳）: https://12factor.net/ja/
- Node.js「Command-line API」（`--env-file`・`--env-file-if-exists`）: https://nodejs.org/api/cli.html
- Node.js `util.parseEnv`: https://nodejs.org/api/util.html#utilparseenvcontent
- Express「Production Best Practices: Performance and Reliability」: https://expressjs.com/en/advanced/best-practice-performance.html
- Express「Production Best Practices: Security」: https://expressjs.com/en/advanced/best-practice-security.html
- Express「Express behind proxies」: https://expressjs.com/en/guide/behind-proxies.html
- MDN「X-Forwarded-For」: https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/X-Forwarded-For
- MDN「Strict-Transport-Security」: https://developer.mozilla.org/ja/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- Flask「Deploying to Production」: https://flask.palletsprojects.com/en/stable/deploying/
- OWASP「Secrets Management Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

前の部: [第11部 テストとコード品質](../../part11-testing/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次の章: [第61章 Docker でコンテナ化](../ch61-docker/README.md)
