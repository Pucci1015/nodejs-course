# 第61章 Docker でコンテナ化

第6部 第32章では、PostgreSQL と Redis を Docker で動かしました。この章では、**自分のアプリ**をコンテナのイメージにします。イメージにすると、「自分の Mac では動くのに、サーバでは動かない」が減り、同じものを手元でもクラウドでも動かせます。Dockerfile を少しずつ直しながら、レイヤーとキャッシュ、マルチステージ、`docker stop` とシグナル、root で動かさないこと、ヘルスチェック、秘密の値をイメージに入れないこと、CPU の種類の違い、Compose でデータベースと一緒に動かす方法を、手を動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第60章、第6部 第32章（Docker Desktop・`docker compose`・`psql`）、第3部 第16章（シグナルと終了コード） |
| この章のゴール | Dockerfile を書いて、自分のアプリのイメージを作り、動かせる / コンテナの中では `0.0.0.0` で待つ理由を説明できる / キャッシュが効く順番に Dockerfile を書ける / マルチステージで、型を確かめ、本番で要るものだけのイメージにできる / exec の形の `CMD` で、`docker stop` がすぐ終わるようにできる / `USER`・`HEALTHCHECK` を付け、秘密の値をイメージに入れない / Compose でアプリとデータベースを一緒に動かせる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | コンテナにする小さな API（`app/`）、途中の Dockerfile（`steps/`）、`compose.yaml` |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part12/ch61-docker/` で実行します。最初に、コンテナにするアプリを、章のフォルダにコピーします。以降の `docker build` は、コピーした `app/` の中で打ちます。
>
>   ```sh
>   $ cd ~/dev/part12/ch61-docker
>   $ cp -R samples/app app
>   $ rm app/Dockerfile app/.dockerignore     # この2つは、自分で書く
>   $ cd app
>   $ npm ci
>   ```
>
> - Docker Desktop（か OrbStack）を、第6部 第32章 2節の手順で入れて、動かしておきます。`docker version` で、Client と Server の両方の版が出れば準備できています。
> - アプリはポート **9817** で待ちます（コンテナの中も外も）。9節の Compose の PostgreSQL は、ポートを Mac に出さないので、第6部の PostgreSQL（5433）とはぶつかりません。
> - 本文の出力は、執筆の環境（x86_64 の Linux）のものです。Mac（Apple Silicon）では、`arch` が `arm64`、イメージの大きさが少し違うなど、数字が変わります（8節）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Dockerfile・`.dockerignore`・マルチステージ（2〜4節） | 第62章（PaaS がこの Dockerfile で build する）、成果物（API と画面を1つのイメージに） |
| exec の形の `CMD`・PID 1・`docker stop`（5節） | 第62章（デプロイのたびに止められる）、第64章（ワーカーのコンテナ） |
| `USER`・`HEALTHCHECK`・秘密の値を入れない（6・7節） | 第62章、成果物 |
| CPU の種類（8節） | 第62章（Mac で作り、amd64 のサーバで動かす） |
| Compose でまとめて動かす（9節） | 第64章（ワーカーと Redis）、第66章（複数のアプリとロードバランサ）、成果物（本番に近い環境で E2E） |

---

## 1. コンテナとイメージ

第6部 第32章 1節の復習です。

| 言葉 | 意味 | たとえ |
| --- | --- | --- |
| **イメージ**（image） | アプリを動かすのに要るもの（OS の小さな部分、Node.js、パッケージ、自分のコード）を固めたもの。読むだけで、変わらない | 料理のレシピと材料を1箱にしたもの |
| **コンテナ**（container） | イメージから起動した、動いているもの。1つのイメージから、いくつでも起動できる | 箱から作った料理 |
| **Dockerfile** | イメージの作り方を書いたテキスト | レシピ |
| **レイヤー**（layer） | Dockerfile の命令ごとにできる、ファイルの差分。積み重ねて1つのイメージになる | 料理の手順ごとの途中の状態 |
| **レジストリ**（registry） | イメージを置いておく場所（Docker Hub、GitHub Container Registry など） | 箱の倉庫 |

**Flask では**: Python の venv は、プロジェクトごとに **Python のパッケージだけ**を分けました。Python そのものや、OS のライブラリ（`libpq` など）は、その PC のものを使います。だから「自分の Mac では動くのに、サーバでは動かない」が起きます。コンテナは、**OS の小さな部分から Node.js・パッケージ・コードまで**を丸ごと固めるので、どこでも同じものが動きます。

コンテナは、**仮想マシン**（VM。PC の中にもう1台の PC を作るもの）とは違い、Linux のカーネル（OS の中心）を、動かしている機械と共有します。だから軽く、1秒もかからずに起動します。Mac は Linux ではないので、Docker Desktop は、Mac の中に小さな Linux の VM を1つ作り、その中でコンテナを動かしています。

## 2. 最初のイメージ

### 2.1 コンテナにするアプリ

`app/` は、第60章の `health.ts` を少し広げた小さな API です。中身はもう読めるはずなので、どんな動きかだけを表にします。

| 頼み | 答え |
| --- | --- |
| `GET /` | あいさつと、Node.js の版・CPU の種類（`arch`）・ホスト名・ユーザー・pid・`NODE_ENV` |
| `GET /healthz` | `{"status":"ok"}` |
| `GET /readyz` | 環境変数 `DATABASE_URL`・`REDIS_URL` があれば、届くかを確かめる（第60章 8節） |

| 環境変数 | 意味 | 既定 |
| --- | --- | --- |
| `HOST`・`PORT` | 待つアドレスとポート | `127.0.0.1`・`9817` |
| `DATABASE_URL`・`REDIS_URL` | `/readyz` で確かめるつなぎ先 | 無し（確かめない） |
| `APP_VERSION` | `/` で見せる版 | `dev` |

まず、コンテナにせずに、Mac でそのまま動かしてみます。

```sh
$ node src/server.ts
pid 52310: http://127.0.0.1:9817/ で待っています
```

別のターミナルで `curl http://127.0.0.1:9817/` と打つと、`"arch":"arm64"`、`"user":"alice"` のように、Mac の情報が返ります。確かめたら `Ctrl+C` で止めます。

### 2.2 手を動かす: Dockerfile を書いて build する

`app/` に `Dockerfile` を作ります。

```dockerfile
FROM node:24-bookworm-slim
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "src/server.ts"]
```

| 命令 | 意味 |
| --- | --- |
| `FROM node:24-bookworm-slim` | 土台にするイメージ。Node.js の公式のイメージの、24 の版、Debian 12（bookworm）の、小さい（slim）もの |
| `WORKDIR /app` | これから先の命令を、コンテナの中の `/app` で行う（無ければ作る）。`cd` のようなもの |
| `COPY . .` | build に渡したフォルダ（**ビルドコンテキスト**）の中身を、コンテナの今のフォルダ（`/app`）にコピーする |
| `RUN npm ci` | イメージを作るときに、コマンドを動かす（第3部 第14章の `npm ci`） |
| `CMD ["node", "src/server.ts"]` | コンテナを起動したときに動かすコマンド |

イメージを作ります。

```sh
$ docker build -t ch61-app:v1 .
[+] Building 12.0s (9/9) FINISHED
 => [internal] load build definition from Dockerfile
 => [internal] load metadata for docker.io/library/node:24-bookworm-slim
 => [internal] load .dockerignore
 => [internal] load build context
 => => transferring context: 37.59MB
 => [1/4] FROM docker.io/library/node:24-bookworm-slim@sha256:…
 => [2/4] WORKDIR /app
 => [3/4] COPY . .
 => [4/4] RUN npm ci
 => exporting to image
 => => naming to docker.io/library/ch61-app:v1
```

（出力の一部です。行の右の時間は省きました）

| オプション | 意味 |
| --- | --- |
| `docker build` | Dockerfile からイメージを作る |
| `-t ch61-app:v1` | できたイメージに、名前（`ch61-app`）と**タグ**（`v1`。版の名札）を付ける |
| 最後の `.` | ビルドコンテキスト。今いるフォルダ（`app/`）の中身を Docker に渡す |

`[1/4]` のような番号が、Dockerfile の命令に1つずつ対応しています。これがレイヤーです。`transferring context: 37.59MB` は、ビルドコンテキストとして Docker に送った大きさです。中身のほとんどは、Mac で `npm ci` した `node_modules` です（3.2節で直します）。

### 2.3 手を動かす: 起動する（`0.0.0.0` で待つ理由）

作ったイメージから、コンテナを起動します。

```sh
$ docker run --rm -p 127.0.0.1:9817:9817 ch61-app:v1
pid 1: http://127.0.0.1:9817/ で待っています
```

| オプション | 意味 |
| --- | --- |
| `docker run イメージ` | イメージから、コンテナを1つ起動する |
| `--rm` | コンテナが終わったら、コンテナを消す（練習で、止めたものがたまらないように） |
| `-p 127.0.0.1:9817:9817` | Mac の `127.0.0.1` の 9817 番に来た通信を、コンテナの 9817 番に渡す（`Mac 側:コンテナ側`）。`127.0.0.1:` を付けると、Mac の中からだけ届く |

別のターミナルで頼むと、つながりません。

```sh
$ curl http://127.0.0.1:9817/
curl: (56) Recv failure: Connection reset by peer
```

コンテナは、自分専用の**網**（ネットワーク）を持っています。コンテナの中の `127.0.0.1` は「コンテナ自身」で、Mac の `127.0.0.1` とは別物です。`-p` で渡された通信は、コンテナの外側の口（コンテナの網のアドレス）に届くので、`127.0.0.1` だけで待っているアプリには届きません。

`Ctrl+C` で止め（止まらなければ、別のターミナルで `docker ps` で名前を見て `docker stop 名前`）、今度は `-e`（環境変数を渡すオプション）で `HOST=0.0.0.0` を渡します。`0.0.0.0` は「どの口に来たものも受ける」です。

```sh
$ docker run --rm -p 127.0.0.1:9817:9817 -e HOST=0.0.0.0 ch61-app:v1
pid 1: http://0.0.0.0:9817/ で待っています
```

```sh
$ curl http://127.0.0.1:9817/
{"message":"こんにちは、コンテナから","version":"dev","node":"v24.22.3","arch":"x64","hostname":"1823867d33c0","user":"root","pid":1,"env":"(なし)"}
```

| 見えたもの | 意味 |
| --- | --- |
| `pid: 1` | コンテナの中では、アプリが最初のプロセス（**PID 1**）。5節で大事になる |
| `hostname` | コンテナの ID の頭。コンテナごとに違う |
| `user: root` | コンテナの中の管理者で動いている。6節で直す |
| `env: (なし)` | `NODE_ENV` が無い。第60章 1節のとおり、本番では付ける |

この教材の決まり「サーバは `127.0.0.1` で待つ」は、**Mac の上で**動かすときの決まりです。コンテナの中では `0.0.0.0` で待ち、外にどこまで出すかは `-p 127.0.0.1:…` で決めます。

`Ctrl+C` で止めておきます。

## 3. レイヤーとキャッシュ

### 3.1 手を動かす: ソースを1行変えて build し直す

`src/server.ts` の最後に、コメントを1行足して（`// 1行足した`）、もう一度 build します。`--progress=plain` は、途中の様子を省かずに全部出すオプションです。

```sh
$ docker build --progress=plain -t ch61-app:v1 .
…
#6 [2/4] WORKDIR /app
#6 CACHED
#7 [3/4] COPY . .
#7 DONE 0.1s
#8 [4/4] RUN npm ci
#8 DONE 1.7s
…
```

`WORKDIR` は `CACHED`（前に作ったレイヤーを使い回した）ですが、`COPY . .` から先は作り直しになり、`npm ci` がもう一度動きました。Docker は、命令ごとに「前と同じ材料か」を調べ、**1つ変わったら、そこから先は全部作り直す**からです。`COPY . .` の材料には `src/server.ts` も入っているので、1行変えただけで、パッケージを入れ直すことになりました。

変わりにくいもの（`package.json`・`package-lock.json`）を先にコピーして `npm ci` し、変わりやすいもの（`src/`）を後でコピーします。Dockerfile を次のように直します。

```dockerfile
FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src ./src
CMD ["node", "src/server.ts"]
```

一度 build してから、また `src/server.ts` を1行変えて build します。

```sh
$ docker build -t ch61-app:v2 .
$ echo '// もう1行' >> src/server.ts
$ docker build --progress=plain -t ch61-app:v2 .
…
#6 [2/5] WORKDIR /app
#6 CACHED
#7 [3/5] COPY package.json package-lock.json ./
#7 CACHED
#8 [4/5] RUN npm ci
#8 CACHED
#9 [5/5] COPY src ./src
#9 DONE 0.1s
…
```

`npm ci` が `CACHED` になり、build は1秒ほどで終わります。`>>` は、ファイルの最後に書き足す記号です（第1部 第1章）。足した行は、エディタで消しておきます。

| 命令の順番の決まり | 理由 |
| --- | --- |
| 変わりにくいものを上に、変わりやすいものを下に | 変わった所から下だけが作り直しになる |
| `package.json` と `package-lock.json` だけを先にコピーして `npm ci` | パッケージを変えない限り、`npm ci` を使い回せる |

### 3.2 手を動かす: `.dockerignore`

`docker build .` は、`.`（`app/` の中身）を全部 Docker に送ります。Mac で `npm ci` した `node_modules` も送られます。これには3つの問題があります。

- 送るのに時間がかかる（`node_modules` は数十 MB〜数百 MB）
- `COPY . .` のときに、Mac 用のファイルがイメージに入る（C++ で書かれたパッケージは、Mac 用と Linux 用で中身が違う。8節）
- `.env` のような秘密のファイルが、イメージに入る（7節）

`app/` に `.dockerignore` を作り、送らないものを書きます。書き方は `.gitignore`（第1部 第3章）に似ています。

```text
# Mac で入れた node_modules（CPU や OS が違う。イメージの中で npm ci する）
node_modules
# 秘密の値（イメージに入れない）
.env
.env.*
!.env.example
# Git の履歴、テストやビルドが作るもの
.git
coverage
dist
**/*.log
# Dockerfile そのもの（変えても、アプリの層を作り直さないように）
Dockerfile
.dockerignore
```

| 書き方 | 意味 |
| --- | --- |
| `node_modules` | その名前のファイルかフォルダ（中身も全部）を送らない |
| `.env.*` | `*` は `/` 以外の0文字以上。`.env.local`・`.env.production` など |
| `!.env.example` | `!` は「やっぱり送る」。前の行で除いたものを戻す |
| `**/*.log` | `**` は、どの深さのフォルダでも。`*.log` だけだと、いちばん上のフォルダのものだけ |

`.gitignore` と違い、`*.log` は**いちばん上だけ**に当てはまります（Docker の決まり）。深い所まで除くときは `**/` を付けます。

## 4. マルチステージ

v2 のイメージには、本番で要らないもの（TypeScript・型定義）が入っています（第60章 3節）。かといって、`npm ci --omit=dev` にすると、build の中で型を確かめられません。**マルチステージ**（multi-stage）の build では、1つの Dockerfile に `FROM` を何回も書き、前の段階で作ったものから、必要なものだけを次の段階にコピーします。

### 4.1 手を動かす: 型を確かめて、要るものだけを残す

`Dockerfile` を次のように書き直します。

```dockerfile
# 1つ目の段階（build）: 全部のパッケージを入れて、型を確かめ、本番で要らないものを消す
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run typecheck
RUN npm prune --omit=dev

# 2つ目の段階（本番）: 動かすのに要るものだけを、build からコピーする
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
USER node
ENV HOST=0.0.0.0 PORT=9817
EXPOSE 9817
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:9817/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/server.ts"]
```

| 命令 | 意味 |
| --- | --- |
| `FROM … AS build` | 段階に `build` という名前を付ける |
| `RUN npm run typecheck` | `tsc` で型を確かめる。エラーがあれば、build がそこで失敗する（壊れたイメージを作らない） |
| `RUN npm prune --omit=dev` | `node_modules` から、`devDependencies` を消す |
| `COPY --from=build …` | 前の段階の中のファイルをコピーする。最後の段階には、build の段階の `npm` のキャッシュや TypeScript は入らない |
| `ENV NODE_ENV=production` | 環境変数を、イメージに書いておく（第60章 1節）。秘密でない値だけ（7節） |
| `USER node`・`HEALTHCHECK`・`EXPOSE` | 6節で説明します |

```sh
$ docker build -t ch61-app:v3 .
$ docker image ls ch61-app
IMAGE         ID             DISK USAGE   CONTENT SIZE   EXTRA
ch61-app:v1   fd4afd99ffd1        387MB         93.6MB
ch61-app:v2   10a82107a08c        387MB         93.6MB
ch61-app:v3   2d3d4228a0e0        337MB           82MB
```

`docker image ls` は、イメージの一覧を出すコマンドです。v3 は、TypeScript と npm のキャッシュが無い分、小さくなりました。大きさの多くは、土台の `node:24-bookworm-slim`（約 330 MB）です。小さいイメージは、レジストリへの送り受けが速く、入っているもの（脆弱性が見つかるかもしれないもの）も少なくなります。

**BuildKit は、使わない段階を build しない**ことにも気をつけます。最後の段階が `COPY --from=build` を1つも持たなければ、build の段階（型の確かめ）は飛ばされ、型のエラーがあってもイメージができてしまいます。練習問題8で、これを確かめます。

## 5. `docker stop` とシグナル

### 5.1 手を動かす: 止めるのにかかる時間を比べる

`docker stop` は、コンテナの PID 1 に `SIGTERM` を送り、10 秒待っても終わらなければ `SIGKILL` を送ります（第60章 5節の流れの、Docker の部分）。`CMD` の書き方で、何が PID 1 になるかが変わります。[steps/](samples/steps/) の Dockerfile で比べます（`-f` は、使う Dockerfile を指定するオプション。`-d` は、コンテナを後ろで動かすオプション。`--name` は、コンテナに名前を付ける）。

```sh
$ docker build -f ../samples/steps/Dockerfile.shell -t ch61-app:shell .
$ docker run -d --name s-shell ch61-app:shell
$ docker top s-shell -o pid,args
PID                 COMMAND
3500                /bin/sh -c node src/server.ts
3516                node src/server.ts
$ time docker stop s-shell
s-shell
docker stop s-shell  0.01s user 0.02s system 0% cpu 10.177 total
$ docker inspect s-shell --format '{{.State.ExitCode}}'
137
```

`docker top` は、コンテナの中のプロセスを出すコマンドです（`-o pid,args` は出す列）。`time` は、後ろのコマンドにかかった時間を測ります（`total` が実際の時間）。`docker inspect --format` は、コンテナの情報から1つを取り出します。同じことを、ほかの2つでも行うと、次の表のようになりました。

| `CMD` の書き方 | PID 1 | `docker stop` | 終了コード | アプリのログ |
| --- | --- | --- | --- | --- |
| `CMD node src/server.ts`（シェルの形） | `/bin/sh` | 10.2 秒 | 137 | 何も出ない |
| `CMD ["npm", "start"]` | `npm` | 0.7 秒 | 1 | `npm error signal SIGTERM` |
| `CMD ["node", "src/server.ts"]`（exec の形） | `node` | 0.3 秒 | 0 | `SIGTERM を受け取りました。止めます`・`止まりました` |

| 分かったこと | 理由 |
| --- | --- |
| シェルの形は、`sh` が PID 1 になり、`SIGTERM` を子に伝えない | アプリは止まる準備ができず、10 秒後に `SIGKILL`（137 = 128 + 9）で殺される。処理中のリクエストは切れる |
| `npm start` は、npm が合図を伝えるが、エラーとして終わる | 正しく止めても終了コードが 1 になり、ログにエラーが出る。npm を間に入れる理由が無い |
| exec の形で `node` を直接動かすと、アプリが `SIGTERM` を受け取る | 第60章で書いた止め方（処理中を終えて、片付けて、終了コード 0）が、そのまま効く |

確かめたら、`docker rm s-shell`（止めたコンテナを消す）で片付けます。

### 5.2 PID 1 は特別

Linux では、PID 1 のプロセスは特別扱いされ、**合図を受け取る処理（`process.on('SIGTERM', …)`）を書いていないと、`SIGTERM` で終わりません**。ふつうのプロセスなら、受け取る処理が無ければ終わるのと違います。

```sh
$ docker run -d --name p1 node:24-bookworm-slim node -e "require('http').createServer().listen(9000)"
$ time docker stop p1
p1
docker stop p1  0.01s user 0.02s system 0% cpu 10.156 total
$ docker rm p1
$ docker run -d --init --name p1 node:24-bookworm-slim node -e "require('http').createServer().listen(9000)"
$ time docker stop p1
p1
docker stop p1  0.02s user 0.01s system 19% cpu 0.156 total
$ docker rm p1
```

| やり方 | 意味 |
| --- | --- |
| アプリで `SIGTERM` を受け取る（この章の `app/`） | いちばんよい。止め方を自分で決められる |
| `docker run --init`（Compose では `init: true`） | 小さな見張り役（tini）を PID 1 にして、合図を子に伝えさせる。受け取る処理が無いアプリにも効く |

## 6. 本番のイメージの決まり

4.1節の Dockerfile の、残りの命令です。

| 命令 | 意味 | 理由 |
| --- | --- | --- |
| `USER node` | これから先の命令と、コンテナの中のアプリを、`node` というユーザーで動かす（Node.js の公式のイメージに用意されている） | root で動かすと、アプリの弱点を突かれたときに、コンテナの中で何でもできてしまう。`/app` のファイルも書き換えられない |
| `EXPOSE 9817` | 「このイメージは 9817 番で待つ」というメモ。これだけでは外に出ない（出すのは `-p`） | 使う人と道具（PaaS）への説明 |
| `HEALTHCHECK … CMD …` | Docker が、決まった間隔でこのコマンドを動かし、終了コード 0 なら healthy | 第60章 8節。slim のイメージには `curl` が無いので、`node -e` と `fetch` で書く |

`HEALTHCHECK` のオプションは、`--interval`（何秒ごと）、`--timeout`（何秒で失敗とみなす）、`--start-period`（起動してから何秒は失敗を数えない）、`--retries`（何回続けて失敗したら unhealthy）です。

### 6.1 手を動かす: healthy になるのを見る

```sh
$ docker run -d --name h3 -p 127.0.0.1:9817:9817 ch61-app:v3
$ docker ps --format '{{.Names}} {{.Status}}'
h3 Up 1 second (health: starting)
$ docker ps --format '{{.Names}} {{.Status}}'
h3 Up 7 seconds (healthy)
$ curl http://127.0.0.1:9817/
{"message":"こんにちは、コンテナから","version":"dev","node":"v24.22.3","arch":"x64","hostname":"57bb780c52fe","user":"node","pid":1,"env":"production"}
$ docker exec h3 whoami
node
$ docker exec h3 ls
node_modules
package.json
src
$ docker stop h3 && docker rm h3
```

| コマンド | 意味 |
| --- | --- |
| `docker ps` | 動いているコンテナの一覧。`--format` で、出す項目を決める |
| `docker exec コンテナ コマンド` | 動いているコンテナの中で、コマンドを動かす（`docker exec -it h3 sh` なら、中でシェルを使える） |

`user` が `node`、`env` が `production` になりました。`docker ps` の `(healthy)` は、ヘルスチェックが通っているという意味です。Docker（Compose を含む）は、unhealthy になっても**起動し直しはしません**。印を付けるだけです。印を見て動くのは、Compose の `depends_on`（9節）や、PaaS（第62章）です。

## 7. 秘密の値をイメージに入れない

### 7.1 手を動かす: イメージから秘密の値を読む

やってはいけない例を、わざと作って確かめます。[steps/Dockerfile.secret](samples/steps/Dockerfile.secret) は、`ARG`（build のときだけ渡す値）と `ENV` に、秘密の値を入れています。

```dockerfile
FROM node:24-bookworm-slim
ARG NPM_TOKEN
ENV SESSION_SECRET=dev-only-session-secret-baked-into-image
RUN echo "token の長さ: ${#NPM_TOKEN}"
CMD ["node", "-e", "console.log('動きました')"]
```

```sh
$ docker build -f ../samples/steps/Dockerfile.secret --build-arg NPM_TOKEN=dev-only-npm-token-123 -t ch61-secret .
$ docker image inspect ch61-secret --format '{{json .Config.Env}}'
["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin","NODE_VERSION=24.22.3","YARN_VERSION=1.22.22","SESSION_SECRET=dev-only-session-secret-baked-into-image"]
$ docker history --no-trunc --format '{{.CreatedBy}}' ch61-secret
CMD ["node" "-e" "console.log('動きました')"]
RUN |1 NPM_TOKEN=dev-only-npm-token-123 /bin/sh -c echo "token の長さ: ${#NPM_TOKEN}" # buildkit
ENV SESSION_SECRET=dev-only-session-secret-baked-into-image
ARG NPM_TOKEN=dev-only-npm-token-123
…
```

| コマンド | 意味 |
| --- | --- |
| `--build-arg 名前=値` | `ARG` に値を渡す |
| `docker image inspect` | イメージの設定を見る。`ENV` はここに残る |
| `docker history --no-trunc` | イメージのレイヤーを、作った命令ごとに出す（`--no-trunc` は、長くても省かない）。`ARG` の値も残る |

イメージを手に入れた人（レジストリを読める人、イメージを書き出した人）は、だれでもこの値を読めます。後の段階で `ENV SESSION_SECRET=` と消しても、前のレイヤーには残っています。

| 秘密の値 | 渡し方 |
| --- | --- |
| アプリが動くときに使う値（`SESSION_SECRETS`・`DATABASE_URL`） | コンテナを起動するときに `-e 名前=値`・`--env-file .env`（`.env` は Mac にだけ置き、`.dockerignore` でイメージに入れない）、Compose の `environment`、PaaS の環境変数（第62章） |
| build のときだけ使う値（私的なパッケージのトークン） | `docker build --secret`（BuildKit の機能。レイヤーに残らない。この教材では使わない） |

確かめたら、`docker image rm ch61-secret` で、このイメージを消しておきます。

## 8. Apple Silicon と CPU の種類

イメージの中身は、**CPU の種類**（アーキテクチャ）ごとに違います。Apple Silicon の Mac は `arm64`（`aarch64` とも書く）、多くのサーバと Intel の Mac は `amd64`（`x86_64`・`x64` とも書く）です。

```sh
$ docker image inspect ch61-app:v3 --format '{{.Os}}/{{.Architecture}}'
linux/amd64
```

執筆の環境は `amd64` だったので、こう出ました。Apple Silicon の Mac で build すると、`linux/arm64` になります。`/` の応答の `arch` も、`arm64` になります。

| 場面 | 起きること | どうするか |
| --- | --- | --- |
| Node.js の公式のイメージ | `arm64`・`amd64` の両方が用意されていて、build する機械に合うものが選ばれる | そのままでよい |
| Mac（arm64）で作ったイメージを、amd64 のサーバで動かす | `exec format error` などで動かない | `docker build --platform linux/amd64` で作る。Docker Desktop が CPU の違いを真似して動かすので、build が遅くなる |
| PaaS が、リポジトリから build する（第62章） | PaaS の機械（多くは amd64）で build される | Mac の CPU は関係ない。こちらがふつう |
| C++ で書かれた部分を持つパッケージ（**ネイティブアドオン**。画像の処理、一部のハッシュ関数など） | Mac 用・Linux 用、arm64 用・amd64 用で、中身が違う | Mac の `node_modules` をイメージに入れない（3.2節の `.dockerignore`）。イメージの中で `npm ci` する |

この章のアプリ（express・pg・redis）は、どれも JavaScript だけで書かれているので、CPU の違いの影響を受けません。執筆の環境は x86_64 の Linux で、arm64 のイメージは作っていません。Apple Silicon の Mac では、`--platform` を付けない build で arm64 のイメージができ、そのまま動くはずです（Docker の公式の説明による）。

## 9. Compose でまとめて動かす

本番に近い形で試すには、アプリとデータベースを一緒に動かします。第6部 第32章で使った **Compose** に、自分のアプリの build を書きます。

### 9.1 手を動かす: アプリと PostgreSQL

章のフォルダ（`~/dev/part12/ch61-docker`。`app/` の1つ上）に `compose.yaml` を作ります。

```yaml
name: ch61
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: dev-only-password
      POSTGRES_DB: app
    # ports を書かない: データベースは、同じ Compose の中（app）からだけ届く
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'app', '-d', 'app']
      interval: 2s
      timeout: 3s
      retries: 15
  app:
    build: ./app
    environment:
      # ホスト名 db は、上のサービスの名前。Compose が、同じ網の中で名前を引けるようにする
      DATABASE_URL: postgres://app:dev-only-password@db:5432/app
      APP_VERSION: compose
    ports:
      - '127.0.0.1:9817:9817'
    depends_on:
      db:
        condition: service_healthy # db の healthcheck が通るまで、app を起動しない
    restart: unless-stopped # 落ちたら起動し直す（docker compose stop で止めたときは、起動し直さない）
```

| 書いたもの | 意味 |
| --- | --- |
| `build: ./app` | イメージを持ってくる（`image:`）代わりに、`./app` の Dockerfile で build する |
| `db:5432` | Compose は、サービスごとに名前（`db`・`app`）を付け、同じ網の中では、その名前で相手に届く。ポートは、コンテナの中の 5432 |
| `db` に `ports` が無い | Mac からはデータベースに届かない。届くのは `app` だけ（本番に近い） |
| `depends_on` の `condition: service_healthy` | db の `healthcheck` が通ってから app を起動する。起動の順番の問題（データベースがまだ準備中）を防ぐ |
| `restart: unless-stopped` | 第60章 4.3節の見張り役。プロセスが終われば、Docker が起動し直す |

```sh
$ cd ~/dev/part12/ch61-docker
$ docker compose up -d --build --wait
…
 ✔ Container ch61-db-1   Healthy
 ✔ Container ch61-app-1  Healthy
$ docker compose ps --format '{{.Service}} {{.Status}}'
app Up 5 seconds (healthy)
db Up 8 seconds (healthy)
$ curl http://127.0.0.1:9817/readyz
{"status":"ok","db":"ok"}
```

| オプション | 意味 |
| --- | --- |
| `up -d` | 全部のサービスを、後ろで起動する |
| `--build` | `build:` のサービスのイメージを、作り直してから起動する |
| `--wait` | 全部が running（healthcheck があれば healthy）になるまで待つ |

### 9.2 手を動かす: データベースを止めてみる

```sh
$ docker compose stop db
$ curl -i http://127.0.0.1:9817/readyz
HTTP/1.1 503 Service Unavailable
…
{"status":"error","db":"error"}
$ docker compose logs app --no-log-prefix | tail -1
readyz: db: getaddrinfo ENOTFOUND db
$ docker compose start db
$ curl http://127.0.0.1:9817/readyz
{"status":"ok","db":"ok"}
$ docker compose down
```

`docker compose logs` は、サービスの出力（ログ）を出すコマンドです（`--no-log-prefix` は、行の頭のサービス名を省く。`tail -1` は最後の1行だけ）。db が止まっている間、`/readyz` は 503 になり、アプリそのもの（`/healthz`）は動き続けました。db が戻ると、何もしなくても `/readyz` が ok に戻ります（プールが新しい接続を作る）。第60章 8節の「生きているか」と「準備ができているか」を分けた効き目です。

`docker compose down` は、コンテナと網を消します。ボリュームを書いていないので、データベースの中身も消えます（第6部の `compose.yaml` は、ボリュームでデータを残していました。練習問題7で足します）。

## 10. Flask との対応

| Flask（Python） | この章（Node.js） |
| --- | --- |
| `FROM python:3.13-slim` | `FROM node:24-bookworm-slim` |
| `COPY requirements.txt .` → `RUN pip install -r requirements.txt` | `COPY package.json package-lock.json ./` → `RUN npm ci` |
| `CMD ["gunicorn", "-b", "0.0.0.0:8000", "app:app"]` | `CMD ["node", "src/server.ts"]`（Node.js は本番のサーバを取り替えない。第60章 1節） |
| gunicorn が `SIGTERM` を受けて、ワーカーを止める | アプリが自分で `SIGTERM` を受けて止まる（5節） |
| `.dockerignore` に `venv`・`__pycache__` | `.dockerignore` に `node_modules` |

## まとめ

- イメージは、OS の小さな部分から Node.js・パッケージ・コードまでを固めたもの。Dockerfile の命令ごとにレイヤーができ、1つ変わると、そこから下は作り直しになる。
- コンテナの中では `0.0.0.0` で待ち、外にどこまで出すかは `-p 127.0.0.1:…` で決める。
- `package.json` と `package-lock.json` を先にコピーして `npm ci` し、ソースは後で。`.dockerignore` で `node_modules`・`.env`・`.git` を送らない。
- マルチステージで、前の段階で型を確かめ、最後の段階には本番で要るものだけをコピーする。使わない段階は build されない。
- `CMD` は exec の形で `node` を直接動かす。PID 1 は `SIGTERM` の受け取りを書かないと止まらない（`--init` でも防げる）。
- `USER node` で root で動かさない。`HEALTHCHECK` は `node -e` と `fetch` で。秘密の値は `ARG`・`ENV` に入れず、起動のときに渡す。
- イメージは CPU の種類ごとに違う。Mac の `node_modules` を入れない。Compose で、アプリとデータベースを、healthcheck を待ってから起動する。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Docker Docs「Dockerfile reference」: https://docs.docker.com/reference/dockerfile/
- Docker Docs「Building best practices」: https://docs.docker.com/build/building/best-practices/
- Docker Docs「Multi-stage builds」: https://docs.docker.com/build/building/multi-stage/
- Docker Docs「Build context」（`.dockerignore`）: https://docs.docker.com/build/concepts/context/
- Docker Docs「Multi-platform builds」: https://docs.docker.com/build/building/multi-platform/
- Docker Docs「Compose file reference」: https://docs.docker.com/reference/compose-file/
- Docker Docs「Build secrets」: https://docs.docker.com/build/building/secrets/
- Node.js の公式のイメージ（Docker Hub）: https://hub.docker.com/_/node
- nodejs/docker-node「Docker and Node.js Best Practices」: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md

---

前の章: [第60章 本番環境の考え方](../ch60-production/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次の章: [第62章 クラウドへのデプロイ](../ch62-cloud-deploy/README.md)
