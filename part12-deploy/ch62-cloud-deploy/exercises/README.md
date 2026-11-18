# 第62章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch62-cloud-deploy/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | `DATABASE_URL` を確かめる | [db-url.ts](db-url.ts)、[db-url.test.ts](db-url.test.ts) | 4.1 |
| 2 | 基本 | http の頼みを https へ | [https-only.ts](https-only.ts)、[https-only.test.ts](https-only.test.ts) | 3 |
| 3 | 基本 | 接続の数の予算 | [pool-budget.ts](pool-budget.ts)、[pool-budget.test.ts](pool-budget.test.ts) | 4.2 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 2〜7 |
| 5 | 応用 | デプロイのワークフロー | deploy.yml（自分で作る）、[deploy-yml.test.ts](deploy-yml.test.ts) | 7 |
| 6 | 応用 | 新しい版が動くまで待つコマンド | [wait-for-version.ts](wait-for-version.ts)、[wait-for-version.test.ts](wait-for-version.test.ts) | 6・7 |
| 7 | 応用 | 止めずにデプロイできないマイグレーションを見つける | [migration-check.ts](migration-check.ts)、[migration-check.test.ts](migration-check.test.ts) | 4.3 |
| 8 | 発展 | 合言葉とヘルスチェックつきの、切り替えるプロキシ | [switch-proxy.ts](switch-proxy.ts)、[switch-proxy.test.ts](switch-proxy.test.ts) | 6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/db-url.ts node --test db-url.test.ts`）。[typecheck.ts](typecheck.ts) は、テストの部品です。書き換えなくてかまいません。

---

## 基本

### 問題1 `DATABASE_URL` を確かめる

[db-url.ts](db-url.ts) に、`inspectDatabaseUrl(url)` を書いてください。デプロイの前に、本番の `DATABASE_URL` の書き間違いを見つけるための関数です。`{ redacted, problems }` を返します。

- `redacted`: パスワードを `***` に替えた URL（パスワードが無ければ、そのまま）
- `problems`: 本番で困る所を、下の文で、この順に入れた配列（無ければ `[]`）

| 調べること | 文 |
| --- | --- |
| `new URL` で読めない | `URL として読めません`（このときだけ `redacted` は `(読めません)`。ほかは調べない） |
| `postgres:` でも `postgresql:` でもない | `postgres:// か postgresql:// で始まっていません` |
| ホストが `localhost`・`127.0.0.1`・`[::1]` | `このコンピュータ（localhost）を指しています` |
| パスワードが無い | `パスワードがありません` |
| パスが `/`（データベースの名前が無い） | `データベースの名前がありません` |
| `sslmode` が無い・`disable`・`allow`・`prefer` | `暗号化しない設定です（sslmode=verify-full にします）` |
| `sslmode` が `require`・`verify-ca` | `` sslmode=（その値） は pg 9 で意味が変わります（verify-full と書きます） `` |

```sh
$ node --test db-url.test.ts      # 書く前は 8 個が失敗
```

ヒント: `new URL(url)` の `protocol`（`postgres:` のように `:` が付く）・`hostname`（IPv6 は `[::1]` のように角かっこが付く）・`password`・`pathname`・`searchParams.get('sslmode')` を使います。`password` に `'***'` を代入すると、`href` が書き換わります。

### 問題2 http の頼みを https へ

[https-only.ts](https-only.ts) に、Express のミドルウェアを返す `httpsOnly({ enabled, exempt })` を書いてください（本文 3節）。アプリは `trust proxy` を設定している前提です。

| 頼み | すること |
| --- | --- |
| `enabled` が `false`、`req.secure` が `true`、パスが `exempt`（既定 `['/healthz', '/readyz']`）にある | `next()` |
| http の `GET`・`HEAD` | `308` で `https://（req.hostname）（req.originalUrl）` へ |
| http のそれ以外（`POST` など） | `400`、本文 `HTTPS で送ってください\n`（`text/plain`） |

```sh
$ node --test https-only.test.ts  # 書く前は 8 個が失敗
```

POST を送り直させないのは、送り直させても、最初のボディはもう暗号化されずに届いてしまっているからです。間違った作りの画面に、400 で早く気づかせます。

### 問題3 接続の数の予算

[pool-budget.ts](pool-budget.ts) に、2つの関数を書いてください（本文 4.2節）。

| 関数 | 返すもの |
| --- | --- |
| `poolMax(budget)` | `(maxConnections − reserved − others) ÷ (instances × processesPerInstance × 重なり)` の切り捨て。重なりは、`overlapDuringDeploy` が `true` なら 2、ほかは 1。1 に満たなければ、`足りません` を含む文で例外 |
| `maxInstances(budget, poolSize)` | `(maxConnections − reserved − others) ÷ (poolSize × processesPerInstance × 重なり)` の切り捨て。0 より小さくならない |

```sh
$ node --test pool-budget.test.ts # 書く前は 7 個が失敗
```

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。

---

## 応用

### 問題5 デプロイのワークフロー

`exercises/` に `deploy.yml` を作ってください。本文の [../samples/github/deploy.yml](../samples/github/deploy.yml) をコピーしてから、次のように直します。

```sh
$ cp ../samples/github/deploy.yml deploy.yml
$ node --test deploy-yml.test.ts  # コピーしただけでは 2 個が失敗（ファイルが無ければ 7 個）
```

- main への push に加えて、Actions の画面から手で動かせるようにする（`on:` に `workflow_dispatch:` を足す）
- `deploy` のジョブは、手で動かすときに別のブランチを選んでもデプロイしないよう、`if: github.ref == 'refs/heads/main'` を付ける
- `deploy` のジョブに、`timeout-minutes` を 15 以下で付ける
- ほかの決まり（`concurrency`・`permissions`・`needs: test`・`environment: production`・Secrets は `env:` で渡す・フックの後で `wait-for-version.ts`）は、そのまま守る

テストは YAML を読んで形を確かめるだけで、GitHub では動かしません。

### 問題6 新しい版が動くまで待つコマンド

[wait-for-version.ts](wait-for-version.ts) の `main(argv)` を書いて、次のコマンドを作ってください（本文 7節の `deploy.yml` の最後で使うもの）。

```sh
$ node wait-for-version.ts <URL> <版> [--timeout 秒] [--interval 秒]
```

- `--timeout` の既定は 300、`--interval` の既定は 5。どちらも小数を受け付ける（テストは `0.05` 秒で動かす）
- URL に GET し、応答が 200 で、JSON の `version` が `<版>` と同じなら、`新しい版 （版） が動いています（N 回目）` と書いて終了コード 0
- 違えば、理由を書いて `--interval` 秒待ち、また聞く。理由は、`待っています: 今の版は （今の版）（N 回目）`、200 以外なら `待っています: 応答 （状態）（N 回目）`、つながらない・JSON でないなら `待っています: つながりません（N 回目）`
- 次に聞く時刻が `--timeout` 秒を過ぎるなら、待たずに、標準エラー出力に `時間切れ: （timeout） 秒たっても版 （版） になりません` と書いて終了コード 1
- URL と版がそろっていない、知らないオプション、秒が 0 より大きい数でない、ときは、標準エラー出力に、理由と `使い方: node wait-for-version.ts <URL> <版> [--timeout 秒] [--interval 秒]` を書いて終了コード 2
- 1回の `fetch` は `AbortSignal.timeout(5000)` で打ち切る

```sh
$ node --test wait-for-version.test.ts   # 書く前は 5 個が失敗
```

ヒント: オプションは `util.parseArgs`（第3部 第16章）で、`type: 'string'` で受けて `Number()` にします。`Number('abc')` は `NaN` で、`NaN > 0` は `false` なので、`!(n > 0)` で「0 より大きい数でない」を1回で調べられます。

### 問題7 止めずにデプロイできないマイグレーションを見つける

[migration-check.ts](migration-check.ts) に、`checkMigration(sql)` を書いてください。マイグレーションの SQL のファイルの中身を受け取り、本文 4.3節の表の書き方を見つけて、`N 文目: 文` の形の配列で返します。

1. `--` から行の終わりまでを捨てる（注釈）
2. `;` で文に分け、前後の空白を除き、空の文は捨てる。小文字にし、続いた空白（改行も）を1つの空白にする
3. それぞれの文に、下の表の決まりを上から順に当て、当てはまったものを全部、文の番号（1 から）と一緒に入れる

| 見つけるもの | 文 |
| --- | --- |
| `drop column` | `DROP COLUMN: 古い版がまだ使っています（後のデプロイで消します）` |
| `rename` | `RENAME: 古い版は古い名前を使っています（足す → 移す → 消す に分けます）` |
| `add column` の後ろ（次の `,` まで）に `not null` があって `default` が無い | `NOT NULL の列を DEFAULT なしで足すと、古い版の INSERT が失敗します` |
| `alter column 列名 type` か `alter column 列名 set data type` | `列の型を変えると、表を書き直す間、読み書きが止まります` |
| `create index`・`create unique index` で、`concurrently` が無い | `CREATE INDEX は、作り終わるまで書き込みを止めます（CONCURRENTLY を付けます）` |
| `drop table` | `DROP TABLE: 古い版がまだ使っています（後のデプロイで消します）` |

```sh
$ node --test migration-check.test.ts    # 書く前は 8 個が失敗
```

ヒント: 正規表現（第4部 第18章）の書き方を3つ足します。

| 書き方 | 意味 |
| --- | --- |
| `\b` | 単語の境目。`/\bdrop\s+column\b/` は `dropcolumn` や `xdrop column` に当たらない |
| `\s+` | 1つ以上の空白（改行も） |
| `/--.*$/gm` | `m` を付けると、`$` が「各行の終わり」に当たる。`g` と合わせて `replace` すると、全部の行の注釈を消せる |

`add column` の決まりは、`[...stmt.matchAll(/\badd\s+column\b[^,]*/g)]` で「`add column` から次の `,` の前まで」を全部取り出し、それぞれに `not null` があって `default` が無いかを調べます（`matchAll` は第61章の練習問題5で使った、当たった所を順に取り出すものです）。

---

## 発展

### 問題8 合言葉とヘルスチェックつきの、切り替えるプロキシ

[switch-proxy.ts](switch-proxy.ts) に、`createSwitchProxy(options)` を書いてください。本文 6節の `switch.ts` を、本番で使えるように守ったものです。まだ `listen` していない `http.Server` を返します。

| 頼み | 応答 |
| --- | --- |
| `/__deploy/` で始まり、`Authorization` が `Bearer （token）` でない | 401 JSON `{ "error": "…" }` |
| `GET /__deploy/status` | 200 JSON `{ "active": "今の名前", "upstreams": ["名前", …] }` |
| `POST /__deploy/switch`、ボディ `{ "to": "名前" }` で、名前が `upstreams` に無い・ボディが JSON でない | 400 JSON `{ "error": "…" }` |
| 同じで、行き先の `healthPath`（既定 `/healthz`）が `healthTimeoutMs`（既定 2000）以内に 200 を返さない（つながらないも） | 409 JSON `{ "error": "…" }`。切り替えない |
| 同じで、行き先が 200 を返した | 切り替えて、200 JSON `{ "active": "新しい名前", "previous": "前の名前" }` |
| それ以外 | 今の行き先（`127.0.0.1` の、その名前のポート）へ、メソッド・パス・ヘッダ・ボディをそのまま渡し、状態・ヘッダ・ボディをそのまま返す。つながらなければ 502 |

- 合言葉は `timingSafeEqual` で比べる（長さが違うと例外になるので、両方を `sha256` のハッシュにしてから比べる。第10部 第52章）
- 切り替えの途中に処理中だった頼みは、もとの行き先のまま最後まで終える（頼みが来たときに、行き先のポートを決めておく）
- 応答の JSON には `Cache-Control: no-store` を付ける

```sh
$ node --test switch-proxy.test.ts       # 書く前は 9 個が失敗
```

ヒント: 渡す部分は、本文の `switch.ts` の `http.request` と `pipe` をそのまま使えます。`switch` のボディは、`req.on('data')` と `req.on('end')` で読みます（第4部 第20章）。
