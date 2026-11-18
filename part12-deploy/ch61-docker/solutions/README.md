# 第61章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=…` を付けてテストを動かすと確かめられます（問題ごとに書いてあります）。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [app/.dockerignore](app/.dockerignore) |
| 2 | [broken/Dockerfile](broken/Dockerfile) |
| 3 | [healthcheck.ts](healthcheck.ts) |
| 4 | このファイルの問題4 |
| 5 | [dockerfile.ts](dockerfile.ts) |
| 6 | [lint-dockerfile.ts](lint-dockerfile.ts) |
| 7 | [compose.yaml](compose.yaml) |
| 8 | [app/Dockerfile](app/Dockerfile) |

---

## 問題1 `.dockerignore` を書く

```text
node_modules
.env
.env.*
!.env.example
.git
coverage
dist
**/*.log
Dockerfile
.dockerignore
```

- `.env` と `.env.*` の2行が要ります。`.env*` の1行でも `.env` と `.env.local` の両方に当てはまりますが、`.envrc` のような別のファイルまで除いてしまいます。
- `!.env.example` は、`.env.*` の**後に**書きます。後に書いた行が勝つからです。
- `*.log` だと `logs/app.log` を除けません。`.gitignore` の `*.log` はどの深さにも当てはまるので、ここが違います（Docker は Go 言語の `filepath.Match` という決まりで比べます）。
- `Dockerfile` と `.dockerignore` を除いても、`docker build` は困りません。Dockerfile は、ビルドコンテキストとは別に Docker に渡されます。除いておくと、Dockerfile のコメントを直しただけで `COPY . .` の層が作り直しになる、ということが起きません。

## 問題2 Dockerfile を直す

```dockerfile
FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 9817
USER node
CMD ["node", "src/server.ts"]
```

| 直す前 | 直した後 | 理由 |
| --- | --- | --- |
| `FROM node` | `FROM node:24-bookworm-slim` | 版が無いと `latest`。build する日によって Node.js の版が変わる。slim は小さい |
| `COPY . .` → `RUN npm install` | `COPY package*.json` → `RUN npm ci --omit=dev` → `COPY src` | キャッシュが効く順番。`npm ci` はロックファイルのとおりに入れる（第3部 第14章） |
| `NODE_ENV`・`HOST` 無し | `ENV NODE_ENV=production HOST=0.0.0.0` | 本番の動き（第60章 1節）、コンテナの外から届く（本文 2.3節） |
| `USER` 無し | `USER node` | root で動かさない（本文 6節） |
| `CMD npm start` | `CMD ["node", "src/server.ts"]` | node が PID 1 になり、`SIGTERM` が届く（本文 5節） |

- 1つの段階なので、`npm ci --omit=dev` にしました。型の確かめは、CI（第11部 第59章）か、問題8のマルチステージで行います。
- `ENV` を `WORKDIR` より前に書いても後に書いても、動きは同じです。変わらないものなので、上のほうに書きました。

## 問題3 `HEALTHCHECK` で動かすコマンド

```ts
export async function check(url: string, timeoutMs: number): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
    await res.arrayBuffer();
    if (res.status >= 200 && res.status < 300) return { ok: true };
    return { ok: false, reason: `状態コード ${res.status}` };
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return { ok: false, reason };
  }
}
```

- `res.ok` も「2xx か」を表しますが、`redirect: 'manual'` のときの 302 は `ok` が `false`、`status` が 302 になります。どちらで書いてもかまいません。
- `await res.arrayBuffer()` で本文を読み切ります。読まずに終わると、接続が後ろに残ることがあります（コマンドはすぐ終わるので大きな害はありませんが、習慣にしておきます）。
- 時間切れのときの `err.name` は `TimeoutError`、つながらないときは `TypeError`（`fetch failed`）です。どちらも理由として書いておくと、`docker inspect` の `State.Health.Log` で何が起きたかが分かります。
- Docker の `HEALTHCHECK --timeout` は、コマンドそのものを打ち切る時間です。コマンドの中の時間切れ（`HEALTHCHECK_TIMEOUT_MS`）は、それより短くしておきます。

## 問題4 考えて答える

**問1**: `-p 9817:9817` は、Mac の**すべての口**（Wi-Fi の IP アドレスを含む）の 9817 番を、コンテナにつなぎます。同じ Wi-Fi にいるほかの人が、`http://あなたの Mac の IP アドレス:9817/` でアプリに届いてしまいます。開発中のアプリは、認証が無かったり、`dev-only-…` の鍵を使っていたりするので危険です。`-p 127.0.0.1:9817:9817` と書けば、Mac の中からだけ届きます。Compose でも同じです（本文 9.1節、第6部の `compose.yaml`）。macOS のファイアウォールを有効にしていても、Docker Desktop が開けた口は外から届くことがあるので、`127.0.0.1:` を付けるのが確実です。

**問2**:
1. `src/server.ts` を変えた: `COPY src ./src` から先だけが作り直し（`npm ci` は `CACHED`）
2. パッケージを足した: `COPY package.json package-lock.json ./` から先が作り直し（`npm ci` が動く）。正しい動きです
3. 何も変えない: 全部 `CACHED`。build は一瞬で終わる

**問3**: `.dockerignore` が無いと、Mac の `node_modules`（数十 MB 以上）がビルドコンテキストとして送られ、`COPY . .` でイメージに入ります。その後の `npm ci` は「まず `node_modules` を消してから入れ直す」ので、動くイメージはできます。ただし、送るのが遅く、ソースを変えるたびに大きな `COPY` の層ができ直します。`npm install` だった場合は、`node_modules` を消さずに、足りないものだけを入れようとします。ネイティブアドオン（C++ の部分を持つパッケージ）があると、Mac 用（`darwin`・`arm64`）のファイルがそのまま残り、Linux のコンテナで動かすときに `invalid ELF header` や `exec format error` のようなエラーで落ちることがあります。

**問4**: 137 = 128 + 9 で、9 は `SIGKILL` の番号です。「`SIGKILL` で強制的に終わらされた」という意味です（第3部 第16章の 130 = 128 + 2（`SIGINT`）と同じ考え）。アプリは `SIGTERM` を受け取っていない（`sh` が伝えなかった）ので、処理中のリクエストは途中で切れ、データベースのプールも閉じられずに、接続はデータベースの側でしばらくしてから切れます。

**問5**: arm64 のイメージを amd64 のサーバで動かすと、`exec format error`（この CPU では動かせない形式）で起動しません。Docker は、イメージの CPU の種類と、動かす機械の CPU の種類が違うと、警告を出します。ネイティブアドオンの場合: `.dockerignore` に `node_modules` が無いと、Mac の `node_modules` がイメージに入ります。`npm ci` が入れ直せば Linux 用になりますが、`COPY . .` を `npm ci` の後に書いていると（問題6で見つけるもの）、Mac 用のファイルが Linux 用のものを上書きし、起動のときに落ちます。

**問6**: アプリは起動しているので、`docker ps` では最初 `(health: starting)`、`--start-period` が過ぎて `--retries` 回続けて失敗すると `(unhealthy)` になります。Docker は**起動し直しません**（本文 6.1節）。`restart: unless-stopped` も、プロセスが終わったときにだけ効きます。unhealthy を見て何かをするのは、Compose の `depends_on`（後のサービスが起動しない）や、PaaS（新しい版に切り替えない。第62章）です。

## 問題5 Dockerfile を読む

[dockerfile.ts](dockerfile.ts) の中心は、「今つないでいる途中の命令」を持つ変数 `current` です。

```ts
for (const [i, raw] of lines.entries()) {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.startsWith('#')) continue;
  const continues = trimmed.endsWith('\\');
  const body = continues ? trimmed.slice(0, -1) : trimmed;
  if (current === undefined) current = { line: i + 1, parts: [] };
  current.parts.push(body);
  if (!continues) finish();
}
finish();
```

- 命令の始まりの行の番号は、`current` を作るときに覚えます。続きの行で `current` が既にあれば、そのまま足していきます。
- `finish()` で、つないだ文字列を `/^(\S+)\s*(.*)$/` で「最初の言葉」と「残り」に分けます。`FROM` なら、段階の番号を1つ増やしてから入れます。
- `exec` は、`JSON.parse` が成功して、文字列だけの配列のときだけ付けます。Docker も、JSON として読めない `['node', 'x.ts']`（`'` で囲んだもの）を、シェルの形として扱います。問題6で `CMD ['node', …]` を見つけられるのは、このためです。
- `parseEnv` の `"…"` の中の `\"` は、`(?:[^"\\]|\\.)*` で「`"` と `\` 以外の文字、または `\` と次の1文字」を繰り返して読みます。

本物の Dockerfile の読み方には、ほかにも決まりがあります（`# syntax=` の行、`\` の代わりの文字を変える `# escape=`、ヒアドキュメント `<<EOF`）。この練習では扱いません。

## 問題6 Dockerfile を点検する

[lint-dockerfile.ts](lint-dockerfile.ts) は、命令を1つずつ見ながら、段階ごとの様子（`COPY .` をしたか）と、段階の名前を覚えていきます。

```ts
if (keyword === 'FROM') {
  const [image = '', as, name] = args.split(' ').filter((s) => !s.startsWith('--'));
  if (as?.toUpperCase() === 'AS' && name !== undefined) stageNames.add(name);
  if (!stageNames.has(image) || image === name) {
    const pinned = image.includes('@sha256:') || (/:[^/]+$/.test(image) && !image.endsWith(':latest'));
    if (!pinned) problems.push({ line, message: 'FROM のイメージに版（タグ）を付けてください' });
  }
}
```

- `FROM --platform=linux/amd64 node:24` のようなオプションは、`--` で始まるので除きます。
- `/:[^/]+$/` は「最後の `/` より後ろに `:` がある」です。`localhost:5000/app`（レジストリのポート）のように、`:` が名前の途中にあっても、版とは数えません。
- `USER` は、最後にまとめて調べます。段階の中で `USER node` の後に `USER root` があれば、最後の `USER` は root です。
- 見つけたものは、最後に `sort` で行の番号の順に並べます。JavaScript の `sort` は**安定**（同じ値のものは、元の順を保つ）なので、同じ行の中では見つけた順のままです。

## 問題7 Compose でアプリ・PostgreSQL・Redis

[compose.yaml](compose.yaml) の、本文から足したところです。

```yaml
  db:
    volumes:
      - pgdata:/var/lib/postgresql
  redis:
    image: redis:8
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
  app:
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
volumes:
  pgdata:
```

- `pgdata:/var/lib/postgresql` は、**名前付きボリューム**（Docker が管理する保存場所）を、コンテナの中のパスに付けます。`docker compose down` ではデータが残り、`docker compose down -v` で消えます（第6部 第32章 3節）。PostgreSQL 18 のイメージは、`/var/lib/postgresql` の下に版ごとのフォルダを作るので、ここに付けます（第6部の `compose.yaml` と同じ）。
- `db` と `redis` に `ports` を書かないので、Mac からは届きません。アプリ（同じ Compose の網の中）からは、サービスの名前で届きます。本番の PaaS でも、データベースは外に出さないのがふつうです（第62章 4節）。
- `depends_on` を、`condition` 無しのリスト（`- db`）で書くと、「db のコンテナが起動したら」で app を起動します。PostgreSQL は、起動してから接続を受けられるまで数秒かかるので、`service_healthy` で待ちます。

## 問題8 3つの段階の Dockerfile

[app/Dockerfile](app/Dockerfile) の、最後の段階です。

```dockerfile
FROM node:24-bookworm-slim
ARG APP_VERSION=dev
ENV NODE_ENV=production HOST=0.0.0.0 PORT=9817 APP_VERSION=${APP_VERSION}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=check /app/src ./src
USER node
…
CMD ["node", "src/server.ts"]
```

- `deps`（本番のパッケージ）と `check`（型の確かめ）を分けたので、2つの段階は**同時に** build されます。本文 4.1節の形（1つの段階で `npm ci` → 確かめ → `npm prune`）より、速くなることがあります。
- `src` を `check` の段階からコピーしているのがポイントです。ビルドコンテキストから `COPY src ./src` と書くと、`check` の段階はどこからも使われないので、BuildKit が飛ばし、型のエラーがあっても build が通ってしまいます（執筆の環境で、型のエラーのある `src` で build が通ることを確かめました）。
- `ARG APP_VERSION=dev` の `=dev` は、`--build-arg` を付けなかったときの既定の値です。CI（第62章 7節）では、Git のコミットの ID を `--build-arg APP_VERSION=…` で渡すと、動いている版が `/` で分かります。
- テストの `DOCKER=1` では、`require.resolve('typescript')` が失敗すること（本番のイメージに TypeScript が無いこと）、`docker inspect` の `State.Health.Status` が `healthy` になることも確かめています。
