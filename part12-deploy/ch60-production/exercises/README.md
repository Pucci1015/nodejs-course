# 第60章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch60-production/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 本番で必須の設定を確かめる | [config.ts](config.ts)、[config.test.ts](config.test.ts) | 2.2 |
| 2 | 基本 | 鍵を取り替えられる署名 | [rotation.ts](rotation.ts)、[rotation.test.ts](rotation.test.ts) | 6.2 |
| 3 | 基本 | プロキシの後ろで、客の IP アドレスを決める | [client-ip.ts](client-ip.ts)、[client-ip.test.ts](client-ip.test.ts) | 7.1〜7.2 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 2〜8 |
| 5 | 応用 | `/healthz` と `/readyz` のルーター | [health.ts](health.ts)、[health.test.ts](health.test.ts) | 8 |
| 6 | 応用 | 落ちたら起動し直す見張り役 | [supervise.ts](supervise.ts)、[supervise.test.ts](supervise.test.ts)、[fixtures/](fixtures/) | 4.2 |
| 7 | 応用 | 本番の Cookie の設定と、名前の頭の決まり | [cookie-rules.ts](cookie-rules.ts)、[cookie-rules.test.ts](cookie-rules.test.ts) | 7.3 |
| 8 | 発展 | `.env.example` と見比べるコマンド | [check-env.ts](check-env.ts)、[check-env.test.ts](check-env.test.ts) | 2.3 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第10部・第11部と同じです。問題4以外は、`○○.ts` の `// ここを書く` の所を書き、`node --test ○○.test.ts` ですべてのテストが通れば完成です。どのテストの最後にも「型: tsc のエラーが無い」があり、書く前でもこれだけは通ります。直す前に失敗するテストの数は、それぞれの問題に書いてあります。

- 模範解答で試すには `MODULE=../solutions/config.ts node --test config.test.ts` のように、`MODULE` に模範解答のファイルを指定します。
- [typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です。書き換えなくてかまいません。

---

## 基本

### 問題1 本番で必須の設定を確かめる

[config.ts](config.ts) に、`loadConfig(env)` を書いてください。本文 2.2節の `config.ts` に、鍵の取り替え（6.2節）と、データベースのつなぎ先を足したものです。

| 環境変数 | 決まり | 無いとき |
| --- | --- | --- |
| `NODE_ENV` | `development`・`test`・`production` のどれか | `development` |
| `PORT` | 数字だけで 0〜65535 | `9807` |
| `SESSION_SECRETS` | カンマ区切り。前後の空白を除き、どれも 32 文字以上 | 本番では必須。それ以外は `[DEV_SESSION_SECRET]` |
| `DATABASE_URL` | `postgres://` か `postgresql://` で始まる | 本番では必須。それ以外は `DEV_DATABASE_URL` |

- 戻り値は `{ env, port, sessionSecrets, databaseUrl }`
- 空の文字列（`.env` に `PORT=` と書いた）は、書かなかったのと同じにする
- 正しくなければ `ConfigError` を投げる。`names` には、正しくなかった名前を**全部**入れる（同じ名前は1つ）。本番で足りないものも、全部集めてから投げる
- エラーのメッセージに、値を入れない

```sh
$ node --test config.test.ts      # 書く前は 8 個が失敗
```

ヒント: zod を使うなら、`safeParse` の `error.issues` の `path[0]` が名前です。`SESSION_SECRETS` は、`.transform` でカンマで分けてから `.pipe(z.array(z.string().min(32)))` で確かめられます（`,,` の空の要素も 32 文字未満なので断られます）。

### 問題2 鍵を取り替えられる署名

[rotation.ts](rotation.ts) に、3つの関数を書いてください。本文 6.2節の `rotate.ts` の `sign`・`unsign` を、どの鍵で合ったかが分かるようにしたものです。署名の部分は、用意してある `mac(値, 鍵)` で作ります。

| 関数 | すること |
| --- | --- |
| `sign(value, keys)` | `値.署名`（署名は `keys[0]` で）。`keys` が空なら例外 |
| `unsign(signed, keys)` | 最後の `.` で分け、`keys` を前から試す。合えば `{ value, keyIndex }`（合った鍵の位置）、どれも合わなければ `undefined` |
| `needsResign(signed, keys)` | 古い鍵（位置が 1 以上）で合ったときだけ `true` |

- 署名を比べるときは `timingSafeEqual` を使う（長さが違うと例外を投げるので、先に長さを比べる）

```sh
$ node --test rotation.test.ts    # 書く前は 7 個が失敗
```

`needsResign` が `true` のとき、アプリは新しい鍵で署名し直した値を、Cookie にして返します。こうすると、手順2（しばらく待つ）の間に、使われている Cookie がだんだん新しい鍵のものに置き換わります。

### 問題3 プロキシの後ろで、客の IP アドレスを決める

[client-ip.ts](client-ip.ts) に、`clientIp({ remoteAddress, forwardedFor, trustedHops })` を書いてください。本文 7.1節で確かめた Express の `trust proxy`（数を渡したとき）と同じ答えを返します。

1. `forwardedFor`（`X-Forwarded-For` の値）をカンマで分け、前後の空白を除き、空のものを捨てる
2. 近い順に並べる: `[remoteAddress, 右端, 右から2つ目, …]`
3. その配列の `trustedHops` 番目（0 から数える）を返す。配列が短ければ、いちばん最後（いちばん遠い、左端）
4. `::ffff:192.0.2.1` のように、IPv4 を写した IPv6 の形は、`192.0.2.1` に直す

```sh
$ node --test client-ip.test.ts   # 書く前は 7 個が失敗
```

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。

---

## 応用

### 問題5 `/healthz` と `/readyz` のルーター

[health.ts](health.ts) に、`createHealthRouter({ checks, timeoutMs, isStopping })` を書いてください。Express の `Router` を返します。本文 8.1節の `health.ts` を、確かめるものを複数にできるようにしたものです。

| 頼み | 応答 |
| --- | --- |
| `GET /healthz` | 200 `{ "status": "ok" }`。`checks` は呼ばない |
| `GET /readyz`（`isStopping()` が `true`） | 503 `{ "status": "stopping" }`。`checks` は呼ばない |
| `GET /readyz`（全部成功） | 200 `{ "status": "ok", "checks": { "db": "ok", "redis": "ok" } }` |
| `GET /readyz`（どれか失敗・時間切れ） | 503 `{ "status": "error", "checks": { "db": "error", "redis": "ok" } }` |

- どちらの応答にも `Cache-Control: no-store` を付ける
- `checks` は**同時に**動かし、それぞれ `timeoutMs` で打ち切る（終わらないものは失敗）
- 失敗の理由は、応答に書かない（ログには書いてよい）

```sh
$ node --test health.test.ts      # 書く前は 6 個が失敗
```

ヒント: 本文の `withTimeout` と、`Promise.allSettled`（第3部 第12章）を組み合わせます。`allSettled` の結果は、渡した配列と同じ順番に並びます。

### 問題6 落ちたら起動し直す見張り役

[supervise.ts](supervise.ts) に、`supervise(options)` を書いてください。本文 4.2節の `supervise.ts` を関数にして、2つの決まりを足したものです。子は `spawn(process.execPath, [script], { env, stdio: 'ignore' })` で起動します。

- 子が終わったら（止めている途中でなければ）、`min(baseDelayMs × 2^n, maxDelayMs)` ミリ秒待って起動し直す。`n` は「続けて落ちた回数」（最初は 0）
- 子が `stableMs` 以上動いてから終わったなら、続けて落ちた回数を 0 に戻してから待ち時間を決める
- 続けて落ちた回数が `maxRestarts` に達していたら、起動し直さずにあきらめる
- `stop()` は、子が動いていれば `SIGTERM` を送って、終わるのを待つ。待っている間（タイマーの途中）なら、タイマーを止める。どちらも、もう起動し直さない
- `done` は、見張りが終わったら `{ reason: 'stopped' | 'gave-up', restarts }`（起動し直した回数の合計）で解決する
- `onEvent` に、次の順で知らせる: 起動したら `{ type: 'start', pid }`、終わったら `{ type: 'exit', code, signal }`、待つ前に `{ type: 'wait', delayMs, restarts: 続けて落ちた回数（足した後）}`、あきらめたら `{ type: 'give-up', restarts }`

```sh
$ node --test supervise.test.ts   # 書く前は 5 個が失敗（子を本当に起動するので、数秒かかる）
```

テストが子として起動するプログラムは [fixtures/](fixtures/) にあります。

ヒント: `done` は、`new Promise` の `resolve` を外の変数に入れておき、終わるところで呼ぶと書けます。`!` は「後で必ず入れる」と TypeScript に伝える書き方です。

```ts
let finish!: (r: SuperviseResult) => void;
const done = new Promise<SuperviseResult>((resolve) => {
  finish = resolve;
});
// …終わるところで finish({ reason: 'stopped', restarts: total });
```

### 問題7 本番の Cookie の設定と、名前の頭の決まり

[cookie-rules.ts](cookie-rules.ts) に、3つの関数を書いてください（本文 7.3節、第4部 第22章 2.2節）。

| 関数 | すること |
| --- | --- |
| `sessionCookie(env)` | 本番: 名前 `__Host-sid`、`{ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }`。開発とテスト: 名前 `sid`、`secure: false`（ほかは同じ） |
| `cookieProblems(name, options)` | 決まりに合わないところを、下の文で、この順に配列にして返す。合っていれば `[]` |
| `hstsHeader(env, maxAgeDays)` | 本番だけ `max-age=秒; includeSubDomains`。ほかは `undefined`。日数が 0 以上の整数でなければ例外 |

`cookieProblems` が返す文:

| 名前・設定 | 文 |
| --- | --- |
| `__Host-` で始まり、`secure` が `false` | `__Host- には Secure が要ります` |
| `__Host-` で始まり、`path` が `/` でない（無いときも） | `__Host- の path は / だけです` |
| `__Host-` で始まり、`domain` がある | `__Host- には domain を付けられません` |
| `__Secure-` で始まり、`secure` が `false` | `__Secure- には Secure が要ります` |
| `sameSite` が `'none'` で、`secure` が `false` | `SameSite=None には Secure が要ります` |

```sh
$ node --test cookie-rules.test.ts   # 書く前は 8 個が失敗
```

---

## 発展

### 問題8 `.env.example` と見比べるコマンド

[check-env.ts](check-env.ts) の `main(argv, env)` を書いて、次のコマンドを作ってください。設定の付け忘れと書き間違いを、デプロイの前に見つけるためのものです。

```sh
$ node check-env.ts .env.example [--env-file .env] [--production]
```

- `.env.example` を `util.parseEnv` で読む。**値が空の名前**（`SESSION_SECRETS=`）を「既定の値が無い＝本番では必須」とみなす
- 確かめる値は、`--env-file` のファイル（あれば）と環境変数 `env` を合わせたもの。同じ名前なら環境変数が勝つ（`node --env-file` と同じ）。空の文字列は、無いのと同じ
- `--env-file` のファイルにあって `.env.example` に無い名前ごとに `[注意] 名前: .env.example に無い名前です（書き間違い?）`（`.env.example` の所は、渡されたファイル名）
- 必須の名前に値が無ければ、`--production` のときは `[NG] 名前: 値がありません（本番では必須）`、無いときは `[注意] 名前: 値がありません（本番では必須）`
- 最後に、`[NG]` があれば `N 件の必須の設定が足りません` と書いて終了コード 1、無ければ `問題ありません` と書いて 0
- **値は、どこにも書かない**
- 使い方の間違い（ファイルの名前が無い、知らないオプション）と、読めないファイルは、標準エラー出力に理由を書いて終了コード 2

```sh
$ node --test check-env.test.ts   # 書く前は 6 個が失敗
```

ヒント: オプションは `util.parseArgs`（第3部 第16章）で読みます。知らないオプションがあると例外を投げるので、`try` で受けて 2 を返します。テストは、`env` に PATH なども渡さずに、コマンドを子プロセスとして動かします。
