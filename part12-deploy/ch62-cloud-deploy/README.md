# 第62章 クラウドへのデプロイ

第61章で、アプリをコンテナのイメージにしました。この章では、それを**インターネットから使える場所**で動かす方法を学びます。中心にするのは **PaaS**（Render・Fly.io など。アプリを置くだけで、サーバの管理を任せられるサービス）です。HTTPS を終わらせるプロキシ、マネージドのデータベースへの接続、独自ドメイン、止めずに新しい版へ入れ替えること、GitHub Actions からのデプロイを、まず自分の Mac の中で小さく作って確かめ、それから本物の PaaS の設定に当てはめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜6時間（本物の PaaS に出す8節を除く） |
| 前提 | 第60章（設定・`trust proxy`・`/healthz`・`SIGTERM`）、第61章（Dockerfile）、第2部 第5章（DNS）・第8章（HTTPS と証明書）、第11部 第59章（GitHub Actions） |
| この章のゴール | PaaS がアプリに求めること（`PORT`・`SIGTERM`・ヘルスチェック・ディスクに残さない）を説明できる / HTTPS をプロキシで終わらせたとき、アプリが `https` で来たと分かる仕組みを、手元で確かめられる / `DATABASE_URL` の `sslmode` と、接続の数の予算を決められる / 古い版と新しい版が同時に動いても壊れないマイグレーションを書ける / 止めずに新しい版へ入れ替え、だめなら戻せる / テストが通ったら、GitHub Actions からデプロイし、新しい版が動くまで待てる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | PaaS で動かす形のアプリ、HTTPS を終わらせるプロキシ、切り替えるプロキシ、`render.yaml`・`fly.toml`・`deploy.yml` の例 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part12/ch62-cloud-deploy/` で実行します（`cd ~/dev/part12/ch62-cloud-deploy`）。
> - 使うポート: アプリ **9827**、HTTPS のプロキシ **9828**（http は **9829**）、6節の切り替えのプロキシ **9820**、古い版と新しい版 **9821**・**9822**、2節の練習 **9826**。
> - 4節は、第6部の `compose.yaml` の PostgreSQL（127.0.0.1:5433）を使います（`(cd ~/dev/part06 && docker compose up -d --wait)`）。
> - 本物の PaaS（Render）に出す8節は、**お金がかかることがあり、アカウントが要る**ので、読むだけでもかまいません。執筆の環境からは、Render・Fly.io・GitHub Actions を動かしていません。手元で確かめたのは、1〜7節の「手を動かす」と、YAML として読めることだけです。PaaS の画面・項目の名前・値段は変わりやすいので、**必ず公式で確認**してください。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| PaaS がアプリに求めること（2節） | 第64章（ワーカーを別のサービスとして置く）、成果物 |
| HTTPS をプロキシで終わらせる・`__Host-`・HSTS（3節） | 第65章（CDN も同じ形のプロキシ）、成果物（本番の Cookie） |
| `DATABASE_URL`・接続の予算・足してから消すマイグレーション（4節） | 第66章（台数を増やす）、成果物（マイグレーション 005） |
| 止めずに入れ替える・戻す（6節） | 第66章（ロードバランサ）、成果物 |
| GitHub Actions でデプロイ（7節） | 成果物（`deploy.yml`）、第13部 |

---

## 1. PaaS とデプロイの流れ

**デプロイ**（deploy）は、新しい版のアプリを、本番で動かすことです。置き場所には、大きく3つの選び方があります。

| 置き場所 | 自分ですること | 例（執筆時点） |
| --- | --- | --- |
| 仮想マシン（VM） | OS の更新、Node.js を入れる、見張り役、HTTPS の証明書、ファイアウォール…全部 | AWS EC2、さくらの VPS |
| **PaaS**（Platform as a Service） | アプリ（か Dockerfile）を渡す。動かす・HTTPS・ログ・起動し直しは任せる | Render、Fly.io、Railway、Heroku、Google Cloud Run |
| サーバーレスの関数 | 1つの頼みを処理する関数を渡す。プロセスを動かし続けない | AWS Lambda、Vercel Functions |

この教材のアプリは、プロセスを動かし続け（SSE やキューのワーカー）、PostgreSQL と Redis を使うので、**PaaS** で動かします。

**Flask では**: Heroku の時代から、リポジトリに `Procfile` という1行のファイル（`web: gunicorn app:app`）を置くと、Heroku がそれを読んで、gunicorn（Python の本番のサーバ）を起動しました。今の PaaS も考え方は同じで、「何を build して、何を起動するか」を渡すと、あとは PaaS が動かします。Node.js では、`Procfile` の代わりに Dockerfile（第61章）を渡すのがいちばん確かです（どこでも同じイメージになるため）。

PaaS のデプロイは、どれもおおよそ次の流れです。

| 段階 | すること | この章の節 |
| --- | --- | --- |
| **build** | リポジトリから、イメージを作る（`docker build`）。秘密の値は使わない | 第61章 |
| **release** | イメージと設定（環境変数）を組み合わせる。マイグレーションを1回だけ流す | 4.3節 |
| **run** | コンテナを起動し、ヘルスチェックが通ったら、客の頼みを回す。古い版に `SIGTERM` を送る | 2・6節 |

build と run を分けるのは、**同じイメージを、設定だけ変えて**ステージングと本番で動かせるようにするためです（第60章 2節の「設定は環境変数から」）。

## 2. PaaS がアプリに求めること

PaaS は、たくさんの客のアプリを、同じ機械で動かします。だから、アプリにいくつかの約束を求めます。

| 約束 | なぜ | このアプリでは |
| --- | --- | --- |
| 環境変数 `PORT` の番号で待つ | 待つ番号は PaaS が決める | `Number(process.env.PORT ?? 9827)` |
| `0.0.0.0` で待つ | プロキシは、コンテナの外から来る（第61章 2.3節） | Dockerfile の `ENV HOST=0.0.0.0` |
| `SIGTERM` で、処理中の頼みを終えてから止まる | デプロイのたび、台数を減らすたびに止められる（第60章 5節） | `process.on('SIGTERM', …)` |
| ヘルスチェックに答える | 新しい版に客を回してよいかを決める（6節） | `/healthz`・`/readyz`（第60章 8節） |
| **ディスクに残さない** | コンテナは、デプロイのたびに新しく作られる。前のコンテナに書いたファイルは消える | アップロードはオブジェクトストレージへ（第63章） |
| ログは標準出力へ | PaaS がまとめて見せる（第66章） | pino（第5部 第26章） |

最後の2つは、**ステートレス**（stateless。プロセスの中にも、ディスクにも、なくして困るものを持たない）と呼ばれます。メモリのセッション（第10部の MemoryStore）も、台数を増やすと困るので、PostgreSQL や Redis に置きます。

### 2.1 手を動かす: `PORT` で待つ

[samples/app.ts](samples/app.ts) は、この章で使う小さなアプリです。まず `PORT` を変えて起動してみます。

```sh
$ PORT=9826 node samples/app.ts
http://127.0.0.1:9826/ で待っています（版: dev、本番: false）
```

別のターミナルで:

```sh
$ curl -s http://127.0.0.1:9826/version
{"version":"dev"}
```

`Ctrl+C` で止めます。アプリの中心は、次の数行です。

```ts
const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 9827);
const host = process.env.HOST ?? '127.0.0.1';
// Render は、build したコミットを RENDER_GIT_COMMIT に入れて渡す（執筆時点。7節）
const version = process.env.APP_VERSION ?? process.env.RENDER_GIT_COMMIT ?? 'dev';

if (production && (process.env.SESSION_SECRET ?? '').length < 32) {
  console.error('設定の間違い: SESSION_SECRET がありません（32 文字以上）');
  process.exit(1);
}
```

| 行 | 意味 |
| --- | --- |
| `process.env.PORT ?? 9827` | PaaS が `PORT` を渡せばその番号、無ければ開発の番号 |
| `process.env.HOST ?? '127.0.0.1'` | 開発では Mac の中だけ。コンテナでは Dockerfile で `0.0.0.0` にする |
| `APP_VERSION ?? RENDER_GIT_COMMIT` | 今どの版が動いているかを、`/version` で答える（6・7節で使う） |
| `SESSION_SECRET` が無ければ `exit(1)` | 本番で必須の値が無ければ起動しない（第60章 2.2節）。6.3節で、わざと起動しない版を作るのに使う |

## 3. HTTPS はプロキシで終わる

PaaS では、ブラウザとの HTTPS は、PaaS の**ロードバランサ**（たくさんのアプリの前に立つリバースプロキシ）が終わらせます。証明書を持つのもロードバランサで、アプリには、ほどいた後の HTTP で渡されます（第60章 7節）。

```
ブラウザ ──HTTPS──▶ PaaS のロードバランサ ──HTTP + X-Forwarded-Proto: https──▶ アプリ（PORT）
```

この節では、ロードバランサの代わりを [samples/tls-proxy.ts](samples/tls-proxy.ts) で作り、アプリから何が見えるかを確かめます。

### 3.1 手を動かす: 練習用の証明書を作る

第2部 第8章 5.1節と同じく、**openssl**（証明書や鍵を扱うコマンド。Mac に最初から入っている）で、自分で署名した証明書を作ります。オプションの意味は、[samples/make-cert.sh](samples/make-cert.sh) のコメントに書いてあります。

```sh
$ bash samples/make-cert.sh
certs/cert.pem と certs/key.pem を作りました（30 日で期限切れ）
$ bash samples/make-cert.sh
certs/cert.pem はもうあります。何もしません
```

`certs/key.pem` は秘密鍵です。練習用でも、Git に入れません（`.gitignore` に `certs/` を書きます）。

### 3.2 手を動かす: HTTPS のプロキシの後ろでアプリを動かす

ターミナルを3つ使います。1つ目でアプリを、本番のつもりで起動します。

```sh
$ NODE_ENV=production SESSION_SECRET=dev-only-session-secret-0123456789ab node samples/app.ts
http://127.0.0.1:9827/ で待っています（版: dev、本番: true）
```

2つ目でプロキシを起動します。

```sh
$ node samples/tls-proxy.ts
https://localhost:9828/ で受けて、http://127.0.0.1:9827/ へ渡します
http://localhost:9829/ に来たものは、https へ送り直します
```

3つ目で、まず http に送ってみます。

```sh
$ curl -i http://localhost:9829/version
HTTP/1.1 308 Permanent Redirect
location: https://localhost:9828/version
…
```

http で来たものは、`308` で https へ送り直されます。308 は、301 と違い、**メソッドとボディをそのままにして**送り直させる番号です（第2部 第7章 4節）。次に https へ送ります。

```sh
$ curl -i --cacert certs/cert.pem https://localhost:9828/version
HTTP/1.1 200 OK
strict-transport-security: max-age=300; includeSubDomains
cache-control: no-store
content-type: application/json; charset=utf-8
…

{"version":"dev"}
```

| オプション | 意味 |
| --- | --- |
| `--cacert certs/cert.pem` | この証明書を「信じてよい発行元」として使う。付けないと、自分で署名した証明書なので `curl: (60) SSL certificate problem: self-signed certificate` で断られる |

`strict-transport-security`（**HSTS**。第2部 第8章 7.2節）が付きました。アプリは、HTTPS で来たときだけ、これを付けます。ヘッダの名前が小文字なのは、プロキシの `res.writeHead(…, up.headers)` が、Node.js が小文字にした名前で書き直すためです（HTTP のヘッダの名前は、大文字と小文字を区別しません）。

ログインのつもりで POST します。

```sh
$ curl -i -X POST --cacert certs/cert.pem https://localhost:9828/login
HTTP/1.1 200 OK
strict-transport-security: max-age=300; includeSubDomains
set-cookie: __Host-sid=dev-only-session-id; Path=/; HttpOnly; Secure; SameSite=Lax
…

{"secure":true,"protocol":"https","ip":"127.0.0.1"}
```

アプリへ届いたのは HTTP なのに、`req.secure` が `true`、`req.protocol` が `https` です。`trust proxy` を 1 にしているので、Express がプロキシの付けた `X-Forwarded-Proto: https` を信じたからです（第60章 7.1節）。Cookie は `__Host-sid`（`Secure` が必須で、`Path=/` だけ、`Domain` を付けられない名前。第4部 第22章 2.2節）になりました。

最後に、プロキシを通さず、アプリへ直接 POST します。

```sh
$ curl -i -X POST http://127.0.0.1:9827/login
HTTP/1.1 200 OK
Set-Cookie: __Host-sid=dev-only-session-id; Path=/; HttpOnly; Secure; SameSite=Lax
…

{"secure":false,"protocol":"http","ip":"127.0.0.1"}
```

直接来たので `secure` は `false` で、HSTS も付きません。PaaS では、アプリの番号はロードバランサからしか届かないので、こうはなりません。**アプリの番号を、外に出さない**ことが、`trust proxy` を信じてよい前提です。

| 確かめたこと | 本番で、だれがするか |
| --- | --- |
| http → https の 308 | PaaS の設定（Render は自動。Fly.io は `force_https = true`） |
| 証明書と HTTPS | PaaS のロードバランサ（5節で、独自ドメインの証明書も自動で作る） |
| `X-Forwarded-Proto` を付ける | PaaS のロードバランサ |
| `trust proxy`・`Secure`・`__Host-`・HSTS | **アプリ**（自分で書く） |

HSTS の `max-age=300` は5分です。最初は短くして、HTTPS で全部動くことを確かめてから、1年（`31536000`）に延ばします。長くしてから http に戻す必要が出ると、ブラウザが覚えている間、その客は入れなくなるからです。

確かめたら、アプリとプロキシを `Ctrl+C` で止めます。

## 4. マネージドのデータベース

PaaS には、たいてい**マネージドのデータベース**（PostgreSQL の起動・バックアップ・更新を任せられるもの）もあります。アプリには、つなぎ先が1つの URL（`DATABASE_URL`）で渡されます。

```
postgres://ユーザー:パスワード@ホスト:5432/データベース?sslmode=verify-full
```

### 4.1 手を動かす: `sslmode` で何が変わるか

マネージドのデータベースは、たいてい暗号化（TLS）した接続しか受け付けません。暗号化するかは、URL の **`sslmode`** で決めます。[samples/db-check.ts](samples/db-check.ts) で、手元の PostgreSQL（暗号化に対応していない）につないでみます。

```sh
$ node samples/db-check.ts 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi'
つなぐ先: postgres://app:***@127.0.0.1:5433/taskapi
つながりました（暗号化: なし）
$ node samples/db-check.ts 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi?sslmode=verify-full'
つなぐ先: postgres://app:***@127.0.0.1:5433/taskapi?sslmode=verify-full
つながりません: The server does not support SSL connections
```

URL を `'…'` で囲むのは、`?` を zsh に特別な文字として読まれないようにするためです。`sslmode=require` も試します。

```sh
$ node samples/db-check.ts 'postgres://app:dev-only-password@127.0.0.1:5433/taskapi?sslmode=require'
つなぐ先: postgres://app:***@127.0.0.1:5433/taskapi?sslmode=require
(node:13040) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.
…
つながりません: The server does not support SSL connections
```

| `sslmode` | pg 8.23 での意味（執筆時点） |
| --- | --- |
| 書かない・`disable` | 暗号化しない。手元の開発用 |
| `prefer`・`require`・`verify-ca` | 今は `verify-full` と同じ。**pg 9 で弱い意味（相手の証明書を確かめない）に変わる**と警告が出る |
| `verify-full` | 暗号化し、相手の証明書が信じてよい発行元のもので、名前もホストと合うかを確かめる。本番はこれ |
| `no-verify` | 暗号化するが、証明書を確かめない（pg だけの書き方）。中間者攻撃を防げない |

マネージドのデータベースの証明書が、Node.js が最初から信じている発行元のものでなければ、PaaS が配る CA の証明書を `NODE_EXTRA_CA_CERTS`（第2部 第8章 5.4節）で渡します。PaaS の中の道（Render の「内部の URL」など）でつなぐときは、暗号化が要らないこともあります。どれを使うかは、**必ず PaaS の説明で確認**します。

### 4.2 接続の数の予算

PostgreSQL が受け付ける接続の数には上限（`max_connections`）があり、小さなプランでは 100 より少ないこともあります。アプリの `Pool` の `max`（第6部 第32章 5節）は、この上限から逆算します。

```
1 プロセスの Pool の max ≦ （上限 − 管理用に残す数 − ほかで使う数） ÷ （台数 × 1台のプロセスの数）
```

デプロイの間は、**古い版と新しい版が同時に動く**（6節）ので、台数が2倍あるとして数えます。上限 100、管理用 3、マイグレーションや psql で 5、アプリ 2 台なら、ふだんは 46、デプロイの重なりを入れると 23 までです。台数を増やすほど、1台の `max` は小さくなります（練習問題3）。足りなくなったら、データベースのプランを上げるか、PgBouncer のような**接続をまとめるもの**を前に置きます（PaaS のプランに付いていることもあります）。

### 4.3 マイグレーションは、いつ流すか

マイグレーション（第6部 第32章 8.1節）は、新しい版が動き始める**前に、1回だけ**流します。

| 流し方 | 良い・悪い |
| --- | --- |
| アプリの起動のたびに流す | 台数が増えると、同時に何台も流そうとする（第6部の成果物は、アドバイザリロックで1台ずつにしている） |
| **release の段階で1回**（Render の `preDeployCommand`、Fly.io の `release_command`） | 新しい版を起動する前に流れ、失敗したらデプロイが止まる。ふつうはこれ |

ここで大事なのは、マイグレーションが流れた後、**新しい版に入れ替わるまでの間、古い版が新しい表で動く**ことです（6節）。だから、マイグレーションは「古い版でも、新しい版でも動く」形にします。列の名前を `title` から `name` に変えたいなら、1回のデプロイで `RENAME` せず、何回かに分けます。

| 回 | マイグレーション | アプリ |
| --- | --- | --- |
| 1（**足す**: expand） | `ADD COLUMN name text`（NULL を許す） | `title` と `name` の両方に書き、`title` から読む |
| 2（**移す**） | `UPDATE tasks SET name = title WHERE name IS NULL` | `name` から読む |
| 3（**消す**: contract） | `DROP COLUMN title` | `name` だけを使う |

どの回でも、1つ前の版のアプリが、新しい表で動きます。だめだったときに1つ前の版に**戻す**（6.4節）こともできます。ほかにも、止めずにデプロイできない書き方があります。

| 書き方 | 何が起きるか | 代わりに |
| --- | --- | --- |
| `DROP COLUMN`・`DROP TABLE` | 古い版が、まだその列を使っている | 使わなくなった版を出した後のデプロイで消す |
| `RENAME` | 古い版は古い名前を使っている | 上の3回に分ける |
| `ADD COLUMN … NOT NULL`（`DEFAULT` なし） | 古い版の `INSERT` が、その列を書かないので失敗する | `DEFAULT` を付けるか、NULL を許して足す |
| `ALTER COLUMN … TYPE` | 表を書き直す間、読み書きが止まる | 新しい列を足して移す |
| `CREATE INDEX` | 作り終わるまで、書き込みが止まる | `CREATE INDEX CONCURRENTLY`（トランザクションの中では使えないので、そのマイグレーションだけトランザクションの外で流す） |

この表を、プログラムで点検するのが練習問題7です。

## 5. 独自ドメイン

PaaS は、最初に `task-app.onrender.com` のような名前をくれます。自分のドメイン（`app.example.com`）で公開するには、**DNS**（第2部 第5章）に、その名前を PaaS に向けるレコードを足します。

| レコード | 書くもの | 使う場面 |
| --- | --- | --- |
| `CNAME` | 別の名前（`task-app.onrender.com`） | `app.example.com` のようなサブドメイン。PaaS 側で IP アドレスが変わっても追いかけられる |
| `A`・`AAAA` | IPv4・IPv6 のアドレス | `example.com` そのもの（**apex**。DNS の決まりで CNAME を置けない）。PaaS が教えるアドレスを書く。DNS のサービスによっては、apex にも CNAME のように書ける「ALIAS」「ANAME」がある |
| `TXT` | 文字列 | ドメインの持ち主であることを PaaS に示す（PaaS が値を教える） |

設定した後は、`dig`（第2部 第5章 5節）で確かめます。次は、架空の名前とアドレスでの**出力例**です。

```sh
$ dig +short app.example.com
task-app.onrender.com.
203.0.113.10
```

DNS が向いたら、PaaS は、**ACME**（Let's Encrypt などが使う、証明書を自動で発行する仕組み）で、そのドメインの証明書を自動で作り、期限の前に自動で更新します。自分で証明書を買ったり、置いたりはしません。

HSTS の `preload`（ブラウザに最初から「このドメインは HTTPS だけ」と組み込んでもらう登録）は、取り消すのに何か月もかかります。サブドメインも含めて全部が HTTPS で動くと確かめるまで、申し込みません。

## 6. 止めずに新しい版へ入れ替える

デプロイのたびにアプリを止めると、その間の客の頼みは失敗します。PaaS は、次の順で入れ替えます（**ブルーグリーン**や**ローリング**と呼ばれるやり方の、いちばん簡単な形）。

1. 古い版を動かしたまま、新しい版を起動する
2. 新しい版のヘルスチェックが通るまで待つ。通らなければ、ここでやめる（古い版のまま）
3. 客の頼みを、新しい版に回し始める
4. 古い版に `SIGTERM` を送る。古い版は、処理中の頼みを終えてから止まる

ここでは、ロードバランサの代わりに [samples/switch.ts](samples/switch.ts) を使い、手で入れ替えてみます。`switch.ts` は、9820 で受けた頼みを、今の行き先（最初は 9821）へ渡すだけのプロキシで、`POST /__switch/9822` で行き先を替えます。

### 6.1 手を動かす: 止めてから起動すると

ターミナルを4つ使います。1つ目で古い版（v1）を、2つ目で `switch.ts` を起動します（それぞれ別のターミナルで）。

```sh
$ PORT=9821 APP_VERSION=v1 node samples/app.ts
$ node samples/switch.ts
```

3つ目で [samples/poll.ts](samples/poll.ts) を動かします。客の代わりに、`/version` を 50 ミリ秒ごとに聞き続け、1秒ごとに「どの版が何回・失敗が何回」を書きます。

```sh
$ node samples/poll.ts
14:04:51 v1=18
14:04:52 v1=19
```

まず、止めてから起動するやり方を試します。1つ目のターミナルで `Ctrl+C` を押して v1 を止め、すぐに同じ番号で v2 を起動します。

```sh
$ PORT=9821 APP_VERSION=v2 node samples/app.ts
```

`poll.ts` には、こう出ました。

```
14:04:53 v1=2 失敗502=4 v2=12
14:04:54 v2=20
```

止めてから v2 が待ち始めるまでの間に、4回失敗しました（`switch.ts` が、つながらないので 502 を返した）。起動に時間がかかるアプリほど、失敗は増えます。

### 6.2 手を動かす: 起動してから切り替えると

最初からやり直します。1つ目のターミナルの v2 を `Ctrl+C` で止め、v1 を 9821 でもう一度起動します（`switch.ts` と `poll.ts` は動かしたままでかまいません）。

```sh
$ PORT=9821 APP_VERSION=v1 node samples/app.ts
```

今度は v1 を動かしたまま、4つ目のターミナルで、新しい版 v2 を**別の番号** 9822 で起動します。

```sh
$ PORT=9822 APP_VERSION=v2 node samples/app.ts
```

新しい版のヘルスチェックを確かめてから、行き先を替えます。

```sh
$ curl -s http://127.0.0.1:9822/healthz
{"status":"ok"}
$ curl -s -X POST http://127.0.0.1:9820/__switch/9822
行き先: 9822
```

最後に、古い版（1つ目のターミナル）を `Ctrl+C` で止めます。PaaS なら `SIGTERM` を送るところです（`Ctrl+C` は `SIGINT` ですが、`app.ts` を止めるのは、どちらも同じ）。`poll.ts` には、こう出ました。

```
14:04:59 v1=19
14:05:00 v1=3 v2=16
14:05:01 v2=19
```

失敗は 0 回です。切り替えの途中で処理中だった頼みも、古い版が最後まで答えます（`server.close()` は、処理中の頼みを待つ。第4部 第17章 7節）。

### 6.3 手を動かす: 新しい版が起動しないとき

新しい版に設定の付け忘れがあったら、どうなるでしょう。今は 9822 の v2 に客が回っていて、9821 は空いています。`SESSION_SECRET` を渡さずに、本番の版 v3 を 9821 で起動してみます。

```sh
$ NODE_ENV=production PORT=9821 APP_VERSION=v3 node samples/app.ts
設定の間違い: SESSION_SECRET がありません（32 文字以上）
$ echo $?
1
$ curl -fsS http://127.0.0.1:9821/healthz
curl: (7) Failed to connect to 127.0.0.1 port 9821 after 0 ms: Couldn't connect to server
```

ヘルスチェックが通らないので、切り替えません。客は v2 のまま、何も気づきません（`poll.ts` は `v2=…` を出し続けます）。第60章 2.2節で「必須の値が無ければ、起動のときに落ちる」ようにしたのは、このためです。起動した後でしばらくしてから落ちる版だと、切り替えた後に壊れます。

確かめたら、全部 `Ctrl+C` で止めます。

### 6.4 戻す（ロールバック）

切り替えた後で、新しい版にバグが見つかったら、**1つ前の版に戻します**。PaaS には、前のデプロイを選んで戻すボタン（Render の Rollback など）があります。戻すのは、前の版のイメージで、同じ入れ替えをするだけです。

戻せるかどうかは、データベースで決まります。4.3節の「足す → 移す → 消す」で書いていれば、1つ前の版は新しい表でも動くので、すぐ戻せます。`DROP COLUMN` を新しい版と一緒に出していると、戻した版が消えた列を探して落ちます。

## 7. GitHub Actions でデプロイする

第11部 第59章で、push のたびにテストを動かしました。ここでは、**main に入って、テストが通ったら、デプロイする**ようにします。[samples/github/deploy.yml](samples/github/deploy.yml) の大事な所です。

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  test:
    # …npm ci と npm run check
  deploy:
    needs: test
    environment:
      name: production
      url: https://app.example.com
    steps:
      # …
      - name: Render にデプロイを頼む
        run: curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL" > /dev/null
        env:
          RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
      - name: 新しい版が動くまで待つ
        run: node scripts/wait-for-version.ts https://app.example.com/version "$GITHUB_SHA" --timeout 600
```

| 書き方 | 意味 |
| --- | --- |
| `concurrency` の `cancel-in-progress: false` | 2つのデプロイを同時に走らせない。後から来たものは、前のものが終わるまで待つ。デプロイを途中で取り消すと、半分だけ入れ替わった状態が残りうるので、取り消さない |
| `needs: test` | テストのジョブが成功したときだけ動く |
| `environment: production` | GitHub の「環境」。その環境に置いた Secrets だけを使え、「だれかが承認してから動かす」設定もできる |
| `${{ secrets.… }}` を `env:` で渡す | Secrets は、GitHub の Settings → Secrets and variables → Actions に置く。ログには `***` と出る。`run:` の中に `${{ … }}` を直接書くと、値がスクリプトの文字に埋め込まれる（第11部 第59章）ので、環境変数で渡す |
| **デプロイフック**（deploy hook） | PaaS が発行する「この URL に POST されたらデプロイする」URL。URL そのものが合言葉なので、Secrets に置く |
| `curl -fsS` | `-f` は 400 以上で失敗にする、`-s` は進み具合を出さない、`-S` はエラーは出す（第1部 第2章） |
| `GITHUB_SHA` | この実行のコミットの ID。GitHub Actions が環境変数で渡す |
| `wait-for-version.ts` | `/version` がこのコミットを返すまで待つ（練習問題6）。来なければ、ジョブを失敗にして気づかせる |

Render は、build したコミットを、アプリに `RENDER_GIT_COMMIT` で渡します（執筆時点）。だから `app.ts` は `/version` でそれを返し、`wait-for-version.ts` は「新しい版が動いた」と分かります。

PaaS に Dockerfile から build させる代わりに、GitHub Actions でイメージを作り、**GitHub Container Registry**（GHCR。`ghcr.io`）に置いて、PaaS にそのイメージを動かさせるやり方もあります。テストしたイメージと、本番で動くイメージが同じになるのが良い所です。どちらでもかまいませんが、この教材では、手順の少ない「PaaS が build する」で進めます。

## 8. Render で動かす（読むだけでもよい）

ここからは本物の PaaS です。執筆の環境からは動かしていないので、画面の名前などは、**必ず Render の公式の説明で確認**してください。費用がかかることもあります（10節）。

### 8.1 画面で作る

1. Render にサインアップし、GitHub と連携する（リポジトリを読む権限を渡す）
2. **New → Postgres** でデータベースを作る。リージョンは、アプリと同じ所（日本から近いなら Singapore）
3. **New → Web Service** で、リポジトリを選び、Runtime に **Docker** を選ぶ（Dockerfile は第61章のもの）
4. **Environment** に、`NODE_ENV=production`・`DATABASE_URL`（2 の「Internal Database URL」）・`SESSION_SECRET` などを入れる。値は画面にだけ入れ、リポジトリには書かない
5. **Health Check Path** に `/readyz` を入れる
6. デプロイが終わったら、`https://（名前）.onrender.com/version` を開く
7. 独自ドメインは **Settings → Custom Domains** で足し、教えられた CNAME を DNS に書く（5節）

### 8.2 設定をファイルにする（Blueprint）

画面で作ると、何をどう設定したかが、自分の記憶にしか残りません。Render の **Blueprint**（`render.yaml`）を使うと、サービス・データベース・環境変数の**名前**を、リポジトリに書いておけます。[samples/render.yaml](samples/render.yaml) の大事な所です。

| 項目 | 意味 |
| --- | --- |
| `runtime: docker` | リポジトリの Dockerfile で build する |
| `autoDeployTrigger: 'off'` | push しただけではデプロイしない。テストの後で GitHub Actions がフックで頼む（7節） |
| `healthCheckPath: /readyz` | これが 200 になってから、新しい版に客を回す（6節） |
| `preDeployCommand` | 新しい版に回す前に1回だけ動かす（4.3節のマイグレーション） |
| `fromDatabase` | 作ったデータベースの URL を、環境変数に入れる |
| `generateValue: true` | Render が乱数で値を作る（`SESSION_SECRETS` のような鍵） |
| `sync: false` | 値はダッシュボードで入れる（`SMTP_PASS` のような、外から来る秘密） |

比べるため、Fly.io の設定の例も [samples/fly.toml](samples/fly.toml) に置きました。`internal_port`（= `PORT`）、`force_https`、`release_command`（= `preDeployCommand`）、`http_service.checks`（= `healthCheckPath`）と、名前は違っても、同じことを決めています。

## 9. Next.js をデプロイする

第9部の Next.js のアプリも、考え方は同じです。

| やり方 | すること |
| --- | --- |
| PaaS でコンテナ | `next.config.ts` に `output: 'standalone'` を書くと、`next build` が、動かすのに要るファイルだけを `.next/standalone/` に集める。Dockerfile の最後の段階でそれをコピーし、`node server.js` で起動する（`PORT`・`HOSTNAME` を読む） |
| Vercel | Next.js を作っている会社の PaaS。リポジトリをつなぐだけで、ページごとに静的・動的を分けて配る。Server Actions・`'use cache'` もそのまま動く |

どちらでも、`API_URL` などは環境変数で渡します。`NEXT_PUBLIC_` で始まる値は、**build のときに**ブラウザ用のファイルに埋め込まれる（第9部 第48章 4節）ので、ステージングと本番で別の値にするなら、別々に build します。

## 10. お金と後片付け

| 気をつけること | 理由 |
| --- | --- |
| 無料のプランの制限を読む | しばらく使わないと止まる（最初の頼みが遅い）、データベースに期限がある、など。執筆時点の値は、必ず公式で確認 |
| 予算の通知を設定する | 台数を増やす設定を間違えると、請求が増える |
| 使い終わったら消す | Web Service・データベース・Redis は、それぞれ別に消す。データベースを消す前に、要るならバックアップを取る |
| デプロイフックの URL・API キーを取り替える | 練習で画面に貼ったり、ログに出したりしたものは、漏れたものとして扱う（第60章 6節） |

## 11. Flask との対応

| Flask（Python） | この章（Node.js） |
| --- | --- |
| `Procfile` に `web: gunicorn -b 0.0.0.0:$PORT app:app` | Dockerfile の `CMD`、アプリが `process.env.PORT` を読む |
| Werkzeug の `ProxyFix(app.wsgi_app, x_for=1, x_proto=1)` で、`X-Forwarded-…` を信じる | `app.set('trust proxy', 1)` |
| `SESSION_COOKIE_SECURE = True`、`SESSION_COOKIE_NAME = '__Host-session'` | `res.cookie('__Host-sid', …, { secure: true })` |
| Heroku の release フェーズで `flask db upgrade` | Render の `preDeployCommand`、Fly.io の `release_command` |
| `SQLALCHEMY_DATABASE_URI` に `?sslmode=require` | `DATABASE_URL` に `?sslmode=verify-full` |

## まとめ

- PaaS は build → release → run の順にデプロイする。アプリは `PORT` で待ち、`SIGTERM` で止まり、ヘルスチェックに答え、なくして困るものをディスクやメモリに持たない。
- HTTPS は PaaS のロードバランサが終わらせ、`X-Forwarded-Proto` で知らせる。アプリは `trust proxy` を段の数で設定し、`Secure`・`__Host-`・HSTS を付ける。アプリの番号を外に出さない。
- `DATABASE_URL` は `sslmode=verify-full`（pg 8 では `require` も同じだが、pg 9 で弱くなる）。`Pool` の `max` は、上限から、台数とデプロイの重なりを入れて逆算する。
- マイグレーションは release で1回。古い版も新しい表で動くよう、「足す → 移す → 消す」に分ける。`DROP`・`RENAME`・`NOT NULL`・`CREATE INDEX` に気をつける。
- 新しい版を起動し、ヘルスチェックが通ってから切り替え、古い版を `SIGTERM` で止める。起動しない版には切り替えない。だめなら1つ前の版に戻す。
- GitHub Actions は、テストが通ったら、Secrets のデプロイフックでデプロイを頼み、`/version` が新しいコミットになるまで待つ。デプロイは同時に走らせない。
- 独自ドメインは CNAME（apex は A・ALIAS）。証明書は PaaS が ACME で自動で作る。HSTS の preload は急がない。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- The Twelve-Factor App（日本語訳あり）: https://12factor.net/ja/
- Render Docs「Deploying on Render」「Blueprint YAML Reference」「Deploy Hooks」「Custom Domains」: https://render.com/docs
- Fly.io Docs「App configuration (fly.toml)」: https://fly.io/docs/reference/configuration/
- GitHub Docs「Using secrets in GitHub Actions」「Managing environments for deployment」: https://docs.github.com/actions
- node-postgres「SSL」: https://node-postgres.com/features/ssl
- PostgreSQL「libpq の SSL のモード」: https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL「CREATE INDEX（CONCURRENTLY）」: https://www.postgresql.org/docs/current/sql-createindex.html
- Express「Express behind proxies」: https://expressjs.com/en/guide/behind-proxies.html
- Next.js「Deploying」（`output: 'standalone'`）: https://nextjs.org/docs/app/getting-started/deploying
- Let's Encrypt「How It Works」（ACME）: https://letsencrypt.org/how-it-works/
- hstspreload.org（HSTS の preload の注意）: https://hstspreload.org/

---

前の章: [第61章 Docker でコンテナ化](../ch61-docker/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次の章: [第63章 ファイルの保存](../ch63-file-storage/README.md)
