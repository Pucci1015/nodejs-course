# 第26章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part05/ch26-app-structure/exercises` で実行） |
| --- | --- | --- |
| 1 | [env-values.mjs](env-values.mjs) | `MODULE=../solutions/env-values.mjs node --test env-values.test.mjs` |
| 2 | [health.mjs](health.mjs) | `MODULE=../solutions/health.mjs node --test health.test.mjs` |
| 3 | [mask-url.mjs](mask-url.mjs) | `MODULE=../solutions/mask-url.mjs node --test mask-url.test.mjs` |
| 4 | このページ | — |
| 5 | [config.mjs](config.mjs) | `MODULE=../solutions/config.mjs node --test config.test.mjs` |
| 6 | [task-service.mjs](task-service.mjs)（[errors.mjs](errors.mjs)・[memory-task-repo.mjs](memory-task-repo.mjs) は問題のものと同じ） | `MODULE=../solutions/task-service.mjs node --test task-service.test.mjs` |
| 7 | [request-logger.mjs](request-logger.mjs) | `MODULE=../solutions/request-logger.mjs node --test request-logger.test.mjs` |
| 8 | [tasks-routes.mjs](tasks-routes.mjs) | `MODULE=../solutions/tasks-routes.mjs node --test tasks-routes.test.mjs` |
| 9 | [server.mjs](server.mjs)（問題5・7の解答を使う） | `bash check-server.sh ../solutions/server.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 環境変数の値を確かめる `readPort`・`readLogLevel`

```js
const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

export function readPort(text) {
  if (text === undefined) return { ok: true, value: 3000 };
  if (!/^[0-9]{1,5}$/.test(text)) return { ok: false, error: 'PORT は 0〜65535 の整数です' };
  const port = Number(text);
  if (port > 65535) return { ok: false, error: 'PORT は 0〜65535 の整数です' };
  return { ok: true, value: port };
}

export function readLogLevel(text) {
  if (text === undefined) return { ok: true, value: 'info' };
  if (!LEVELS.includes(text)) return { ok: false, error: `LOG_LEVEL は ${LEVELS.join('・')} のどれかです` };
  return { ok: true, value: text };
}
```

- `Number(text) || 3000` と書くと、`PORT=abc` が黙って 3000 になります。間違いは間違いとして返し、起動を止めます（本文5.2節）。
- 説明に値を入れないのは、同じ書き方を `SESSION_SECRET` のような秘密にも使うためです。

## 問題2 ヘルスチェックの Router

```js
import express from 'express';

export function createHealthRouter({ isReady }) {
  const router = express.Router();

  router.get('/healthz', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  });

  router.get('/readyz', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (isReady()) return res.json({ status: 'ready' });
    res.status(503).json({ status: 'not_ready' });
  });

  return router;
}
```

- `isReady` を値（`true`）ではなく関数で受け取るので、止める途中で変わった状態を、そのときに読めます。
- `/healthz` は何も確かめません。データベースが止まっただけで、プロセスが作り直されないようにするためです（本文7節）。

## 問題3 ログに書く URL の秘密を隠す `maskQuery`

```js
export function maskQuery(url, names = ['token', 'password']) {
  const i = url.indexOf('?');
  if (i === -1) return url;
  const params = new URLSearchParams(url.slice(i + 1));
  const hide = names.map((n) => n.toLowerCase());
  const out = new URLSearchParams();
  for (const [name, value] of params) {
    out.append(name, hide.includes(name.toLowerCase()) ? '***' : value);
  }
  return `${url.slice(0, i)}?${out}`;
}
```

- `url.replace(/token=[^&]*/, 'token=***')` のような書き方は、`xtoken=` まで隠したり、`%74oken=`（`t` をエンコードしたもの）を見逃したりします。`URLSearchParams` で名前と値に分けてから比べます。
- 問題7の `requestLogger` は、同じ考え方で URL を隠してからログに書きます。

## 問題4 1つのハンドラを、層に分けて考える

### 1. それぞれの行の仕事

| 印 | していること | 層 |
| --- | --- | --- |
| [1] | タスクを、モジュールの変数（配列）に覚える | データ |
| [2] | 上限の数を、環境変数からその場で読む | 起動・設定（起動のときに1回読んで、サービスに渡す） |
| [3] | ボディから `title` を取り出し、型を確かめる | ルート（形）とサービス（空白を取る、は決まり） |
| [4] | 「1〜100 文字」の決まりと、422 の応答 | 決まりはサービス、422 という番号はルート（エラーハンドラ） |
| [5] | 「今日」を `new Date()` で決める | サービス。ただし時刻は外から受け取る（`clock`） |
| [6] | 締め切りの決まりと、422 の応答 | 決まりはサービス、番号はルート |
| [7] | 同じ題名の、終わっていないタスクがあるか | サービス（決まり）。探すのはデータの層に頼む |
| [8] | 上限の数を超えていないか | サービス |
| [9] | id・時刻を足して、タスクの形を作る | サービス（時刻は `clock`）。id を決めるのはデータの層 |
| [10] | 覚える | データ |
| [11] | ログを書く | ログ（`req.log`） |
| [12] | 201・`Location`・JSON で返す | ルート |

### 2. テストを書くときに困ること

- **時刻を決められない**: [5] と [9] が `new Date()` を直接呼んでいるので、「締め切りが今日なら通る」「昨日ならだめ」を試すには、テストを動かす日付に合わせて値を書き換えるしかありません。夜中の 0 時をまたぐと、結果が変わることもあります
- **状態をリセットできない**: [1] の配列はモジュールの中にあるので、テストごとに空にできません。前のテストで作ったタスクが残り、順番によって結果が変わります
- **HTTP を通さないと試せない**: 決まりがハンドラの中にあるので、「同じ題名はだめ」を試すだけで、サーバを起動して `fetch` しないといけません。遅く、失敗したときにどこが悪いのか分かりにくくなります
- **設定を変えられない**: [2] は `process.env` を直接読むので、上限を 2 にして試すには、テストの中で `process.env` を書き換えることになります。ほかのテストにも影響します

### 3. CSV を読み込むコマンドから使いたいとき

決まり（[4]・[6]・[7]・[8]）が `req` と `res` の中にあるので、HTTP の無いところからは呼べません。コマンドの中に同じ決まりをもう一度書くと、片方だけ直したときに、Web とコマンドで決まりがずれます。サービスの層に出しておけば、Web のルートもコマンドも、同じ `service.create()` を呼べます。サービスが `HttpProblem` ではなく `ValidationError` を投げるのも、このためです（コマンドに「422」は意味がありません）。

### 4. [11] のログの問題

- **秘密が残る**: `Authorization` ヘッダ（トークン）をそのままログに書いています。ログは多くの人が読める場所に長く残るので、ログを読める人が、そのトークンでなりすませてしまいます
- **読めない・探せない**: ただの文なので、「どのリクエストのログか」（リクエストの id）、「いつ」「どのくらいかかったか」を、後から機械で探したり数えたりできません。1行1つの JSON にして、決まった名前（`reqId`・`status`・`ms`）で書きます

## 問題5 設定を読んで確かめる

[config.mjs](config.mjs) を見てください。

- **`||` の害**: `Number('abc') || 3000` は 3000、`Number('0') || 3000` も 3000 です。打ち間違いに気づけないうえに、正しい値（0）まで捨ててしまいます。`env.SESSION_SECRET || 'secret'` は、本番で設定を忘れても、誰でも知っている鍵で動いてしまいます。「間違っていたら起動しない」ほうが、気づくのが早く、安全です
- **値を書かない**: `SESSION_SECRET=short` のエラーの文に値を書くと、ログやターミナルの履歴、CI の画面に秘密が残ります。名前と理由だけで、直すのには十分です
- **空の文字列**: `.env` の `PORT=` や、`PORT= node server.mjs` は、`''` になります。「書いていない」と同じにしないと、`''` は `^[0-9]+$` に合わないのでエラーになり、驚かせます
- **本番だけの決まり**: zod の `refine` でも書けますが、ほかの項目が全部正しいときにしか動きません（`NODE_ENV` が間違っているときは、そもそも本番かどうかが分かりません）。この解答では、`safeParse` の後に自分で足しました
- **`Object.freeze`**: 設定を、途中で誰かが書き換えると、どこで変わったのかを探すのが大変です。凍らせておけば、書き換えようとした所で（strict モードなら）`TypeError` になります。ES Modules は、いつも strict モードです

## 問題6 サービスの層

[task-service.mjs](task-service.mjs) を見てください。

- **「今日」は日本の日付で**: `clock().toISOString().slice(0, 10)` は UTC の日付です。日本の 11 月 6 日の朝 5 時は、UTC ではまだ 11 月 5 日の 20 時なので、「昨日の締め切り」を受け付けてしまいます。`Intl.DateTimeFormat` に `timeZone` を渡して、その場所の日付を出します。`en-CA` を使うのは、その書き方が `YYYY-MM-DD` だからです
- **時刻は1回の操作で1回読む、とは限らない**: この解答は `clock()` を何回か呼んでいますが、テストの時計は止まっているので同じ値です。本物の時計では、ミリ秒がずれることがあります。そろえたいときは、最初に `const now = clock()` と1回だけ読みます
- **何も変わらなければ version を上げない**: 第25章 7節の ETag は `version` から作ります。同じ値を送っただけで version が上がると、他の人の `If-Match` が 412 になってしまいます
- **WIP 制限**: 「作業中は 3 つまで」は、データの置き場所や HTTP とは関係のない、この仕事の決まりです。こういう決まりこそ、サービスの層に置きます。第6部でデータベースにしたとき、「数えてから変える」の間に別のリクエストが入らないように、トランザクションを使います（第30章）

## 問題7 リクエストのログのミドルウェア

[request-logger.mjs](request-logger.mjs) を見てください。

- **`X-Request-Id` を確かめる**: 前のプロキシ（ロードバランサなど）が付けた id を引き継ぐと、プロキシのログとアプリのログをつなげられます。ただし、客も好きな値を送れるので、形と長さを決めておきます。改行や制御文字が入ると、テキストのログでは偽の行を作られることがあります（JSON のログなら、改行はエスケープされます）
- **子のロガー**: `logger.child({ reqId })` で作ったロガーは、何を書いても `reqId` が付きます。ハンドラやサービスの中のログを、リクエストごとに集められます
- **close で書く**: 第24章 練習問題6と同じです。`finish` は客が先に切ると来ないので、`close` で書き、`res.writableFinished` で見分けます
- **レベルを分ける**: 監視のツールは「error の行が1分に何行」で知らせを出すことが多いので、客の間違い（4xx）を error にすると、知らせがうるさくなりすぎます
- 本物のアプリでは、`pino-http` というパッケージが、ほぼ同じことをしてくれます。成果物では、この章の解答を使います

## 問題8 ルートの層と、エラーの読み替え

[tasks-routes.mjs](tasks-routes.mjs) を見てください。

- **形と決まりを分ける**: ルートの zod は `z.string()` だけで、長さは見ていません。長さは「仕事の決まり」なので、サービスにあります。ルートにも書くと、片方だけ変えたときに、ルートは通すのにサービスは断る（またはその逆）、が起きます。ルートで確かめるのは「サービスに渡せる形か」（文字列か、知らない項目は無いか）だけです
- **読み替えは1か所で**: `mapDomainErrors` は、`problemHandler` の前に置くエラーハンドラです。サービスのエラーを `HttpProblem` にして、`next` で渡します。ルートの中で `try`／`catch` を書かなくてよくなります
- **形の違う id は 404**: `/api/tasks/abc` は「そういうタスクは無い」ので 404 です（400 にする API もあります。第25章 3.3節のとおり、どちらかに決めて説明書に書きます）。サービスは呼びません

## 問題9 設定・ログ・止め方のバグを直す

[server.mjs](server.mjs) を見てください。

| バグ | 起きていたこと | 通る確認 |
| --- | --- | --- |
| `Number(process.env.PORT) \|\| 3000` | `PORT=abc` でも、黙って 3000 で起動する | 1 |
| `SESSION_SECRET \|\| 'secret'` | 本番で設定を忘れても、誰でも知っている鍵で動く | 2, 3 |
| ヘッダを全部ログに書く | トークンや Cookie がログに残る | 7 |
| `console.log` の文のログ | 機械で探せない | 8 |
| リクエストが来た時点でログを書く | ステータスがいつも 200（まだ決まっていない） | 9, 13 |
| `SIGTERM` で `process.exit(0)` | 処理中のリクエストが途中で切れる | 11 |
| `/readyz` がいつも 200 | 止める途中なのに、ロードバランサが新しいリクエストを送り続ける | 10 |
| 時間切れの仕組みが無い（`process.exit` をやめただけだと） | 終わらないリクエストが1つあると、いつまでも止まらない | 14 |

- **止める順番**: 「ready を下げる → 少し待つ → 新しい接続を断る（`server.close`）→ 終わるのを待つ → 終わる」です。待つ（`SHUTDOWN_DELAY_MS`）のは、ロードバランサが `/readyz` の 503 に気づくまでの間も、リクエストが送られてくるからです。この間に接続を断ると、その客はエラーになります
- **`process.exitCode` と `process.exit()`**: `process.exit()` は、書きかけのログ（バッファにあるもの）を捨てて、すぐに終わります。`process.exitCode` を決めて、やることが無くなって自然に終わるのを待つほうが安全です。時間切れのときだけ `process.exit(1)` を使います
- **`unref()`**: 時間切れのタイマーが残っていると、それだけでプロセスが終わらなくなります。`unref()` で「このタイマーのためには、プロセスを残さない」と伝えます
- **keep-alive の接続**: Node.js 19 から、`server.close()` は何もしていない keep-alive の接続を自分で切ります。それより前の版では `server.closeIdleConnections()` を自分で呼ぶ必要がありました。処理中の接続は、応答を返した後に切られます
- 確認12は、直す前から通ります。`process.exit(0)` は終了コード 0 だからです。「0 で終わった」だけでは、リクエストを切ったかどうかは分かりません（確認11）
