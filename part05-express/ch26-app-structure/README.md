# 第26章 アプリケーションの構成

第25章までで、ルートの書き方と API の決めごとが分かりました。でも、ルートの数が増えると、1つのファイルに確かめ・決まり・データ・ログが全部入って、読むのもテストするのも大変になります。この章では、アプリを**層**に分け、使うものを**外から渡す**形にします。あわせて、本番で動かすときに必ず要る「設定と環境変数」「ログ」「ヘルスチェック」「きれいな止め方」を扱います。

ここで作る形は、第5部の成果物から第12部まで、ずっと使い続けます。第6部でデータの置き場所をメモリから PostgreSQL に変えるときも、ルートとサービスは、ほとんど変えずに済みます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第23〜25章、第3部 第15章（`process`・環境変数・シグナル）、第4部 第17章（`server.close`） |
| この章のゴール | ルート・サービス・データの層の役目を説明し、分けて書ける / 使うもの（データ・時計・設定）を外から渡し、テストで偽物に差し替えられる / 設定を環境変数から読み、起動するときに確かめられる / 1行1つの JSON のログを、秘密を隠して書ける / ヘルスチェックを作り、SIGTERM できれいに止められる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`service-split.mjs`・`config-check.mjs`・`pino-log.mjs`・`graceful.mjs`）と、1つに全部書いた例、層に分けた例、設定、ログ、止め方を確かめるプログラム |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題5〜8は、成果物でも使います） |

> **読み方**
> - この章のコマンドは、すべて `~/dev/part05/ch26-app-structure/` で実行します（第23章で `setup-part05.sh` を動かして、`~/dev/part05` を作ってあります）。
>
>   ```sh
>   $ cd ~/dev/part05/ch26-app-structure
>   ```
>
> - 「**手を動かす**」の所は、新しいファイルに書いて動かしてください。ファイルの完成形は `samples/` にあります。「中身は読まなくてよい」と書いたサンプルは、動かして結果を見るだけで十分です。
> - 「手を動かす」のサーバは 9337 番を使います。次のサーバを動かす前に `Ctrl+C` で止めてください。`curl` は別のターミナルで打ちます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ルート・サービス・データの層（2・3節） | 成果物のタスク API、第6部（データの層を PostgreSQL に変える） |
| 使うものを外から渡す（4節） | 第5部からのすべてのテスト、成果物 |
| 設定と環境変数（5節） | 成果物、第10部（秘密の扱い）、第12部 第60章（本番の設定） |
| JSON のログ（6節） | 成果物、第12部 第66章（ログを集める） |
| ヘルスチェックと止め方（7・8節） | 成果物、第12部（Docker・PaaS で動かす） |

---

## 1. Flask ではどう分けていたか

Flask で少し大きなアプリを作ると、次のような形にすることが多いです。

```python
# app/__init__.py
def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])   # 設定をクラスから読む
    db.init_app(app)                              # 拡張（データベースなど）をつなぐ
    from .tasks import bp as tasks_bp
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')   # ルートのまとまりを登録
    return app
```

- **アプリファクトリ**（`create_app`）は、アプリを作って返す関数です。モジュールを読み込んだだけでアプリができるのではなく、呼ぶたびに新しいアプリを作ります。テストでは、テスト用の設定で `create_app('testing')` を呼べます
- **Blueprint** は、ルートのまとまりです（Express の `Router` にあたります。第24章 7節）
- **`app.config`** は、設定を入れる辞書です。クラスや環境変数から読みます
- Flask 自体には「サービスの層」という決まりはありません。ビュー関数の中に決まりを書くことも、別のモジュールに出すこともできます

この章の Express の形も、考え方は同じです。`createApp({ service })` がアプリファクトリ、`createTasksRouter` が Blueprint にあたります。違うのは、データベースなどを「拡張としてアプリにつなぐ」のではなく、**関数の引数で渡す**ところです。

## 2. 1つのハンドラに全部書くと

[samples/fat-route.mjs](samples/fat-route.mjs) は、タスクを作るハンドラに、何もかも書いた例です。

```js
const tasks = [];                                       // データ
app.post('/api/tasks', (req, res) => {
  const limit = Number(process.env.MAX_TASKS ?? 100);   // 設定
  const title = req.body.title.trim();                  // 形の確かめ
  if (title === '' || title.length > 100) return res.status(422)…;   // 決まりと HTTP
  const today = new Date().toISOString().slice(0, 10);  // 時刻
  if (tasks.some((t) => t.title === title)) return res.status(409)…; // 決まり
  tasks.push(task);                                     // データ
  console.log(`作りました ${req.get('authorization')}`); // ログ
  res.status(201)…;                                     // HTTP
});
```

動きは正しいのですが、次のことが難しくなります。

- **テスト**: 時刻（`new Date()`）、データ（モジュールの変数）、設定（`process.env`）を、テストから決められません。「締め切りが今日なら通る」を試すにも、サーバを起動して `fetch` するしかありません
- **使い回し**: 「同じ題名は作れない」という決まりを、CSV を読み込むコマンドや、第12部のバックグラウンドジョブから使えません。決まりが `req` と `res` の中にあるからです
- **差し替え**: データの置き場所を PostgreSQL に変えると、決まりの行と、データの行が混ざっているので、全部を読み直すことになります

これをほどくのが、次の2節です。練習問題4で、1行ずつ「どの仕事か」を分けてみます。

## 3. 3つの層に分ける

[samples/layered/](samples/layered/) は、同じものを3つの層に分けたものです。

```text
HTTP のリクエスト
   │
   ▼
ルート（routes/）        req を読んで形を確かめる → サービスを呼ぶ → 応答の形にする
   │  service.create({ title, dueDate })
   ▼
サービス（services/）    仕事の決まり（題名が重ならない、締め切り、上限）
   │  repo.list()、repo.insert(…)
   ▼
データ（repositories/）  どう覚えるか（メモリの Map、後で PostgreSQL）
```

| 層 | 知っていること | 知らないこと |
| --- | --- | --- |
| ルート | HTTP（`req`・`res`・ステータス・ヘッダ）、ボディやクエリの形 | 仕事の決まり、データの置き場所 |
| サービス | 仕事の決まり | HTTP、データの置き場所 |
| データ | 覚え方（SQL、`Map`） | 仕事の決まり、HTTP |

決まりごとは2つです。

- **依存は上から下への一方向**: ルートはサービスを呼び、サービスはデータの層を呼びます。逆は呼びません。サービスのファイルは `express` を import しません
- **サービスのエラーは仕事の言葉で**: サービスは「404」ではなく「`NotFoundError`（無い）」を投げます。HTTP のステータスに読み替えるのは、ルートの側（エラーハンドラ）の1か所だけです

```js
// services/task-service.mjs
if (all.some((x) => x.title === t && x.status !== 'done')) throw new ConflictError('同じ題名の、終わっていないタスクがあります');

// app.mjs（読み替えはここだけ）
if (err instanceof ConflictError) return res.status(409).json({ error: 'conflict', detail: err.message });
```

**形と決まりの境目**: 「`title` は文字列か」「知らない項目は無いか」は HTTP の形の話なので、ルートで確かめます。「`title` は空白を取って 1〜100 文字」は仕事の決まりなので、サービスで確かめます。コマンドから呼ばれても、同じ決まりが守られるようにするためです。

層の名前は、本や会社によって違います（コントローラ・ユースケース・モデル・リポジトリ・ドメインなど）。大事なのは名前ではなく、「HTTP」「決まり」「覚え方」が混ざらないことです。小さなアプリなら2つの層（ルートとサービス）でも十分です。

## 4. 使うものを外から渡す

### 4.1 引数で受け取る

サービスは、データの層と時計を、自分で作らずに**引数で受け取ります**。

```js
export function createTaskService({ repo, clock, maxTasks = 100 }) {
  return {
    async create({ title, dueDate }) {
      const today = clock().toISOString().slice(0, 10);   // new Date() ではなく clock()
      …
      return repo.insert({ …, createdAt: clock().toISOString() });
    },
  };
}
```

これを**依存性の注入**（dependency injection）と呼びます。難しい名前ですが、していることは「使うものを引数で渡す」だけです。Express のアプリも同じように、サービスを受け取って作ります。

```js
// app.mjs — listen しない。アプリを作って返すだけ
export function createApp({ service }) { … }

// server.mjs — ここだけが「本物」を選んで、つなぐ
const repo = createMemoryTaskRepo();
const service = createTaskService({ repo, clock: () => new Date(), maxTasks: config.maxTasks });
createApp({ service }).listen(config.port, config.host);
```

本物を選んでつなぐ場所（`server.mjs`）を、**コンポジションルート**と呼びます。`process.env` を読むのも、`new Date` を渡すのも、ここだけにします。

**手を動かす**: データの層とサービスの層を分け、使うもの（`repo` と `now`）を外から渡す `service-split.mjs` を作ります。サーバは起動しません（完成形は [samples/service-split.mjs](samples/service-split.mjs)）。

```js

// データの層: 保存だけをする。ここではメモリの Map
function createMemoryRepo() {
  const rows = new Map();
  let nextId = 1;
  return {
    insert(task) {
      const row = { id: nextId++, ...task };
      rows.set(row.id, row);
      return row;
    },
    findById(id) {
      return rows.get(id) ?? null;
    },
  };
}

// サービスの層: 決まり（題名の長さ、作った時刻）を書く。HTTP も Express も知らない
function createTaskService({ repo, now }) {
  return {
    create(title) {
      const t = title.trim();
      if (t === '' || t.length > 100) throw new Error('title は 1〜100 文字です');
      return repo.insert({ title: t, createdAt: now().toISOString() });
    },
    get(id) {
      return repo.findById(id);
    },
  };
}

// 使うもの（repo と now）を外から渡す
const service = createTaskService({
  repo: createMemoryRepo(),
  now: () => new Date('2026-11-09T09:00:00Z'), // 決まった時刻にすると、結果がいつも同じ
});

console.log(service.create('  牛乳を買う '));
console.log(service.get(1));
try {
  service.create('   ');
} catch (err) {
  console.log('間違い:', err.message);
}
```

```sh
$ node service-split.mjs
{ id: 1, title: '牛乳を買う', createdAt: '2026-11-09T09:00:00.000Z' }
{ id: 1, title: '牛乳を買う', createdAt: '2026-11-09T09:00:00.000Z' }
間違い: title は 1〜100 文字です
```

- `createTaskService` は、`repo` と `now` を引数で受け取ります。中で `new Map()` や `new Date()` を書いていません。
- `now` に決まった時刻を返す関数を渡したので、何回動かしても `createdAt` が同じになります。テストで偽物を渡すのと同じ考え方です。
- `...task` は、`task` の中身をそのまま新しいオブジェクトに入れる書き方です（第3部 第11章）。
- サービスは `Error` を投げるだけで、ステータスコードを知りません。HTTP に直すのはルートの仕事です（練習問題8）。

### 4.2 テストで偽物を渡す

外から渡せるので、テストでは偽物を渡せます。

```js
const clock = () => new Date('2026-11-05T09:00:00.000Z');   // 止まった時計
const service = createTaskService({ repo: createMemoryTaskRepo(), clock, maxTasks: 2 });
await assert.rejects(service.create({ title: 'a', dueDate: '2026-11-04' }), ValidationError);
```

- サービスのテストは、HTTP もサーバも使わないので速く、失敗したときに場所がすぐ分かります（[layered/task-service.test.mjs](samples/layered/task-service.test.mjs)）
- ルートのテストは、「呼ばれ方を覚える偽物のサービス」を渡して、HTTP の形だけを確かめます（練習問題8）
- 全部をつないだテスト（本物のサービスとデータの層で、HTTP から）も、少しは書きます。成果物のテストがそれです

Flask では、`unittest.mock.patch` で `datetime.now` などを差し替えることが多いと思います。JavaScript でも、`node:test` の `mock.timers` で `Date` を差し替えられます。ただ、引数で渡す形にしておくと、差し替えの仕組みを使わずに済み、「このサービスは時計を使う」ことが引数を見るだけで分かります。

## 5. 設定と環境変数

### 5.1 設定は環境変数で渡す

ポート、ログのレベル、データベースの接続先、秘密の鍵のように、**動かす場所によって変わる値**は、コードに書かずに環境変数で渡します（The Twelve-Factor App という考え方の1つです）。

- 同じコード（同じ Docker のイメージ）を、開発・テスト・本番で、設定だけ変えて動かせる
- 秘密の値（鍵、パスワード）を Git に入れずに済む

### 5.2 起動するときに1回だけ確かめる

`process.env` の値は、いつも**文字列か `undefined`** です。あちこちで `Number(process.env.PORT) || 3000` と書くと、次のことが起きます。

- `PORT=abc` の打ち間違いが、黙って 3000 になる
- `SESSION_SECRET` を本番で設定し忘れても、`|| 'secret'` の既定の値で動いてしまう
- どの環境変数を使っているのかが、コード全体を探さないと分からない

そこで、起動するときに1回だけ、zod でまとめて確かめます（[samples/config-demo.mjs](samples/config-demo.mjs)。`node samples/config-demo.mjs` で動かします。中身は読まなくてよい）。

```js
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^[0-9]{1,5}$/).transform(Number).pipe(z.number().max(65535)).default(3000),
  SESSION_SECRET: z.string().min(32).optional(),
});

export function loadConfig(env = process.env) {
  const r = Env.safeParse(env);
  if (!r.success) throw new ConfigError(…);   // 名前と理由だけ。値は書かない
  return Object.freeze({ env: r.data.NODE_ENV, port: r.data.PORT, … });
}
```

- **間違っていたら起動しない**（fail fast）。動いてから変なことが起きるより、起動の時点で止まるほうが、原因がすぐ分かります
- **エラーに値を書かない**。秘密の値が、ログや CI の画面に残らないようにします
- **秘密には既定の値を持たせない**。開発では無くてもよく、本番では必須、のように決めます
- 設定は `loadConfig` の戻り値として、コンポジションルートから各部品に渡します。サービスやルートの中で `process.env` を読みません

```sh
$ node samples/config-demo.mjs
$ PORT=abc LOG_LEVEL=loud node samples/config-demo.mjs
設定が正しくありません:
  PORT: 0〜65535 の整数
  LOG_LEVEL: 無効な選択: …
```

**手を動かす**: 環境変数を1回だけ確かめる `config-check.mjs` を作ります。サーバは起動しません（完成形は [samples/config-check.mjs](samples/config-check.mjs)）。

```js
import { z } from 'zod';

z.config(z.locales.ja()); // 既定の文を日本語にする

const Env = z.object({
  PORT: z.string().regex(/^[0-9]{1,5}$/, '0〜65535 の整数').transform(Number).pipe(z.number().max(65535)).default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const r = Env.safeParse(process.env);
if (!r.success) {
  console.error('設定が正しくありません:');
  for (const issue of r.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`); // 名前と理由だけ。値は書かない
  }
  process.exitCode = 1;
} else {
  const config = Object.freeze({ port: r.data.PORT, logLevel: r.data.LOG_LEVEL });
  console.log('設定:', config);
}
```

```sh
$ node config-check.mjs
設定: { port: 3000, logLevel: 'info' }
$ PORT=abc LOG_LEVEL=loud node config-check.mjs
設定が正しくありません:
  PORT: 0〜65535 の整数
  LOG_LEVEL: 無効な選択: "error"、"warn"、"info"、"debug"のいずれかである必要があります
```

- `PORT=abc LOG_LEVEL=loud node …` のように、コマンドの前に `名前=値` を並べると、そのコマンドの間だけ環境変数が決まります（第3部 第15章）。
- 何も決めなければ `.default(…)` の値になります。`PORT` の既定は、文字列ではなく数の `3000` です。
- エラーの文には、`abc` や `loud` という値を入れていません。秘密の値を間違えたときに、画面やログに残らないようにするためです。
- `process.exitCode = 1` で、終了コードを 1（失敗）にしています。`echo $?` で確かめられます。

### 5.3 .env ファイルと `--env-file`

開発のときに毎回 `PORT=… node …` と打つのは大変なので、`.env` ファイルに書いておき、Node.js の `--env-file` で読みます（Node.js 20.6 から。Flask の `python-dotenv` や `.flaskenv` にあたります）。

```sh
$ node --env-file=.env server.mjs
```

| ファイル | 中身 | Git に入れるか |
| --- | --- | --- |
| `.env.example` | 使う名前の一覧と、開発用の見本の値 | 入れる |
| `.env` | 自分の Mac での本物の値 | 入れない（`.gitignore` に書く） |

- 本番では `.env` ファイルを使わず、PaaS の設定画面や、秘密を入れておく仕組みから環境変数で渡します（第12部 第60章）
- `--env-file` で読んだ値より、シェルで先に設定してある環境変数のほうが優先されます
- `dotenv` というパッケージも広く使われています。Node.js 20.6 より前からある方法です

## 6. ログ

### 6.1 1行1つの JSON

`console.log('タスクを作りました', id)` のような文のログは、人が1行ずつ読むには便利ですが、本番では次のことができません。

- 「このリクエストのログだけ」を集める
- 「500 が1分に何回あったか」を数える
- 「1秒以上かかったリクエスト」を探す

そこで、ログを**1行1つの JSON**（構造化ログ）で書き、ログを集める仕組み（第12部 第66章）で探したり数えたりします。Node.js では **pino** がよく使われます。

```js
import pino from 'pino';
const logger = pino({ level: config.logLevel, redact: ['req.headers.authorization', 'req.headers.cookie'] });

logger.info({ port: 9332 }, '起動しました');
// {"level":30,"time":1793907891438,"pid":4077,"hostname":"mac","port":9332,"msg":"起動しました"}
```

| レベル | 使う場面 |
| --- | --- |
| `fatal`（60） | 続けられないので、終わる |
| `error`（50） | 失敗した（500、つながらない）。誰かが見るべき |
| `warn`（40） | 客の間違い（4xx）、気になること |
| `info`（30） | ふつうの出来事（起動、リクエスト） |
| `debug`（20） | 調べるときだけ見たいこと |

`level` より低いものは書かれません。本番は `info`、調べるときだけ `debug` にします。

### 6.2 リクエストごとの id と子のロガー

1つのリクエストの中で、ルート・サービス・データの層がそれぞれログを書くと、どれが同じリクエストのものか分からなくなります。リクエストごとに id を決め、**子のロガー**に持たせます（[samples/logging-demo.mjs](samples/logging-demo.mjs)。`node samples/logging-demo.mjs` で動かします。中身は読まなくてよい）。

```js
app.use((req, res, next) => {
  req.id = validId(req.get('x-request-id')) ?? crypto.randomUUID();
  res.set('X-Request-Id', req.id);              // 客にも返す。問い合わせのときの手がかり
  req.log = logger.child({ reqId: req.id });    // ここから書くログには、いつも reqId が付く
  res.once('close', () => req.log.info({ status: res.statusCode, … }, 'request'));   // 応答の後に1行
  next();
});
```

500 の応答の本文に `requestId` を入れておくと、客から「このエラーが出ました」と言われたときに、その id でログを探せます。第25章で「500 では中の文を見せない」とした分、ログで追えるようにしておきます。

**手を動かす**: pino で、リクエストごとの id を付けたログを書く `pino-log.mjs` を作ります（完成形は [samples/pino-log.mjs](samples/pino-log.mjs)）。

```js
import crypto from 'node:crypto';
import express from 'express';
import pino from 'pino';

const PORT = 9337;
const logger = pino({ level: 'info' });
const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  req.log = logger.child({ reqId: req.id }); // ここから書くログには、いつも reqId が付く
  const start = performance.now();
  res.once('close', () => {
    req.log.info({ method: req.method, path: req.path, status: res.statusCode, ms: Math.round(performance.now() - start) }, 'request');
  });
  next();
});

app.get('/hello', (req, res) => {
  req.log.debug('debug は level が info なので書かれない');
  req.log.info({ name: 'alice' }, 'あいさつします');
  res.json({ message: 'こんにちは' });
});

app.listen(PORT, '127.0.0.1', () => logger.info({ port: PORT }, '起動しました'));
```

```sh
$ node pino-log.mjs
# 別のターミナルで
$ curl -i http://127.0.0.1:9337/hello
HTTP/1.1 200 OK
X-Request-Id: e18de592-5e48-4d1a-8c7b-5fd4bc916f73
...
{"message":"こんにちは"}
```

サーバのターミナルには、次のように出ます（`time` と id は毎回違います）。

```text
{"level":30,"time":1794251104865,"pid":18656,"hostname":"mac","port":9337,"msg":"起動しました"}
{"level":30,"time":1794251105771,"pid":18656,"hostname":"mac","reqId":"e18de592-5e48-4d1a-8c7b-5fd4bc916f73","name":"alice","msg":"あいさつします"}
{"level":30,"time":1794251105777,"pid":18656,"hostname":"mac","reqId":"e18de592-5e48-4d1a-8c7b-5fd4bc916f73","method":"GET","path":"/hello","status":200,"ms":6,"msg":"request"}
```

- 2行目と3行目は、同じ `reqId` を持っています。`logger.child({ reqId })` で作った子のロガーで書いたからです。
- `req.log.debug(…)` の行は出ていません。`level: 'info'` より低いからです。
- `crypto.randomUUID()` は、ぶつからない id（UUID）を作ります。
- ログの1つ目の引数（オブジェクト）が JSON の項目になり、2つ目の引数（文字列）が `msg` になります。

### 6.3 ログに書かないもの

- パスワード、トークン、Cookie、`Authorization` ヘッダ、セッションの ID
- URL のクエリに入った秘密（パスワードの再設定の `token` など。第24章 練習問題6）
- 必要以上の個人の情報（メールアドレス、住所）

pino の `redact` は、決めた場所の値を、書く前に置き換えます。ログは多くの人が読める場所に長く残るので、「書いてから消す」ことはできないと考えます。

## 7. ヘルスチェック

ロードバランサや PaaS は、アプリが元気かを、決まった URL に定期的にリクエストを送って確かめます。

| URL | 意味 | 失敗したら |
| --- | --- | --- |
| `/healthz`（liveness） | プロセスが動いていて、返事ができるか | プロセスを作り直す |
| `/readyz`（readiness） | 新しいリクエストを受けてよいか | そのプロセスには送らない（作り直しはしない） |

- `/healthz` は、ほかのもの（データベース）を確かめません。データベースが止まっただけで、全部のプロセスが作り直されると、かえって困るからです
- `/readyz` は、止める途中や、データベースにつながっていないときに 503 を返します
- 名前の最後の `z` は、ほかの URL とぶつからないための、Kubernetes などでよく使われる慣習です。`/health` でもかまいません
- ヘルスチェックはとても多く呼ばれるので、アクセスログから外すこともあります

## 8. きれいに止める（graceful shutdown）

### 8.1 SIGTERM

PaaS や Docker は、新しい版を出すときや、台数を減らすときに、古いプロセスに **SIGTERM** というシグナルを送ります（第3部 第15章）。何も書かなければ、Node.js は SIGTERM ですぐに終わり、処理中のリクエストは途中で切れます。`process.on('SIGTERM', () => process.exit(0))` と書いても同じです。

きれいに止めるには、次の順番にします（[samples/shutdown-demo.mjs](samples/shutdown-demo.mjs)。`node samples/shutdown-demo.mjs` で動かします。中身は読まなくてよい）。

```text
SIGTERM
  │ 1. /readyz を 503 にする（ロードバランサが、新しいリクエストを送らなくなる）
  │ 2. 少し待つ（ロードバランサが気づくまでの間も、リクエストは来る）
  │ 3. server.close() — 新しい接続を断る。処理中のリクエストは最後まで返す
  │ 4. 全部終わったら、データベースなどを閉じて、終了コード 0 で終わる
  └ 5. それでも決めた時間内に終わらなければ、あきらめて終了コード 1
```

```js
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  ready = false;
  setTimeout(() => process.exit(1), config.shutdownDelayMs + config.shutdownTimeoutMs).unref();
  setTimeout(() => {
    server.close(() => {
      // ここで DB の接続などを閉じる
      process.exitCode = 0;
    });
  }, config.shutdownDelayMs);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C
```

- `server.close()` は、新しい接続を断り、処理中のものが全部終わったらコールバックを呼びます。Node.js 19 からは、何もしていない keep-alive の接続も自分で切ります
- 時間切れのタイマーは `unref()` します。そうしないと、そのタイマー自体が、プロセスを終わらせなくしてしまいます
- `process.exit()` は、書きかけのログを捨てることがあります。ふだんは `process.exitCode` を決めて、自然に終わるのを待ちます

**手を動かす**: Ctrl+C（SIGINT）や SIGTERM を受け取ったら、処理中のリクエストを返し終えてから止まる `graceful.mjs` を作ります（完成形は [samples/graceful.mjs](samples/graceful.mjs)）。

```js
import express from 'express';

const PORT = 9337;
const app = express();
app.disable('x-powered-by');

let ready = true;
app.get('/readyz', (req, res) => res.status(ready ? 200 : 503).json({ ready }));
app.get('/slow', async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  res.json({ message: '3秒かかる処理が終わりました' });
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  ready = false;
  console.log(`${signal} を受け取りました。処理中のリクエストが終わるのを待ちます`);
  setTimeout(() => {
    console.log('時間切れなので、あきらめて止めます');
    process.exit(1);
  }, 10_000).unref();
  server.close(() => {
    console.log('すべて終わったので止めます');
    process.exitCode = 0;
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

```sh
$ node graceful.mjs
http://127.0.0.1:9337/ で待っています（Ctrl+C で止める）
# 別のターミナルで（3秒かかる）
$ curl -s http://127.0.0.1:9337/slow
# curl が待っている間に、サーバのターミナルで Ctrl+C を押す
```

サーバのターミナルには、次のように出ます。

```text
SIGINT を受け取りました。処理中のリクエストが終わるのを待ちます
すべて終わったので止めます
```

curl には `{"message":"3秒かかる処理が終わりました"}` が返り、その後でサーバが止まります。

- Ctrl+C を押しても、すぐには止まりません。`server.close()` が、処理中の `/slow` が返し終わるのを待つからです。
- 止める途中で `curl http://127.0.0.1:9337/readyz` を打っても、もう新しい接続は受けません。本物では、止める前に少し待って、`/readyz` の 503 をロードバランサに見せます（上の手順の2）。
- `10_000` は `10000` と同じです。`_` は、けたを読みやすくするための区切りです。

### 8.2 Flask では

本番で Flask を動かすときに使う gunicorn は、SIGTERM を受け取ると、ワーカーに「今のリクエストが終わったら止まって」と伝え、決めた時間（gunicorn の `--graceful-timeout`）を過ぎたら強く止めます。この仕事をするのは gunicorn で、Flask のアプリのコードは何もしません。Node.js では、サーバとアプリが同じプロセスなので、アプリのコードの中に書きます。

## 9. フォルダの形

成果物（[../project-task-api/](../project-task-api/)）は、次の形にします。

```text
task-api/
├── package.json
├── .env.example
├── src/
│   ├── server.mjs          起動（コンポジションルート）: loadConfig → logger → repo → service → app → listen → shutdown
│   ├── app.mjs             createApp({ service, logger, config })
│   ├── config.mjs          loadConfig（練習問題5）
│   ├── errors.mjs          NotFoundError など
│   ├── routes/tasks.mjs    createTasksRouter（練習問題8）
│   ├── services/tasks.mjs  createTaskService（練習問題6）
│   ├── repositories/memory-tasks.mjs
│   └── middleware/         requestLogger（練習問題7）、problem（第25章）など
└── test/
```

フォルダを「層」で分ける（`routes/`・`services/`）か、「機能」で分ける（`tasks/routes.mjs`・`tasks/service.mjs`、`users/…`）かは、好みとアプリの大きさで選びます。機能が増えてきたら、機能で分けるほうが、1つの変更で触るファイルが近くにまとまります。

## 10. 第4部・Flask との対応

| やりたいこと | Flask | 第4部 | この章（Express） |
| --- | --- | --- | --- |
| アプリを作る関数 | `create_app()` | `createApp(handler)` | `createApp({ service })` |
| ルートのまとまり | Blueprint | Router | `express.Router()`、`createTasksRouter({ service })` |
| 設定 | `app.config.from_object`、`.flaskenv` | `process.env` を直接 | `loadConfig(process.env)` と zod、`--env-file` |
| ログ | `logging`、`app.logger` | `console.log` | pino、`req.log` |
| リクエストの id | Flask-Request-ID などの拡張 | — | `X-Request-Id` と `logger.child` |
| 止め方 | gunicorn がする | `server.close()`（第17章） | SIGTERM → readyz → `server.close` → 時間切れ |
| 時刻の差し替え | `unittest.mock.patch`、freezegun | — | `clock` を引数で渡す |

## まとめ

- アプリを「ルート（HTTP）」「サービス（仕事の決まり）」「データ（覚え方）」に分ける。依存は上から下への一方向。サービスは HTTP を知らず、エラーは仕事の言葉（`NotFoundError` など）で投げる。
- 形はルートで、決まりはサービスで確かめる。同じことを2か所に書かない。
- 使うもの（データの層、時計、設定）は引数で渡す。本物を選んでつなぐのは `server.mjs` だけ。テストでは偽物を渡す。
- 設定は環境変数で渡し、起動するときに1回だけ zod で確かめる。間違っていたら起動しない。秘密に既定の値を持たせず、エラーに値を書かない。
- ログは1行1つの JSON。リクエストごとの id を子のロガーに持たせ、応答の後にステータスつきで1行書く。秘密は書く前に隠す。
- `/healthz` はプロセスが元気か、`/readyz` は受けてよいか。
- SIGTERM では、ready を下げ、少し待ち、`server.close()` で処理中のものを返し終えてから終わる。時間切れの仕組みも用意する。

## 練習問題

[exercises/README.md](exercises/README.md) に9問あります（基本4問・応用2問・発展3問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Node.js 公式「Command-line API: --env-file」: https://nodejs.org/api/cli.html#--env-fileconfig
- Node.js 公式「server.close()」: https://nodejs.org/api/http.html#serverclosecallback
- Node.js 公式「Signal events」: https://nodejs.org/api/process.html#signal-events
- pino: https://getpino.io/
- pino「Redaction」: https://getpino.io/#/docs/redaction
- The Twelve-Factor App（日本語）「III. 設定」「XI. ログ」「IX. 廃棄容易性」: https://12factor.net/ja/
- Kubernetes「Liveness, Readiness, and Startup Probes」: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- OWASP「Logging Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Flask「Application Factories」: https://flask.palletsprojects.com/en/stable/patterns/appfactories/
- gunicorn「Signal Handling」: https://docs.gunicorn.org/en/stable/signals.html

前の章: [第25章 REST API の設計](../ch25-rest-api-design/README.md) ／ 次の章: [第27章 リアルタイム通信](../ch27-realtime/README.md)
