# 第70章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答です。この章を終えたときのアプリは、成果物の [../../project-room-booking/solutions/](../../project-room-booking/solutions/) です。

練習問題の解答を動かすときは、`exercises/` で `MODULE=../solutions/○○` を付けてテストを動かします。

| 問題 | ファイル                                       | 確かめ方（`exercises/` で）                                                        |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | [app-version.ts](app-version.ts)               | `MODULE=../solutions/app-version.ts node --test app-version.test.ts`               |
| 2    | [ci.yml](ci.yml)                               | `MODULE=../solutions/ci.yml node --test ci.test.ts`                                |
| 3    | [missing-env.ts](missing-env.ts)               | `MODULE=../solutions/missing-env.ts node --test missing-env.test.ts`               |
| 4    | このファイルの「問題4」                        |                                                                                    |
| 5    | [smoke.ts](smoke.ts)                           | `MODULE=../solutions/smoke.ts node --test smoke.test.ts`                           |
| 6    | [compose-ports.ts](compose-ports.ts)           | `MODULE=../solutions/compose-ports.ts node --test compose-ports.test.ts`           |
| 7    | [check-links.ts](check-links.ts)               | `MODULE=../solutions/check-links.ts node --test check-links.test.ts`               |
| 8    | [additive-migration.ts](additive-migration.ts) | `MODULE=../solutions/additive-migration.ts node --test additive-migration.test.ts` |

[tsconfig.json](tsconfig.json) は、解答の型を確かめる設定です（`npx tsc -p solutions`）。

---

## 問題1 `/version` で返す版を決める・比べる

```ts
const given = (v: string | undefined): string | undefined => (v === undefined || v === '' ? undefined : v);

export function appVersion(env: Record<string, string | undefined>): string {
  return given(env.APP_VERSION) ?? given(env.RENDER_GIT_COMMIT) ?? 'dev';
}
```

- `env.APP_VERSION ?? env.RENDER_GIT_COMMIT ?? 'dev'` だけだと、`APP_VERSION` が `''` のとき `''` を返します。`??` が飛ばすのは `undefined` と `null` だけで、空の文字は「値がある」とみなすからです。`||` を使えば `''` も飛ばせますが、`||` は `0` や `false` も飛ばすので、何を飛ばしたいのかが読み取りにくくなります。
- `''` が来るのは、Dockerfile の `ARG APP_VERSION=` と `ENV APP_VERSION=${APP_VERSION}` のためです。`--build-arg` で渡さないと、環境変数は「無い」ではなく「空の文字」になります。アプリの `loadConfig` は、最初に空の文字を全部取り除いてから確かめているので、同じ結果になります（`src/config.ts`）。
- `sameVersion` は、どちらが短いか分からないので、`startsWith` を両方の向きで試します。7 文字より短い（`3f9c2a`）と、別のコミットと頭が同じになりやすいので、コミットの ID とはみなしません。`git rev-parse --short` が出す長さも、ふつうは 7 文字です（リポジトリが大きくなると、自動で長くなります）。

## 問題2 CI の穴を埋める

```yaml
web:
  runs-on: ubuntu-latest
  timeout-minutes: 10
  defaults:
    run:
      working-directory: web
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v5
      with:
        node-version: 24
        cache: npm
        cache-dependency-path: web/package-lock.json
    - run: npm ci --ignore-scripts
    - run: npm run check
    - run: npm audit --omit=dev --audit-level=high

e2e:
  needs: [api, web]
```

- `defaults.run.working-directory` は `run` にだけ効きます。`uses` の手順（`actions/checkout` など）は、いつもリポジトリのいちばん上で動きます。だから `cache-dependency-path` には `web/` を付けた、いちばん上から見たパスを書きます。
- `cache-dependency-path` を書かないと、`setup-node` はいちばん上の `package-lock.json` をキーにします。画面のパッケージを変えてもキャッシュのキーが変わらず、古いキャッシュを使い続けます。
- `needs: api` のように1つだけ書くこともできます（文字）。2つ以上は配列です。テストは、どちらの形でも読めるようにしてあります。

## 問題3 render.yaml に、入れ忘れた環境変数が無いか

```ts
for (const v of service.envVars) {
  if ('key' in v) {
    keys.add(v.key);
    continue;
  }
  const group = envVarGroups.find((g) => g.name === v.fromGroup);
  if (group === undefined) throw new Error(`グループ ${v.fromGroup} が render.yaml にありません`);
  for (const g of group.envVars) keys.add(g.key);
}
return [...keys].toSorted();
```

- `parse` の結果は `any` です。Zod の `Blueprint.parse` を通すと、形が違えば `ZodError` が投げられ、通れば型が付きます（第7部 第38章）。`services` が配列でない、のような壊れた YAML も、ここで止まります。
- `{ key }` と `{ fromGroup }` の2つの形のユニオンなので、`'key' in v` で絞り込むと、`else` の側では `v.fromGroup` が使えます。
- 同じ名前がグループとサービスの両方にあるとき、Render ではサービスの値が勝ちます。この問題は「名前が渡るか」だけを見るので、`Set` で1つにします。
- 実際のデプロイで、ワーカーに `REDIS_URL` を書き忘れると、ワーカーは起動のときに `REDIS_URL（本番では必須）` で止まります（2.2節の `docker run` と同じ）。デプロイしてからログで気づくより、CI でこの関数を動かして気づくほうが早く済みます。

## 問題4 考えて答える

### (1) 手元の「本番の形」の NODE_ENV

`production` では、セッションの Cookie が `__Host-sid` で `Secure` 付きになります（第10部 成果物）。express-session は、`Secure` の Cookie を、HTTPS でない接続（`req.secure` が `false`）では**送りません**。ログインの API は 204 を返すのに、応答に `Set-Cookie` が無いので、ブラウザはずっと「ログインしていない」ままになります。執筆の環境で `NODE_ENV: production` に書き換えて確かめると、次のとおりでした（画面そのものは、Chromium で表示されました）。

```sh
$ curl -s -i -X POST http://127.0.0.1:9913/api/auth/login -H 'Origin: http://127.0.0.1:9913' -H 'Content-Type: application/json' -d '{"email":"alice@example.com","password":"…"}' | grep -i -E '^HTTP|set-cookie'
HTTP/1.1 204 No Content
```

本番（Render）では、前に立つプロキシが HTTPS で受け、`X-Forwarded-Proto: https` を付けてアプリに渡します。`TRUST_PROXY=1` でそれを信じるので、`req.secure` が `true` になり、Cookie が送られます（第60章 7節）。手元で `production` を試すには、第62章 3節のように、前に TLS のプロキシを置きます。

### (2) ワーカーが app を待つ

マイグレーションは、app（`src/server.ts`）が起動するときに動きます。ワーカーが `db` だけを待つと、空のデータベースで、表を作る前にワーカーが動き出すことがあります。メールの仕事は表を読まないので動きますが、リマインドの仕事は `bookings` や `reminder_log` を読むので、「relation does not exist」で失敗します。決まった時刻（18:00）にしか動かないので、たまにしか起きず、見つけにくい失敗です。`app` の `service_healthy`（`/healthz` が 200）を待てば、マイグレーションが終わった後です（マイグレーションが終わってから `listen` するため）。

### (3) 2つのヘルスチェック

Docker の `HEALTHCHECK` が失敗し続けると、コンテナは `unhealthy` になります。compose の `restart: unless-stopped` は、プロセスが終わったときだけ起こし直すので、`unhealthy` になっても作り直しません。ところが、ヘルスチェックに失敗したものを作り直す実行環境（多くのコンテナの実行環境は、そう作られています）では、`/readyz` を見ていると、データベースが止まった5分の間、アプリを作り直し続けます。compose でも、`depends_on` の `service_healthy` で待っている worker は、app が `unhealthy` の間は起動できません。作り直しても、データベースが戻るまで直らないうえ、起動のたびに接続を張り直すので、戻ってきたデータベースに一度に接続が押し寄せます。`/healthz`（プロセスが応答するか）は、「作り直せば直るか」を見るためのもの、`/readyz`（客を回してよいか）は、「今、客を回してよいか」を見るためのもので、目的が違います（第60章 8節）。

### (4) push しただけではデプロイしない

自動のデプロイに任せると、テストが失敗するコミットでも、`main` に入った瞬間にデプロイが始まります（CI とデプロイが同時に動く）。`deploy.yml` の `needs: check` で、テストと `docker build` が通ったものだけをデプロイできます。デプロイフックの URL は、知っている人ならだれでも POST するだけでデプロイを始められる「鍵」です。ワークフローのファイルはリポジトリに入るので、Public にしたり、権限の広い人がいたりすると漏れます。Secrets に置けば、ログにも `***` で隠されます。

### (5) 列の名前を変えたい

`preDeployCommand` がマイグレーションを動かした瞬間から、新しい版に客を回すまでの間（数十秒〜数分）、前の版のコードが動いています。前の版は `SELECT … title …` を投げるので、予約の表・自分の予約・リマインドが全部 500 になります。新しい版が `/readyz` を通らずに失敗したら、前の版に戻しても、データベースは `subject` のままなので、直りません。

足すだけで名前を変えるには、デプロイを分けます（**expand / contract** と呼ばれる進め方）。

| 回  | マイグレーション                                  | コード                                          |
| --- | ------------------------------------------------- | ----------------------------------------------- |
| 1   | `subject` の列を足す（NULL を許す）               | 書くときは `title` と `subject` の両方に書く    |
| 2   | 今ある行の `subject` を `title` から埋める        | 読むのを `subject` にする（書くのは両方のまま） |
| 3   | —                                                 | `title` に書くのをやめる                        |
| 4   | `title` を消す（前の版はもう `title` を使わない） | —                                               |

どの回の後で前の版に戻しても、前の版が使う列は残っています。4回目の `DROP COLUMN` は、練習問題8の `checkMigration` に当たりますが、「1つ前の版がもう使っていない」ことを確かめてから、分かったうえで流します。

## 問題5 公開したアプリを外から一通り確かめるコマンド

```ts
const Ready = z.object({ status: z.literal('ready') });

export const CHECKS = [
  { path: '/healthz', ok: (res) => statusIs(res, 200) },
  {
    path: '/readyz',
    ok: (res, body) =>
      statusIs(res, 200) ?? (Ready.safeParse(jsonOf(body)).success ? null : 'status が ready ではありません'),
  },
  // …
];
```

- 1つの確かめを「合っていれば `null`、違えば理由の文」を返す関数にしました。`??` でつなぐと、「まずステータス、合っていたら中身」の順に、最初に見つかった理由だけを返せます。
- 応答の JSON は、`as` で決めつけずに Zod の `safeParse` で確かめます。`JSON.parse` が投げる（HTML が返ってきた）ときは `undefined` にしておけば、`safeParse` が失敗するだけで済みます。
- `fetch` が投げるのは、つながらないとき（`TypeError`）と、`AbortSignal.timeout` で時間切れのとき（`name` が `'TimeoutError'`）です。`checkOne` の中で `catch` して理由の文にするので、`main` の `for` は止まらず、5つ全部を確かめます。
- `redirect: 'manual'` は、リダイレクトを追わずにそのままのステータスを見るためです。`/` が 302 でログインのページへ飛ばしていたら、それも「違う」と分かります。
- 動かしている `compose.prod.yaml` に向けると、次のようになります。

```sh
$ node smoke.ts http://127.0.0.1:9913
[OK] /healthz
[OK] /readyz
[OK] /version
[OK] /
[OK] /api/auth/me
すべて成功しました
```

`URL.canParse(url)` は、URL として読めるかを `true` / `false` で返します（`new URL` を `try` / `catch` で包むのと同じ）。`deploy.yml` の最後に `node scripts/smoke.ts https://rooms.example.com` を足せば、デプロイの後の確かめを自動にできます。

## 問題6 compose のファイルどうしのポートのぶつかり

```ts
const byPort = Map.groupBy(list, (p) => p.hostPort);
for (const [hostPort, same] of byPort) {
  const users = same.filter((p) => same.some((q) => q !== p && clash(p, q))).map((p) => `${p.file} ${p.service}`);
  if (users.length > 0) out.push({ hostPort, users });
}
```

- `ports` の数（`9229`）は、YAML では数として読まれます（`'9229'` と書けば文字）。数は「コンテナの番号だけ」なので、`typeof port === 'number'` で先に飛ばします。
- IP を書かない `'6382:6379'` は、Mac のすべての IP（`0.0.0.0`）で待ちます。同じ Wi-Fi のほかの PC からも届くので、データベースなどは `127.0.0.1:` を付けて、自分の Mac からだけにします（このアプリの compose はそうしてある）。
- `0.0.0.0:8000` は、`127.0.0.1:8000` とも `127.0.0.2:8000` ともぶつかります。だから「同じ番号のどれか1つとでもぶつかるもの」を残します（`some`）。
- 実際にぶつかると、後から起動したほうの `docker compose up` が `port is already allocated` で失敗します。自分のアプリの compose を作るときは、このアプリと別の番号（たとえば PostgreSQL は 5435）にします。
- `127.0.0.1:9911:8025/tcp` のような `/tcp`、`'9000-9005:9000-9005'` のような範囲、`target:`・`published:` を書く長い形は、この解答では読みません。自分のアプリで使うなら、足してください。

## 問題7 README と docs の、切れたリンクを探すコマンド

- `readdir(root, { recursive: true })` は、フォルダも含めて root から見たパス（Mac では `docs/adr/0001-stack.md` のように `/` 区切り）を返します。`node_modules` の中まで全部たどってから捨てるので、大きなフォルダでは時間がかかります。速くしたいときは、第3部 第15章の `dirSize` のように、自分でフォルダを1つずつたどって、`node_modules` には入らないようにします。
- コードのブロックの中のリンクを飛ばさないと、本文の `cat [これは](…)` のような例を「切れている」と言ってしまいます。` ``` ` の行で `inCode` を切り替えます。
- 行き先の `%E8%A8%AD%E8%A8%88.md` は、GitHub が日本語のファイル名を URL にするときの書き方です。`decodeURIComponent` で `設計.md` に戻してから探します。
- `path.resolve(root, path.dirname(rel), decoded)` で、「その .md のあるフォルダ」から見た行き先を作ります。README.md の `docs/api.md` と、`docs/README.md` の `api.md` は、同じファイルです。
- 完成形のアプリに向けると、次のようになります。CI の `api` のジョブに足せば、リンクを切ったプルリクエストを止められます。

```sh
$ node check-links.ts ~/dev/part13/project-room-booking/solutions
切れたリンクはありません
```

## 問題8 マイグレーションが「足すだけ」か調べる

```ts
function blankOut(sql: string): string {
  let out = '';
  let state: 'code' | 'comment' | 'string' = 'code';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i] ?? '';
    if (state === 'code') {
      if (ch === '-' && sql[i + 1] === '-') state = 'comment';
      else if (ch === "'") state = 'string';
      out += state === 'code' ? ch : ' ';
    }
    // …
  }
  return out;
}
```

- 「今いるのがどこか」を1つの変数（`state`）で持ち、1文字ずつ進める書き方を、**状態機械**と呼びます。正規表現だけで「コメントの中の `'`」「文字の中の `--`」を正しく扱うのは難しいですが、状態機械なら、読む順に決めていけます。
- 置き換えは、文字を空白にするだけで、長さと改行は変えません。だから `blankOut` の結果の位置は、元の SQL の位置と同じで、行の番号をそのまま数えられます。
- `'it''s'` の `''` は、SQL で `'` 1つを書く書き方です。`'` が来たら、次の文字も `'` かを見て、そうなら文字の中のまま2文字進めます。
- `ADD COLUMN … NOT NULL` の確かめは、`[^,]*` で「同じ `ADD COLUMN` の中」に限っています。1つの `ALTER TABLE` に `ADD COLUMN a text, ADD COLUMN b text NOT NULL DEFAULT ''` と書いたときに、`DEFAULT` が同じ文にあれば通してしまいますが、この解答ではそこまでは見ません。
- 文字で調べるのは、はじめの見張りとしては十分ですが、完全ではありません（`CREATE TABLE … AS SELECT`、関数の中の `DROP`、`$$…$$` の文字など）。本当に大事なのは、プルリクエストでマイグレーションを人が読み、6.2節の表に当てはめることです。

---

## この章を終えたときのアプリ

成果物の [../../project-room-booking/solutions/](../../project-room-booking/solutions/) です。第69章の [../../ch69-implementation-web/solutions/app/](../../ch69-implementation-web/solutions/app/) に、次のファイルを足したものです（コードは変えていません）。

| 足したもの                                                                   | 本文の節 |
| ---------------------------------------------------------------------------- | -------- |
| `.dockerignore`・`Dockerfile`                                                | 2        |
| `compose.prod.yaml`                                                          | 3        |
| `.github/workflows/ci.yml`・`dependabot.yml`                                 | 4        |
| `render.yaml`・`.github/workflows/deploy.yml`・`scripts/wait-for-version.ts` | 5        |
| `docs/runbook.md`                                                            | 6        |
| `README.md`（書き直し）・`docs/screenshot.png`                               | 7        |
| `docs/retro.md`                                                              | 8        |
| `.env.example` に `REMINDER_CRON`・`SSE_HEARTBEAT_MS`                        | —        |
