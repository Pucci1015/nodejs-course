# 第70章 公開と振り返り

第69章で、会議室の予約のアプリは、計画した機能が全部動くようになりました。この章では、それを「ほかの人が使える・ほかの人が読める」形にします。1つのイメージにまとめ、本番と同じ形を手元のコンテナで動かし、CI とデプロイの設定を書きます。最後に、運用の手順・README・振り返りを書いて、第13部を閉じます。振り返りは、次に自分で作るアプリの計画の出発点になります。

| 項目           | 内容                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 所要時間の目安 | 4〜6 時間（練習問題を除く）                                                                                                                                                          |
| 前提           | 第69章。第11部 第59章（CI）、第12部 第60〜62章（本番の設定・Docker・デプロイ）、第12部 第66章（監視）                                                                                |
| この章のゴール | 自分のアプリを1つのイメージにし、本番と同じ形を手元で動かして外から確かめられる。CI とデプロイの設定を読み書きできる。運用の手順・README・振り返りを書き、次のアプリの計画に生かせる |

| フォルダ                 | 中身                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [samples/](samples/)     | 本文の「手を動かす」で書く小さなスクリプトの完成形（YAML を読む・リンクを並べる）                                                                               |
| [exercises/](exercises/) | 練習問題（8問）                                                                                                                                                 |
| [solutions/](solutions/) | 練習問題の模範解答。この章を終えたときのアプリは、成果物の [../project-room-booking/solutions/](../project-room-booking/solutions/)（第13部の完成形）にあります |

> **読み方**
>
> 第69章の続きです。`main` に戻り、テストが通ることを確かめてから始めます（第69章の練習問題7のブランチで終わっている人は、`git switch main` で戻ってください）。
>
> ```sh
> $ cd ~/dev/room-booking
> $ git switch main
> $ docker compose up -d --wait
> $ npm test                          # 第69章の終わりの 90 個
> $ (cd web && npm test)              # 画面の 24 個
> ```
>
> この章で足すファイルは、どれも第12部の成果物（`project-task-deploy`）に同じ形のものがあります。完成形は `~/dev/part13/project-room-booking/solutions/` にあるので、各節の「手を動かす」では、まず自分で書き、詰まったら見比べてください。
>
> 小さなスクリプト（4.2・5.1・7.2節）は、部のフォルダの `~/dev/part13/ch70-release-retro/` に作ります（YAML を読むパッケージ `yaml` が、部の `node_modules` に入っているため）。
>
> 5節の Render と GitHub Actions は、執筆の環境からは動かしていません。設定のファイルを読んで、手元で確かめられるところまでを確かめます。Render のアカウントが無くても、最後まで進められます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと                                      | 後で使う場所                           |
| ----------------------------------------------------- | -------------------------------------- |
| アプリを1つのイメージにし、本番と同じ形を手元で動かす | 自分で作るアプリの公開                 |
| 外から確かめる（`/healthz`・`/readyz`・`/version`）   | デプロイの後の確かめ、運用の手順       |
| CI とデプロイの設定、「足すだけ」のマイグレーション   | 自分で作るアプリを、止めずに育て続ける |
| 運用の手順・README・振り返り                          | 自分で作るアプリの資料、ポートフォリオ |

---

## 1. 公開までに足すもの

アプリのコードは、第69章で書き終えています。この章で足すのは、コードの外側のファイルです。

| ファイル                                                      | 何のためか                                                     | 元にするもの（第12部の成果物）   | 節  |
| ------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- | --- |
| `.dockerignore`・`Dockerfile`                                 | API と画面を1つのイメージにする                                | 同じ名前のファイル（第61章）     | 2   |
| `compose.prod.yaml`                                           | 本番と同じ形（API・ワーカー・DB・Redis・メール）を手元で動かす | `compose.yaml`（第61章 9節）     | 3   |
| `.github/workflows/ci.yml`                                    | push のたびに、API・画面・E2E を確かめる                       | 同じ名前のファイル（第59章）     | 4   |
| `render.yaml`                                                 | Render に作るもの（サービス・DB・Redis・環境変数）             | 同じ名前のファイル（第62章 8節） | 5   |
| `.github/workflows/deploy.yml`・`scripts/wait-for-version.ts` | `main` に入ったらデプロイし、新しい版が動くまで待つ            | 同じ名前のファイル（第62章 7節） | 5   |
| `docs/runbook.md`                                             | 運用の手順（デプロイ・戻す・管理者・困ったとき）               | （新しく書く）                   | 6   |
| `README.md`・`docs/screenshot.png`                            | 初めて見る人への案内                                           | （新しく書く）                   | 7   |
| `docs/retro.md`                                               | 振り返り（計画と実際・KPT）                                    | （新しく書く）                   | 8   |

第12部のタスク管理のアプリと、会議室の予約のアプリは、同じ土台（`base`）から育てたので、形がほとんど同じです。違うのは、ファイルの保存（S3）が無いことと、ワーカーが「前日のリマインド」を受け持つことです。写すときは、この2つの違いに気をつけます。

---

## 2. イメージを作る

### 2.1 手を動かす: `.dockerignore`

`docker build` は、最初にフォルダの中身を Docker に送ります（**ビルドコンテキスト**。第61章 3.2節）。Mac の `node_modules` や `.env` を送らないように、先に `.dockerignore` を書きます。

`~/dev/room-booking/.dockerignore` を作り、第12部の成果物の `.dockerignore` と同じものを書いてください。完成形は `~/dev/part13/project-room-booking/solutions/.dockerignore` です。

| 書くもの                                | 理由                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `node_modules`・`web/node_modules`      | Mac（arm64）で入れたものは、Linux のイメージで動かないことがある。中で `npm ci` する |
| `.env`・`.env.*`・`!.env.example`       | 秘密の値をイメージに入れない。例のファイルだけは送る                                 |
| `.git`・`coverage`・`test-results` など | 大きく、イメージに要らない。送ると、ビルドが遅くなる                                 |
| `docs`・`e2e`・`test`・`.github`        | イメージの中では使わない（テストは CI で動かす）                                     |

### 2.2 手を動かす: 4つの段階の `Dockerfile`

第12部の成果物と同じ4つの段階にします（第61章 4節）。

| 段階     | すること                                                        | 最後のイメージに残るもの |
| -------- | --------------------------------------------------------------- | ------------------------ |
| `web`    | `web/` で `npm ci` → `npm run build`（型を確かめてから Vite）   | `dist/` だけ             |
| `deps`   | 本番で要るパッケージだけ（`npm ci --omit=dev`）                 | `node_modules/` だけ     |
| `check`  | 全部のパッケージを入れて `tsc --noEmit`。失敗したらビルドも失敗 | `src/`・`scripts/`       |
| （本番） | 上の3つから要るものだけを集め、`USER node` で動かす             | —                        |

`~/dev/room-booking/Dockerfile` を書き、ビルドしてください。

```sh
$ cd ~/dev/room-booking
$ docker build -t room-booking --build-arg APP_VERSION=$(git rev-parse --short HEAD) .
（略）
#24 [stage-3 8/8] COPY --from=web /web/dist ./public
#24 DONE 0.0s
#25 naming to docker.io/library/room-booking:latest done
$ docker image ls room-booking
REPOSITORY     TAG       IMAGE ID       CREATED          SIZE
room-booking   latest    （略）         10 seconds ago   388MB
```

| 書き方                                               | 意味                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `$(git rev-parse --short HEAD)`                      | 今のコミットの ID の頭 7 文字に置き換わる。`/version` で「どの版が動いているか」が分かる                                                               |
| `ARG APP_VERSION=`・`ENV APP_VERSION=${APP_VERSION}` | `--build-arg` で渡さなければ空の文字。アプリの `loadConfig` は空の文字を「書いていない」として扱い、`RENDER_GIT_COMMIT` か `'dev'` を使う（練習問題1） |
| `ENV STATIC_DIR=/app/public`                         | API が、ビルドした画面も配る（第65章 6節）。1つのオリジンなので CORS が要らない                                                                        |
| `HEALTHCHECK … /healthz`                             | プロセスが応答するか。データベースが止まっても、コンテナを作り直さない（練習問題4）                                                                    |

執筆の環境（x86_64 の Linux）では、キャッシュの無い初めてのビルドに約 1 分 13 秒かかりました。2回目からは、変えたところより後の段階だけを作り直すので、ずっと速くなります。Apple Silicon の Mac では、イメージは arm64 で作られます（第61章 8節）。

イメージだけを動かすと、本番（`NODE_ENV=production`）で必須の設定が無いので、すぐに止まります。足りないものの名前を、全部まとめて出すように作ってあるのでした（第60章 2節）。

```sh
$ docker run --rm room-booking
{"level":60,"msg":"設定が正しくありません: SESSION_SECRET（本番では必須）、DATABASE_URL（本番では必須）、REDIS_URL（本番では必須）、METRICS_TOKEN（本番では必須）"}
$ echo $?
1
```

---

## 3. 本番と同じ形を手元で動かす

### 3.1 手を動かす: `compose.prod.yaml`

本番では、API と画面（`app`）・ワーカー（`worker`）・PostgreSQL・Redis・メールの送信サービスが、別々に動きます。これと同じ形を、手元のコンテナで動かすファイルを書きます。開発の `compose.yaml`（PostgreSQL と Redis だけ）とは別のファイルにして、`-f` で選びます。

`~/dev/room-booking/compose.prod.yaml` を書いてください。完成形と見比べるときは、次の表の所を確かめます。

| 所                                                             | 書き方                                                       | 理由                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `name: room-booking-prod`                                      | 開発の `room-booking-dev` と別のプロジェクト                 | 同時に動かしても、コンテナやボリュームの名前がぶつからない                                             |
| `x-app-env: &app-env`                                          | app と worker で同じ環境変数を、アンカー（`&`）で1回だけ書く | 片方だけ直し忘れる、を防ぐ（第61章 9節）                                                               |
| `NODE_ENV: development`                                        | 本番のイメージを、開発の設定で動かす                         | 手元は http なので、本番の Secure の Cookie を express-session が送らず、ログインできない（練習問題4） |
| `WORKER_MODE: separate`                                        | app は仕事を入れるだけ。worker が処理する                    | 本番と同じ分け方。リマインドの決まった時刻も worker が持つ                                             |
| `ports` は app（9913）と mail（9911）だけ                      | DB と Redis は外に出さない                                   | 開発の 5434・6381 とぶつからない（練習問題6）。本番でも DB は外から見えない                            |
| worker の `depends_on: app: service_healthy`                   | app のヘルスチェックが通ってから起動                         | マイグレーションは app が起動するときに動かす。表ができる前に worker が読まないように                  |
| mail は `node:24-bookworm-slim` で `test/support/fake-smtp.ts` | 偽の SMTP サーバ（第53章）                                   | 本物の宛先に送らない。公式のイメージだけを使う                                                         |

### 3.2 手を動かす: 起動する

```sh
$ docker compose -f compose.prod.yaml up -d --build --wait
（略）
 Container room-booking-prod-worker-1 Healthy
 Container room-booking-prod-app-1 Healthy
 Container room-booking-prod-mail-1 Healthy
$ docker compose -f compose.prod.yaml ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
SERVICE   STATUS                    PORTS
app       Up 10 seconds (healthy)   127.0.0.1:9913->9900/tcp
db        Up 13 seconds (healthy)   5432/tcp
mail      Up 14 seconds             127.0.0.1:9911->8025/tcp
redis     Up 13 seconds (healthy)   6379/tcp
worker    Up 5 seconds              9900/tcp
```

| オプション    | 意味                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| `-f ファイル` | 使う compose のファイル（無ければ `compose.yaml`）                          |
| `--build`     | イメージを作り直してから起動する（コードを変えたら付ける）                  |
| `--wait`      | ヘルスチェックが通るまで待ってから戻る。通らなければ、終了コードが 0 でない |
| `--format`    | `ps` の出す列を選ぶ。`table` を付けると、見出しの行も出る                   |

`worker` の PORTS に `9900/tcp` と出るのは、イメージの `EXPOSE 9900` を引き継いでいるからで、外には出ていません。

### 3.3 手を動かす: 外から確かめる

デプロイの後に、外から何を確かめれば「動いている」と言えるかを、先に決めておきます。

```sh
$ curl -s http://127.0.0.1:9913/healthz
{"status":"ok"}
$ curl -s http://127.0.0.1:9913/readyz
{"status":"ready","checks":{"database":"ok","redis":"ok"}}
$ curl -s http://127.0.0.1:9913/version
{"version":"compose"}
$ curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:9913/
200 text/html; charset=utf-8
$ curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9913/api/auth/me
401
```

| 確かめるもの   | 分かること                                           |
| -------------- | ---------------------------------------------------- |
| `/healthz`     | プロセスが動いて、応答できる                         |
| `/readyz`      | データベースと Redis につながる（客を回してよい）    |
| `/version`     | 動いているのが、デプロイした版である                 |
| `/`            | ビルドした画面が配られている（`STATIC_DIR`）         |
| `/api/auth/me` | ログインしていない人は断られる（守りが外れていない） |

この5つを1つのコマンドにするのが、練習問題5の `smoke.ts` です。

次に、ブラウザで http://127.0.0.1:9913 を開き、`alice@example.com` で登録してください。確認のメールは、ワーカーが送ります。

```sh
$ curl -s http://127.0.0.1:9911/api/messages      # 届いたメール（件名「メールアドレスの確認」）。リンクを開いて確認する
$ docker compose -f compose.prod.yaml logs worker --no-log-prefix | tail -1
{"level":30,…,"process":"worker","job":"send-mail","jobId":"2","result":"\"sent\"","msg":"仕事が終わりました"}
$ docker compose -f compose.prod.yaml exec app node scripts/grant-admin.ts alice@example.com
alice@example.com を admin にしました
```

`exec app` は、動いている app のコンテナの中でコマンドを動かします。本番でも、管理者は同じスクリプトで決めます（6節）。会議室を足して予約し、別のブラウザ（シークレットウィンドウ）で `bob@example.com` として同じ日の表を開き、予約が読み直さずに出ることも確かめてください（SSE が、Redis を通して届いている）。

終わったら止めます。

```sh
$ docker compose -f compose.prod.yaml down        # 止める。データベースの中身はボリュームに残る
$ docker compose -f compose.prod.yaml down -v     # 中身も消す（次の up は、空のデータベースから）
```

---

## 4. CI

### 4.1 手を動かす: `ci.yml`

第11部 第59章で、タスク管理のアプリの CI を書きました。同じ3つのジョブにします。

```text
api ─┐
     ├─→ e2e
web ─┘
```

`~/dev/room-booking/.github/workflows/ci.yml` を書いてください。新しく出てくる書き方は、次の表の3つです。

| 書き方                                         | 意味                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `defaults:` `run:` `working-directory: web`    | そのジョブの `run` を、全部 `web/` の中で動かす（1つずつ `cd web &&` を書かなくてよい）     |
| `cache-dependency-path: web/package-lock.json` | `setup-node` のキャッシュのキーにするロックファイル。既定はリポジトリのいちばん上のものだけ |
| `needs: [api, web]`                            | 両方が通ってから動く。片方が失敗したら、E2E は動かない（時間とお金の節約）                  |

`services:` の PostgreSQL と Redis は、開発の `compose.yaml` と同じポート（5434・6381）にします。テストのつなぎ先（`DATABASE_URL` の既定）を変えずに済むからです。

### 4.2 手を動かす: YAML として読んで確かめる

GitHub に push しないと動きを確かめられないので、少なくとも「YAML として読める」「ジョブのつながりが思ったとおり」を、手元で確かめます。部のフォルダに `show-jobs.ts` を作ってください（完成形は [samples/show-jobs.ts](samples/show-jobs.ts)）。

```ts
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';

// 使うところだけの形。needs は1つなら文字、複数なら配列
const Workflow = z.object({
  jobs: z.record(
    z.string(),
    z.object({ needs: z.union([z.string(), z.array(z.string())]).optional(), steps: z.array(z.unknown()) }),
  ),
});

const file = process.argv[2] ?? '.github/workflows/ci.yml';
const { jobs } = Workflow.parse(parse(await readFile(file, 'utf8')));
for (const [name, job] of Object.entries(jobs)) {
  const needs = typeof job.needs === 'string' ? [job.needs] : (job.needs ?? []);
  console.log(`${name}: 手順 ${job.steps.length} 個、待つもの [${needs.join(', ')}]`);
}
```

```sh
$ cd ~/dev/part13/ch70-release-retro
$ node show-jobs.ts ~/dev/room-booking/.github/workflows/ci.yml
api: 手順 5 個、待つもの []
web: 手順 5 個、待つもの []
e2e: 手順 7 個、待つもの [api, web]
```

| 書き方                    | 意味                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `parse(文字)`（`yaml`）   | YAML を JavaScript の値にする（第11部 第59章）。返す型は `any` なので、Zod で確かめてから使う |
| `z.record(z.string(), …)` | キーが自由な名前のオブジェクト（ジョブの名前は自分で決める）                                  |
| `Object.entries`          | `[キー, 値]` の配列。YAML に書いた順に回る                                                    |

インデントを1つ間違えると、`parse` が例外を投げるか、Zod の確かめで止まります。GitHub に送る前に、ここで見つけられます。

---

## 5. デプロイ

> 執筆の環境からは、Render と GitHub Actions で動かしていません。ここに書く項目の名前・プラン・料金は変わることがあるので、必ず公式（https://render.com/docs/blueprint-spec 、https://docs.github.com/actions ）で確認してください。

### 5.1 手を動かす: `render.yaml` を読む

Render の **Blueprint**（第62章 8節）は、作るもの（サービス・データベース・Redis）と環境変数を、1つの YAML に書きます。第12部の成果物の `render.yaml` から、S3 を外し、リマインドの時刻を足したものを `~/dev/room-booking/render.yaml` に書いてください。

| 所                              | 意味                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `envVarGroups`・`fromGroup`     | API とワーカーで同じ値を、グループに1回だけ書いて、両方から使う                             |
| `generateValue: true`           | Render が乱数で作る（`SESSION_SECRET`・`METRICS_TOKEN`）。ファイルにも Git にも値が残らない |
| `sync: false`                   | 値はダッシュボードで入れる（`SMTP_PASS` など、外のサービスの秘密の値）                      |
| `fromDatabase`・`fromService`   | Render が作ったデータベースと Redis のつなぎ先を、そのまま渡す                              |
| `type: worker`・`dockerCommand` | HTTP を待たないサービス。同じイメージで `node src/worker.ts` を動かす                       |
| `preDeployCommand`              | 新しい版に客を回す前に、マイグレーションを1回だけ動かす（6.2節）                            |
| `healthCheckPath: /readyz`      | これが 200 になってから、新しい版に客を回す                                                 |
| `autoDeployTrigger: 'off'`      | push しただけではデプロイしない。CI の後で `deploy.yml` が頼む                              |

環境変数の書き忘れは、デプロイして起動に失敗するまで気づきません。サービスごとに、どの名前が渡るかを並べてみます。部のフォルダに `show-env.ts` を作ってください（完成形は [samples/show-env.ts](samples/show-env.ts)）。

```sh
$ node show-env.ts ~/dev/room-booking/render.yaml
room-booking（web）
  {"fromGroup":"room-booking-shared"}
  {"key":"WORKER_MODE","value":"separate"}
  {"key":"TRUST_PROXY","value":"1"}
  {"key":"DATABASE_URL","fromDatabase":{"name":"room-booking-db","property":"connectionString"}}
  {"key":"REDIS_URL","fromService":{"type":"keyvalue","name":"room-booking-redis","property":"connectionString"}}
room-booking-worker（worker）
  {"fromGroup":"room-booking-shared"}
  {"key":"DATABASE_URL","fromDatabase":{"name":"room-booking-db","property":"connectionString"}}
  {"key":"REDIS_URL","fromService":{"type":"keyvalue","name":"room-booking-redis","property":"connectionString"}}
room-booking-redis（keyvalue）
```

`fromGroup` の先のグループの名前まで広げ、本番で必須の名前（`SESSION_SECRET`・`DATABASE_URL`・`REDIS_URL`・`METRICS_TOKEN`）が全部そろっているかを調べるのが、練習問題3です。

### 5.2 手を動かす: `deploy.yml` と、新しい版を待つ

`main` に入ったときの流れは、第62章 7節と同じです。

```text
main に push → check（npm run check・docker build）→ deploy（デプロイフックを呼ぶ → /version が新しいコミットになるまで待つ）
```

`~/dev/room-booking/.github/workflows/deploy.yml` を書き、待つスクリプトは完成形からコピーします（第12部 第62章 練習問題6の模範解答と同じもの）。

```sh
$ cd ~/dev/room-booking
$ cp ~/dev/part13/project-room-booking/solutions/scripts/wait-for-version.ts scripts/
```

3節の `compose.prod.yaml` を動かしておけば、待つスクリプトを手元で試せます。`compose.prod.yaml` は `APP_VERSION: compose` でビルドしているので、版は `compose` です。

```sh
$ node scripts/wait-for-version.ts http://127.0.0.1:9913/version compose --timeout 30
新しい版 compose が動いています（1 回目）
$ node scripts/wait-for-version.ts http://127.0.0.1:9913/version 3f9c2a1 --timeout 12 --interval 5
待っています: 今の版は compose（1 回目）
待っています: 今の版は compose（2 回目）
待っています: 今の版は compose（3 回目）
時間切れ: 12 秒たっても版 3f9c2a1 になりません
$ echo $?
1
```

`deploy.yml` は、待つ版に `$GITHUB_SHA`（40 文字のコミットの ID）を渡します。`Dockerfile` を `--build-arg` 無しでビルドする Render では、`/version` は `RENDER_GIT_COMMIT`（これも 40 文字）になるので、そのまま比べられます。片方だけを `--short` の 7 文字にすると、同じコミットでも「違う」と判定してしまいます。頭が同じなら同じとみなす比べ方は、練習問題1で書きます。

### 5.3 Render で公開するなら

読むだけでかまいません。実際に公開するときは、次の順に進めます（第62章 4〜8節）。

1. GitHub に、自分のリポジトリ（Private でよい）を作って push する
2. Render のダッシュボードで「New → Blueprint」を選び、リポジトリを選ぶ。`render.yaml` のとおりに作られる
3. `sync: false` の値（SMTP のユーザー名とパスワード）をダッシュボードで入れる
4. 独自ドメインの DNS に CNAME を足す。Render が証明書を取り、HTTPS になる
5. GitHub の Settings → Environments で `production` を作り、Render のデプロイフックの URL を Secrets に入れる（`RENDER_DEPLOY_HOOK_URL`・`RENDER_WORKER_DEPLOY_HOOK_URL`）
6. 画面から登録し、Render の Shell で `node scripts/grant-admin.ts あなたのアドレス` を動かす

有料のプランは、使わなくなったら必ず消してください（第62章 10節）。データベースは、消すと中身も消えます。

---

## 6. 運用の手順

### 6.1 手を動かす: `docs/runbook.md`

**運用の手順**（runbook）は、公開した後に「慌てずに同じ手順をたどる」ための資料です。読むのは、数か月後の自分か、代わりに見る人です。完成形の [docs/runbook.md](../project-room-booking/solutions/docs/runbook.md) と同じ6つの見出しで、`~/dev/room-booking/docs/runbook.md` を書いてください。

| 見出し                | 書くこと                                                                       |
| --------------------- | ------------------------------------------------------------------------------ |
| 1. 置き場所の一覧     | 本番の何が、手元の `compose.prod.yaml` のどれにあたるか                        |
| 2. デプロイする       | ふだんは何もしない。`deploy.yml` の流れと、終わったことの確かめ方              |
| 3. 戻す               | 前の版に戻す手順。マイグレーションは戻さない理由                               |
| 4. 管理者を足す・外す | `grant-admin.ts` と `--revoke`                                                 |
| 5. 困ったとき         | 症状ごとに、まず見るところ（`/readyz`・`errorId`・`/metrics`・`reminder_log`） |
| 6. 定期的にすること   | Dependabot・`npm audit`・請求・鍵の取り替え                                    |

書いたコマンドは、`compose.prod.yaml` で一度ためします。ためしていない手順は、いざというときに動きません。

```sh
$ docker compose -f compose.prod.yaml exec app node scripts/grant-admin.ts alice@example.com
alice@example.com を admin にしました
$ docker compose -f compose.prod.yaml exec app node scripts/grant-admin.ts alice@example.com --revoke
alice@example.com を member にしました
$ curl -s -H 'Authorization: Bearer dev-only-metrics-token-for-compose-0000' http://127.0.0.1:9913/metrics | grep '^http_requests_total' | head -3
http_requests_total{method="GET",route="/healthz",status="200"} 4
http_requests_total{method="GET",route="/readyz",status="200"} 1
http_requests_total{method="GET",route="/version",status="200"} 5
```

`/metrics` の合言葉は、`compose.prod.yaml` に書いた開発用の仮の値です。本番の値（Render が作ったもの）は、runbook にも書きません。

### 6.2 戻せるようにする: マイグレーションは「足すだけ」

Render は、新しい版に客を回す**前に**マイグレーションを動かします。その間も、前の版のコードが動いています。新しい版で困って前の版に戻すときも、データベースは新しいままです。つまり、**新しいマイグレーションの後のデータベースでも、前の版のコードが動く**必要があります。

| 変更                                | 前の版は動くか | 理由                                                                    |
| ----------------------------------- | -------------- | ----------------------------------------------------------------------- |
| 表を足す・NULL を許す列を足す       | 動く           | 前の版は、新しい表や列を読まない                                        |
| `NOT NULL DEFAULT …` の列を足す     | 動く           | 前の版の INSERT は、その列を書かなくても既定の値が入る（003 の `role`） |
| 列を消す・名前を変える・型を変える  | 動かない       | 前の版の SQL が、無い列を読み書きする                                   |
| `NOT NULL` を足す（`DEFAULT` 無し） | 動かない       | 前の版の INSERT が、その列を書かないので断られる                        |

このアプリのマイグレーション 001〜004 は、どれも上の2行に入ります。どうしても名前を変えたいときは、「足す → 両方に書く → 新しいほうを読む → 古いほうを消す」のように、デプロイを分けます（練習問題4の (5)）。マイグレーションの SQL が「足すだけ」かを調べるのが、練習問題8です。

---

## 7. README とポートフォリオ

### 7.1 手を動かす: `README.md` を書き直す

リポジトリの `README.md` は、初めて見る人（採用の担当者や、未来の自分）が最初に読むものです。第67章で書いた README を、完成形の [README.md](../project-room-booking/solutions/README.md) と同じ順の見出しで書き直してください。

| 見出し                | 書くこと                                                   | 気をつけること                                           |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| （1行目と最初の段落） | 何のアプリか。だれの、どんな困りごとを解くか               | 2〜3文で。技術の名前から始めない                         |
| 画面の画像            | `![その日の予約の表](docs/screenshot.png)`                 | 個人の名前やアドレスを写さない（`alice@example.com` で） |
| できること            | だれが・何をできるか（ユーザーストーリーの短い版）         | 要件定義（`docs/requirements.md`）へのリンク             |
| 技術                  | 部分ごとに、使ったものと選んだ理由（ADR へのリンク）       | 「なぜ選んだか」を書く                                   |
| 設計の資料            | `docs/` の一覧                                             |                                                          |
| 動かし方              | 必要なもの、テスト、開発のサーバ、本番と同じ形、ポートの表 | コピーして打てば動くこと。新しいフォルダで試す           |
| ファイル・作った順番  | どこに何があるか。章ごとのコミット                         |                                                          |

画面の画像は、ブラウザで表を開き、Mac の `⌘` + `Shift` + `4` を押してから `Space` を押し、ウィンドウを選んで撮ります（デスクトップに PNG が保存されます）。`docs/screenshot.png` という名前で置いてください。完成形の画像は、Playwright の Chromium で撮りました。

### 7.2 手を動かす: リンクを並べる

README と `docs/` は、リンクでつながっています。ファイルの名前を変えると、リンクが切れても気づきません。部のフォルダに `list-links.ts` を作り、全部の `.md` のリンクを並べてみます（完成形は [samples/list-links.ts](samples/list-links.ts)）。

```ts
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.argv[2] ?? '.';
// recursive: true で、下のフォルダのファイルも、root から見たパスで返る
const names = await readdir(root, { recursive: true });
const mds = names.filter((n) => n.endsWith('.md') && !n.split(path.sep).includes('node_modules')).toSorted();
for (const md of mds) {
  const text = await readFile(path.join(root, md), 'utf8');
  // [文字](行き先) の行き先を、全部取り出す。matchAll は、g の付いた正規表現の、当たったもの全部を返す
  const targets = [...text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  if (targets.length > 0) console.log(`${md}: ${targets.join('  ')}`);
}
```

```sh
$ node list-links.ts ~/dev/room-booking
.github/README.md: workflows/  dependabot.yml
.github/workflows/README.md: ci.yml  deploy.yml
README.md: docs/screenshot.png  docs/requirements.md  docs/adr/0001-stack.md  docs/plan.md  （略）
docs/README.md: requirements.md  screens.md  api.md  data.md  adr/  plan.md  runbook.md  retro.md  screenshot.png
（略）
```

| 書き方                               | 意味                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `readdir(root, { recursive: true })` | 下のフォルダもたどって、全部のファイルとフォルダの名前を返す（Node.js 20 から）     |
| `/\[[^\]]*\]\(([^)\s]+)\)/g`         | `[` → `]` 以外の文字 → `](` → `)` と空白以外の文字（行き先、かっこで取り出す）→ `)` |
| `text.matchAll(正規表現)`            | 当たったもの全部。1つずつの `m[1]` が、かっこで取り出した行き先                     |

行き先のファイルが本当にあるかまで調べ、切れていれば終了コード 1 にするのが、練習問題7の `check-links.ts` です。完成形の `project-room-booking/solutions` では、切れたリンクはありません。

### 7.3 公開する前に見直すこと

リポジトリを Public にする（ポートフォリオとして見せる）なら、次のことを確かめてから公開します。

| 確かめること               | 確かめ方                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| 秘密の値が無い             | `git grep -n -i "password\|secret\|token"` で出たものが、どれも `dev-only-…` の仮の値か  |
| `.env` を入れていない      | `git ls-files                                                                            | grep '^\.env'`が`.env.example` だけ |
| 個人の名前・アドレスが無い | 例は `alice@example.com`。画面の画像も                                                   |
| 履歴にも無い               | 一度コミットした秘密の値は、消しても履歴に残る。値を取り替えてから公開する（第60章 6節） |

---

## 8. 振り返り

### 8.1 手を動かす: 数を集める

振り返りは、感想より先に、数から始めます。テストの数とカバレッジを集めてください（PostgreSQL と Redis を動かしたまま）。

```sh
$ npm run coverage
（略）
ℹ tests 90
ℹ pass 90
ℹ fail 0
ℹ start of coverage report
（略）
ℹ all files             |  92.80 |    82.16 |   86.03 |
ℹ end of coverage report
$ git log --oneline | wc -l       # コミットの数（土台・第67〜69章の 4。この章のコミットで 5 になる）
```

| 列（左から） | 意味                                    |
| ------------ | --------------------------------------- |
| line %       | テストで1回でも動いた行の割合           |
| branch %     | `if` などの分かれ道の、通った向きの割合 |
| funcs %      | 1回でも呼ばれた関数の割合               |

行のカバレッジは、しきい値の 85%（`--test-coverage-lines=85`）を超えています。動いていない行は、多くが「データベースにつながらない」のような、起こしにくい失敗の扱いです。

### 8.2 手を動かす: `docs/retro.md`

形は **KPT**（Keep・Problem・Try）にします。完成形の [docs/retro.md](../project-room-booking/solutions/docs/retro.md) を見る前に、自分で書いてください。

| 見出し                   | 書くこと                                                            |
| ------------------------ | ------------------------------------------------------------------- |
| 1. 計画と実際            | `docs/plan.md` の「終わりの確かめ」を、章ごとに、実際の結果と並べる |
| 2. Keep（続けること）    | うまくいったやり方。「なぜうまくいったか」まで                      |
| 3. Problem（困ったこと） | 困ったこと・原因・どうしたか、の3つの列の表                         |
| 4. Try（次にやること）   | 作らなかった機能、直したい作り。次のアプリでも使えること            |
| 5. 数で見る              | コミット・テストの数・カバレッジ・決まり R1〜R10 の確かめ           |

Problem には、「どう直したか」だけでなく「原因」を書きます。原因が分かれば、次のアプリで同じことを避けられます（例: 日付がずれた原因は、`toISOString()` が UTC の日付を返すこと）。

---

## 9. 自分のアプリへ

### 9.1 第13部の進め方を、自分の題材でなぞる

この部の目的は、会議室の予約を作ることそのものより、「要件 → 設計 → 実装 → テスト → 公開 → 振り返り」の流れを1回通すことでした。自分の題材で作るときは、同じ順に、同じ資料を作ります。

| 段階     | 作るもの                                                                 | この部で見る所 |
| -------- | ------------------------------------------------------------------------ | -------------- |
| 要件     | `docs/requirements.md`（目的・ユーザーストーリー・決まり・作らないもの） | 第67章 3節     |
| 設計     | `docs/screens.md`・`api.md`・`data.md`、ADR                              | 第67章 4〜5節  |
| 計画     | `docs/plan.md`（作る順番と、各段階の終わりの確かめ）                     | 第67章 7節     |
| 決まり   | 純粋な関数と表のテスト、データベースの制約                               | 第67章 6節     |
| API      | データの層 → サービス → ルート、決まりを1つずつ HTTP のテストで          | 第68章         |
| 画面     | API の決まりを画面でも使う、名前で探すテスト、E2E                        | 第69章         |
| 公開     | Dockerfile・compose.prod.yaml・CI・render.yaml・runbook・README          | この章         |
| 振り返り | `docs/retro.md`                                                          | この章 8節     |

最初の題材は、小さく決めてください。目安は「表が 2〜3 個、画面が 3〜4 枚、決まりが 5〜10 個」です。この部の土台（`~/dev/part13/base`）は、ログイン・メール・仕事の列・監視・CI がそろっているので、新しいアプリの出発点に使えます（第67章 2節と同じ手順でコピーする）。Next.js で作りたいときは、第9部の成果物と、第62章 9節の表を出発点にします。

### 9.2 次に学ぶこと

この教材で扱わなかった、次の一歩の候補です。どれも、作りたいものに必要になってからで十分です。

| 話題                                           | どんなときに要るか                                              |
| ---------------------------------------------- | --------------------------------------------------------------- |
| npm workspaces（モノレポ）                     | API と画面で同じコード（`domain/`）を共有したい（この部の Try） |
| OpenTelemetry（分散トレース）                  | サービスが増え、1つのリクエストがどこで遅いかを追いたい         |
| GraphQL                                        | 画面ごとに、要る項目だけを1回で取りたい                         |
| サーバーレス（AWS Lambda・Cloudflare Workers） | 使われる時間が短く、待っている間のお金を払いたくない            |
| Bun・Deno                                      | Node.js 以外の実行環境（Web 標準の API は、第28章のとおり共通） |

---

## 10. 確かめて、コミットする

### 10.1 手を動かす: 全部を通してコミットする

```sh
$ npm run check                   # tsc → ESLint → Prettier → API のテスト 90 個
$ (cd web && npm run check)       # 画面の 24 個
$ npm run e2e                     # 2 個
$ docker compose -f compose.prod.yaml up -d --build --wait && docker compose -f compose.prod.yaml down
$ git add -A
$ git commit -m "第70章 公開と振り返り（Dockerfile・compose.prod.yaml・render.yaml・CI・README・運用の手順・振り返り）"
```

コードは変えていないので、テストの数は第69章の終わりと同じです。`npm run check` の Prettier は、新しく足した YAML と Markdown の書き方も確かめます。

GitHub に自分のリポジトリを作って push すれば、`ci.yml` が動き始めます（第3章 10節）。これで、第13部はおしまいです。

## まとめ

- アプリを1つのイメージにし、`--build-arg` で版を入れる。イメージだけでは、本番で必須の設定が無いと止まる
- 本番と同じ形（API・ワーカー・DB・Redis・メール）を、別の compose のファイルで手元に作り、外から確かめる
- 「動いている」は `/healthz`・`/readyz`・`/version`・画面・守りの5つで確かめる
- CI とデプロイの YAML は、GitHub に送る前に、YAML として読んで形を確かめる
- 環境変数は、サービスごとにグループを広げて、必須のものがそろっているかを見る
- マイグレーションは「足すだけ」にして、前の版に戻せるようにする
- 運用の手順・README・振り返りを書く。振り返りは原因まで書き、次のアプリの計画に生かす

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4・応用2・発展2）。

## 参考資料

- Docker「Multi-stage builds」: https://docs.docker.com/build/building/multi-stage/
- Docker「Compose file reference」（`depends_on` の `condition`）: https://docs.docker.com/reference/compose-file/services/#depends_on
- GitHub Docs「Workflow syntax for GitHub Actions」（`needs`・`defaults`）: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- actions/setup-node「Caching packages dependencies」（`cache-dependency-path`）: https://github.com/actions/setup-node#caching-global-packages-data
- Render「Blueprint YAML Reference」: https://render.com/docs/blueprint-spec
- Node.js「fs.promises.readdir」（`recursive`）: https://nodejs.org/api/fs.html#fspromisesreaddirpath-options
- 『Google の SRE 本』の「Postmortem Culture」（振り返りの考え方）: https://sre.google/sre-book/postmortem-culture/

---

前: [第69章 実装（後半）](../ch69-implementation-web/README.md) ／ 次: [第13部の README](../README.md)（成果物: [project-room-booking](../project-room-booking/README.md)）
