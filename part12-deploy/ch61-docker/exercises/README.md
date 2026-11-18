# 第61章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch61-docker/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | `.dockerignore` を書く | [app/](app/)、[dockerignore.test.ts](dockerignore.test.ts) | 3.2 |
| 2 | 基本 | Dockerfile を直す | [broken/Dockerfile](broken/Dockerfile)、[broken.test.ts](broken.test.ts) | 2〜6 |
| 3 | 基本 | `HEALTHCHECK` で動かすコマンド | [healthcheck.ts](healthcheck.ts)、[healthcheck.test.ts](healthcheck.test.ts) | 6 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 2〜8 |
| 5 | 応用 | Dockerfile を読む | [dockerfile.ts](dockerfile.ts)、[dockerfile.test.ts](dockerfile.test.ts) | 2〜5 |
| 6 | 応用 | Dockerfile を点検する | [lint-dockerfile.ts](lint-dockerfile.ts)、[lint-dockerfile.test.ts](lint-dockerfile.test.ts) | 3〜7 |
| 7 | 応用 | Compose でアプリ・PostgreSQL・Redis | compose.yaml（自分で作る）、[compose.test.ts](compose.test.ts) | 9 |
| 8 | 発展 | 3つの段階の Dockerfile | app/Dockerfile（自分で作る）、[app-image.test.ts](app-image.test.ts) | 4〜6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて（直して）、`node --test ○○.test.ts` ですべてのテストが通れば完成です。直す前に失敗するテストの数は、それぞれの問題に書いてあります。

- 模範解答で試すには、`MODULE=../solutions/○○` を付けます（問題ごとに書いてあります）。
- 問題2・7・8のテストは、ふだんは Dockerfile や compose.yaml の**中身だけ**を確かめます。`DOCKER=1` を付けると、本当に build して動かして確かめます（Docker Desktop を動かしてから。数分かかります）。
- [typecheck.ts](typecheck.ts)・[dockerignore-match.ts](dockerignore-match.ts)・[dockerfile-text.ts](dockerfile-text.ts) は、テストの部品です。書き換えなくてかまいません。
- [app/](app/) と [broken/](broken/) は、本文の `samples/app` と同じアプリです。`src/` は書き換えません。

---

## 基本

### 問題1 `.dockerignore` を書く

[app/](app/) に `.dockerignore` を作ってください。次のものを送らず（イメージに入れず）、ほかは送ります。

| 送らない | 送る |
| --- | --- |
| `node_modules`（中身も） | `package.json`・`package-lock.json`・`tsconfig.json` |
| `.env`・`.env.local`・`.env.production`（`.env` で始まるもの） | `src/` の中身 |
| `.git`（中身も） | `.env.example`（例のファイルだけは送る） |
| `coverage`・`dist` の中身 | |
| どの深さのフォルダでも、`.log` で終わるファイル（`npm-debug.log`・`logs/app.log`） | |

```sh
$ node --test dockerignore.test.ts     # 書く前は 12 個が失敗
$ MODULE=../solutions/app/.dockerignore node --test dockerignore.test.ts
```

ヒント: 本文 3.2節の表を見てください。`*.log` は、いちばん上のフォルダにしか当てはまりません。

### 問題2 Dockerfile を直す

[broken/Dockerfile](broken/Dockerfile) は、build も run もできますが、本番には出せません。次のようになるように直してください（1つの段階のままでかまいません）。

- `FROM` は `node:24-bookworm-slim`
- `package.json` と `package-lock.json` を先にコピーしてから `npm ci`、その後で `src` をコピーする（`COPY . .` は使わない）
- `npm install` ではなく `npm ci --omit=dev`
- `ENV` で `NODE_ENV=production` と `HOST=0.0.0.0`
- `CMD` より前に `USER node`
- `CMD` は exec の形で `["node", "src/server.ts"]`

```sh
$ node --test broken.test.ts            # 直す前は 6 個が失敗（DOCKER=1 のテストは飛ばされる）
$ DOCKER=1 node --test broken.test.ts   # 本当に build して、node ユーザー・production で答え、docker stop がすぐ終わるかを見る
$ MODULE=../solutions/broken/Dockerfile node --test broken.test.ts
```

### 問題3 `HEALTHCHECK` で動かすコマンド

本文 6節の `HEALTHCHECK` は、`node -e` の1行に詰め込んでいました。長くなると読みにくいので、ファイルにします。[healthcheck.ts](healthcheck.ts) の2か所を書いてください。

- `check(url, timeoutMs)`: `fetch` で GET し、状態コードが 2xx なら `{ ok: true }`、それ以外は `{ ok: false, reason: '状態コード 503' }` のように返す
  - リダイレクトはたどらない（`redirect: 'manual'`。302 は ok ではない）
  - `timeoutMs` で打ち切る（`AbortSignal.timeout`）
  - つながらない・時間切れのときも、例外を投げずに `{ ok: false, reason: 理由 }` を返す
- `import.meta.main` の中: URL は引数（`process.argv[2]`）、無ければ `http://127.0.0.1:${PORT ?? 9817}/healthz`。時間切れは環境変数 `HEALTHCHECK_TIMEOUT_MS`（既定 2000）。ok なら何も書かずに終了コード 0、ok でなければ、標準エラー出力に理由を書いて終了コード 1

```sh
$ node --test healthcheck.test.ts      # 書く前は 8 個が失敗
```

書けたら、Dockerfile では次のように使えます（イメージに `healthcheck.ts` をコピーしておく）。

```dockerfile
HEALTHCHECK --interval=10s --timeout=3s CMD ["node", "healthcheck.ts"]
```

### 問題4 考えて答える

[predict.md](predict.md) の6つの問いに答えてください。

---

## 応用

### 問題5 Dockerfile を読む

問題6で Dockerfile を点検する道具を作るために、まず Dockerfile を命令に分ける関数を書きます。[dockerfile.ts](dockerfile.ts) に、2つの関数を書いてください。

`parseDockerfile(text)` は、`Instruction` の配列を返します。

| 決まり | 例 |
| --- | --- |
| 1つの命令は `{ line, keyword, args, stage }`。`line` は命令が始まる行（1 から）、`keyword` は大文字にそろえる | `from node:24` → `{ line: 1, keyword: 'FROM', args: 'node:24', stage: 0 }` |
| `#` で始まる行（前に空白があってもよい）と空の行は捨てる。行の番号は数え続ける | |
| 行の最後の `\` で次の行に続く。続きの途中のコメントの行も捨てる。空白は1つにまとめる | `RUN a \`（改行）`  && b` → `args: 'a && b'` |
| `stage` は、最初の `FROM` から 0、`FROM` が来るたびに 1 増える | |
| `RUN`・`CMD`・`ENTRYPOINT` の `args` が JSON の文字列の配列なら、`exec` にその配列を入れる。読めなければ `exec` を付けない | `CMD ["node", "a.ts"]` → `exec: ['node', 'a.ts']` |

`parseEnv(args)` は、`ENV` の後ろの文字列を `[名前, 値]` の配列にします。

| 形 | 例 | 結果 |
| --- | --- | --- |
| `名前=値` を空白で並べる | `NODE_ENV=production HOST=0.0.0.0` | `[['NODE_ENV', 'production'], ['HOST', '0.0.0.0']]` |
| `"…"` で囲んだ値（空白を含む・空） | `GREETING="こんにちは 世界" EMPTY=""` | `[['GREETING', 'こんにちは 世界'], ['EMPTY', '']]` |
| 古い形 `名前 値`（最初の言葉に `=` が無い。残り全部が値） | `MESSAGE hello world` | `[['MESSAGE', 'hello world']]` |

```sh
$ node --test dockerfile.test.ts       # 書く前は 10 個が失敗
```

ヒント: 行ごとに見ていき、「今つないでいる途中の命令」を変数に持ちます。`\` で終わらない行が来たら、その命令を仕上げて配列に入れます。`parseEnv` の `名前=値` は、文字列の `matchAll` で、左から順に取り出せます。`for (const m of args.matchAll(/(\w+)=(\S*)/g)) { … }` と書くと、当てはまる所ごとに `m` が来て、`m[1]` が1つ目のかっこ（名前）、`m[2]` が2つ目のかっこ（値）です（`g` は「全部探す」の印。`"…"` の形は、かっこを足して自分で考えてください）。

### 問題6 Dockerfile を点検する

[lint-dockerfile.ts](lint-dockerfile.ts) の `lintDockerfile(text)` を書いてください。問題5の `parseDockerfile` を使い、次のことを見つけて、`{ line, message }` の配列を**行の番号の順**に返します（同じ行なら、表の順）。

| 見つけること | `line` | `message` |
| --- | --- | --- |
| `FROM` のイメージに版が無い・`:latest`（前の段階の名前・`@sha256:…` はよい） | その FROM | `FROM のイメージに版（タグ）を付けてください` |
| 最後の段階の、最後の `USER` が無い・`root` | 最後の段階の FROM | `最後の段階に USER がありません（root で動きます）` |
| `CMD`・`ENTRYPOINT` がシェルの形 | その行 | `CMD は ["node", "…"] の形（exec の形）で書いてください`（ENTRYPOINT なら `ENTRYPOINT は …`） |
| 同じ段階で、`COPY . …` の後に `npm ci`・`npm install` | その RUN | `package.json だけを先にコピーしてから npm ci してください（キャッシュが効きません）` |
| `RUN` で `npm install`（`npm i`）を使う | その RUN | `npm install ではなく npm ci を使ってください` |
| `ENV`・`ARG` の名前に `SECRET`・`PASSWORD`・`TOKEN`・`KEY` を含む（大文字小文字を問わない） | その行 | `秘密の値（名前）をイメージに入れないでください` |

```sh
$ node --test lint-dockerfile.test.ts  # 書く前は 9 個が失敗（問題5ができていないと、全部失敗）
```

書けたら、コマンドとしても使えます。

```sh
$ node lint-dockerfile.ts broken/Dockerfile
broken/Dockerfile:2: FROM のイメージに版（タグ）を付けてください
broken/Dockerfile:2: 最後の段階に USER がありません（root で動きます）
broken/Dockerfile:5: package.json だけを先にコピーしてから npm ci してください（キャッシュが効きません）
broken/Dockerfile:5: npm install ではなく npm ci を使ってください
broken/Dockerfile:7: CMD は ["node", "…"] の形（exec の形）で書いてください
```

本物の道具では、hadolint という Dockerfile の点検の道具がよく使われています（この教材では使いません）。

### 問題7 Compose でアプリ・PostgreSQL・Redis

`exercises/` に `compose.yaml` を作ってください。本文 9.1節の `compose.yaml` に、Redis とデータの保存を足したものです。

- `name: ch61-exercise`。サービスは `db`・`redis`・`app` の3つ
- `db`: `postgres:18`、ユーザー `app`・パスワード `dev-only-password`・データベース `app`、`pg_isready` の healthcheck、`ports` は書かない、ボリューム `pgdata` を `/var/lib/postgresql` に（いちばん下の `volumes:` にも `pgdata:` を書く）
- `redis`: `redis:8`、`redis-cli ping` の healthcheck（第6部の `compose.yaml` と同じ）、`ports` は書かない
- `app`: `build: ./app`、ポートは `127.0.0.1:9817:9817` だけ、`DATABASE_URL` は `postgres://app:dev-only-password@db:5432/app`、`REDIS_URL` は `redis://redis:6379`、`db` と `redis` の両方が healthy になってから起動、`restart: unless-stopped`

```sh
$ node --test compose.test.ts          # 書く前は 7 個が失敗
$ DOCKER=1 node --test compose.test.ts # 問題8の app/Dockerfile ができてから。本当に起動して /readyz を見る
$ MODULE=../solutions/compose.yaml node --test compose.test.ts
```

`DOCKER=1` で動かすと、`/readyz` が `{"status":"ok","db":"ok","redis":"ok"}` になります（アプリは `REDIS_URL` があると、Redis にも `PING` します）。

---

## 発展

### 問題8 3つの段階の Dockerfile

[app/](app/) に `Dockerfile` を作ってください。本文 4.1節の Dockerfile を、次のように変えたものです。

- 段階は3つ以上。どれも `FROM node:24-bookworm-slim`
- 本番で要るパッケージだけを入れる段階（`npm ci --omit=dev`）と、全部のパッケージで型を確かめる段階（`npm ci` → `npm run typecheck`）を分ける。型を確かめる段階には `FROM … AS 名前` で名前を付ける
- 最後の段階は、型を確かめた段階から、`COPY --from=名前` で何かをコピーする（本文 4.1節の最後の段落）
- 最後の段階: `ENV` で `NODE_ENV=production`・`HOST=0.0.0.0`、`ARG APP_VERSION` を受け取って `ENV APP_VERSION=${APP_VERSION}`、`HEALTHCHECK` で `/healthz`、`USER node`、`CMD ["node", "src/server.ts"]`

```sh
$ node --test app-image.test.ts           # 書く前は 7 個が失敗
$ DOCKER=1 node --test app-image.test.ts  # 本当に build する。--build-arg APP_VERSION=1.2.3 で、/ が版を返すか、
                                          # TypeScript が入っていないか、healthy になるか、型のエラーで build が失敗するか
$ MODULE=../solutions/app/Dockerfile node --test app-image.test.ts
```

ヒント: `ARG` で受け取った値は、同じ段階の中で `${名前}` と書いて使えます。`ARG` は、それを書いた段階の中だけで使えるので、最後の段階に書きます。版のような秘密でない値は `ARG` から `ENV` に入れてかまいません（本文 7節の秘密の値とは違います）。
