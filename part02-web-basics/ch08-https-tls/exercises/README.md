# 第8章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
作るファイルは `~/dev/ch08/` に置き、コマンドもそこで実行します（本文の「読み方」でコピーした `samples/` と `exercises/` を使います）。証明書と秘密鍵も `~/dev/ch08/` の下に作ります。

| 問題 | 種類 | テーマ | 本文の節 |
| --- | --- | --- | --- |
| 1 | 基本 | ファイルのハッシュを計算する | 2.1 |
| 2 | 基本 | HMAC を作るコマンドと確かめるコマンド | 2.3 |
| 3 | 基本 | 別の鍵のペアでは確かめられないことを確かめる | 2.4 |
| 4 | 基本 | 証明書のエラーを調べる（調べる問題） | 3.3, 5 |
| 5 | 基本 | 中間者攻撃を考える（考える問題） | 1, 3, 4, 7 |
| 6 | 応用 | 速いハッシュでは暗証番号を守れないことを確かめる | 2.1 |
| 7 | 応用 | 署名付きの値を作る | 2.3, 第7章8 |
| 8 | 応用 | HTTP から HTTPS へ移すサーバ | 5.2, 7 |
| 9 | 発展 | mkcert がしていることを openssl で再現する | 3, 5 |
| 10 | 発展 | 証明書の期限を監視するツール | 6 |

**発展**（9・10）は、少し長めの問題です。できなくても次の章に進んでかまいません。

---

## 基本

### 問題1 ファイルのハッシュを計算する

本文2.1節の `hash.mjs` は、文字列のハッシュを計算しました。**ファイルの中身**のハッシュを計算する `file-hash.mjs` を作ってください。`shasum -a 256` と同じ形で表示します。

```sh
$ node file-hash.mjs samples/hash.mjs samples/hmac.mjs
1c5e...（64文字）  samples/hash.mjs
9a0b...（64文字）  samples/hmac.mjs
$ shasum -a 256 samples/hash.mjs samples/hmac.mjs    # 同じ値になることを確かめる
```

1. 上のように、`shasum -a 256` と同じ値になることを確かめる。
2. `cp samples/hash.mjs copy.mjs` でコピーを作り、`file-hash.mjs` で2つのハッシュが同じになることを確かめる。次に `copy.mjs` をエディタで開いて**1文字だけ**変えて保存し、ハッシュがどう変わるかを確かめる。

ヒント:

- ファイルを読むのは `import fs from 'node:fs/promises';` と `const data = await fs.readFile(ファイル);`（第7章の練習問題6の `static-server.mjs` と同じ）。`data` はバイト列で、そのまま `update(data)` に渡せます。
- `shasum` は、ハッシュとファイル名の間に**空白2つ**を入れて表示します。

ダウンロードしたファイルが壊れていないか・すり替えられていないかを、配布元が公開しているハッシュと比べて確かめるときに、この方法を使います（Node.js のダウンロードのページにも `SHASUMS256.txt` があります）。

### 問題2 HMAC を作るコマンドと確かめるコマンド

本文2.3節の `hmac.mjs` をコピーして `hmac-v2.mjs` を作り、HMAC を**作る**ことと**確かめる**ことを、別々のコマンドでできるようにしてください。

```sh
$ node hmac-v2.mjs make user_id=42
DUgAzqw5WgB7rAnr9m3Z72S4g6cNIQT-IDSR-p5KeNM
$ node hmac-v2.mjs check user_id=42 DUgAzqw5WgB7rAnr9m3Z72S4g6cNIQT-IDSR-p5KeNM
本物
$ node hmac-v2.mjs check user_id=1 DUgAzqw5WgB7rAnr9m3Z72S4g6cNIQT-IDSR-p5KeNM
偽物
$ node hmac-v2.mjs hello
使い方: node hmac-v2.mjs make 値 / node hmac-v2.mjs check 値 HMAC
```

- 確かめる部分は、`check(text, tag)` という関数にする（正しければ `true`、違えば `false` を返す）
- `make` でも `check` でもなければ、使い方を表示する

確かめたら、`secret` を1文字変えてもう一度 `check` してみてください。前に作った HMAC は `偽物` になります。サーバの秘密の鍵を変えると、それまでに発行した署名付きの Cookie がすべて使えなくなる（全員がログアウトする）のは、このためです。

ヒント: `process.argv[2]` が `make` か `check` か、`process.argv[3]` が値、`process.argv[4]` が HMAC です。

### 問題3 別の鍵のペアでは確かめられないことを確かめる

本文2.4節の `sign.mjs` をコピーして `sign-v2.mjs` を作り、次のようにしてください。

- 鍵のペアを **2つ**（`a` と `b`）作る
- `a` の秘密鍵で署名する
- その署名を、`a` の公開鍵と `b` の公開鍵のそれぞれで確かめて、結果を表示する

```sh
$ node sign-v2.mjs
a の公開鍵で確かめる: true
b の公開鍵で確かめる: false
```

最後に、この結果が「証明書」にとって何を意味するか、1〜2文で書いてください（ヒント: 本文3.1節。認証局の公開鍵で確かめられる署名は、誰にしか作れない？）。

ヒント: `const a = crypto.generateKeyPairSync('ed25519');` と書くと、`a.privateKey` と `a.publicKey` で使えます（本文2.5節の `client` と `server` と同じ形）。

### 問題4 証明書のエラーを調べる（調べる問題）

`node my-https-server.mjs`（本文5.2節）を起動して、次のそれぞれで何が起きるかを調べ、表示されたエラーの文を書き留めてください。成功したものと失敗したものの違いを、本文3.3節の表で説明します。

1. `curl https://localhost:8444/`
2. `curl --cacert ~/dev/ch08/certs/cert.pem https://localhost:8444/`
3. `curl --cacert ~/dev/ch08/certs/cert.pem https://127.0.0.1:8444/`
4. `/etc/hosts` に頼らずに、別の名前で接続する: `curl --cacert ~/dev/ch08/certs/cert.pem --resolve myapp.test:8444:127.0.0.1 https://myapp.test:8444/`（`--resolve 名前:ポート:IP` は「この名前は、DNS を使わずにこの IP として扱う」という curl のオプション）
5. Chrome で `https://localhost:8444/` を開く。アドレスバーの左のアイコンから証明書を表示し、「発行先」と「発行元」を見る

ヒント: 証明書に書かれた名前（SAN）は、次のコマンドで見られます（`openssl x509` は証明書を読むコマンド、`-noout` は証明書そのものを表示しない、`-ext subjectAltName` は SAN だけを表示する）。

```sh
$ openssl x509 -in ~/dev/ch08/certs/cert.pem -noout -ext subjectAltName
```

### 問題5 中間者攻撃を考える（考える問題）

**中間者攻撃**（MITM、Man-In-The-Middle）は、通信の途中に割り込んで、両側に「本物の相手」のふりをする攻撃です。次の場面で何が起きるかを、本文の言葉（証明書、認証局、SAN、CertificateVerify、HSTS など）を使って、それぞれ1〜3文で説明してください。

1. カフェの偽の Wi-Fi が、`https://bank.example` への接続を自分のサーバにつなぎ、`bank.example` の証明書を自分で作って（自己署名で）送ってきた。ブラウザはどうするか。
2. 偽の Wi-Fi が、本物の `bank.example` の証明書（公開されているので誰でも手に入る）をそのまま送ってきた。なぜこれでは成功しないのか（ヒント: 本文4節の CertificateVerify と、問題3）。
3. 利用者が `bank.example` とアドレスバーに入力したとき、HSTS が有る場合と無い場合で、偽の Wi-Fi が付け入る隙はどう違うか（本文7.1節・7.2節）。
4. 第3章の SSH（初回に fingerprint を確かめ、`~/.ssh/known_hosts` に覚える）と、HTTPS（認証局）の方式を比べ、それぞれの良い点と弱い点を1つずつ挙げる。

## 応用

### 問題6 速いハッシュでは暗証番号を守れないことを確かめる

あるサービスが、4桁の暗証番号を SHA-256 で「ハッシュ化」して保存していました。データベースが漏れて、ある人の値が次のものだと分かりました。

```
2c16a0622069b5e83fa149e604e24040856495fcd41b254301538a85f36b1f01
```

`crack-pin.mjs` を作って、次を確かめてください。

1. `0000`〜`9999` をすべて SHA-256 にして比べ、元の暗証番号と、かかった時間（ミリ秒）を表示する。
2. 同じことを、わざと遅く作られたハッシュ関数 **scrypt** で行うと、1回あたり何ミリ秒かかるかを測る（20回計算して20で割る）。10000通りを試すのに何秒かかるかも表示する。

```sh
$ node crack-pin.mjs
SHA-256: 暗証番号は ????（8.3 ミリ秒）
scrypt: 1回 45.2 ミリ秒 → 10000通りを試すと約 452 秒
```

（時間は Mac によって違います。）

3. scrypt に渡す `salt`（ソルト。利用者ごとに変えるランダムな値）は何のためのものか、考えて1〜2文で書く。ヒント: ソルトが無いと、同じ暗証番号の人は同じハッシュ値になる。また「0000〜9999 のハッシュ値の表」を1度作っておけば、何人分でもすぐに分かってしまう。

ヒント:

- `0` を `'0000'` にするには `String(i).padStart(4, '0')`（文字列にして、4文字になるまで前に `0` を足す）。
- 時間は `const start = performance.now();` と、終わった後の `performance.now() - start` で測ります（ミリ秒。小数が付く）。`数.toFixed(1)` で小数第1位までの文字列にできます。
- scrypt は `crypto.scryptSync(暗証番号, salt, 32)`、ソルトは `const salt = crypto.randomBytes(16);` です。

> この問題は、**問題に書かれたハッシュ値**で仕組みを確かめるためのものです。他人のパスワードの解析には使わないでください。

### 問題7 署名付きの値を作る

本文2.3節の HMAC を使って、**書き換えられたら分かる値**を作る `signed-value.mjs` を、`~/dev/ch08/exercises/` に作ってください（テストが同じフォルダの `signed-value.mjs` を読み込むため）。Flask の `session` や、第4部・第5部で使う署名付き Cookie と同じ仕組みです。

```js
export function sign(value, secret, { maxAgeSec, now = Date.now() } = {}) { ... }  // → 'eyJ2Ijoi....Xy3k...'
export function verify(signed, secret, { now = Date.now() } = {}) { ... }          // → 元の value、または null
```

`{ maxAgeSec, now = Date.now() } = {}` は、3つ目の引数のオブジェクトから `maxAgeSec` と `now` を取り出す書き方です（第6章5.4節の分割代入）。`now` が無ければ今の時刻（ミリ秒）、引数そのものが無ければ `{}` になります。テストでは、時刻を自由に決めるために `now` を渡します。

形式は「**中身.署名**」にします。

| 部分 | 作り方 |
| --- | --- |
| 中身 | `{ v: 値, exp: 期限 }` を `JSON.stringify` で文字列にし、base64url にしたもの。期限は `now + maxAgeSec * 1000`（`maxAgeSec` が無ければ `null`） |
| 署名 | **中身の文字列**に対する HMAC-SHA256 を base64url にしたもの |

`verify` は、次のときに `null` を返します（例外にしない）。

- `signed` が文字列でない、`.` で2つに分かれない
- 署名が合わない（値や期限を書き換えた、違う秘密の鍵）
- 期限を過ぎている（`now > exp`）

ほかの決まり:

- 秘密の鍵が16文字未満なら、`sign` はエラーにする（`throw new Error('説明')`）
- 署名を比べるときは `===` ではなく `crypto.timingSafeEqual` を使う

```sh
$ cd exercises
$ node --test signed-value.test.mjs
ℹ pass 12
ℹ fail 0
```

ヒント:

| したいこと | 書き方 |
| --- | --- |
| 文字列を base64url にする | `Buffer.from(文字列).toString('base64url')` |
| base64url を文字列に戻す | `Buffer.from(base64url, 'base64url').toString()` |
| オブジェクト ⇔ JSON の文字列 | `JSON.stringify(オブジェクト)` ⇔ `JSON.parse(文字列)`（壊れた文字列だと例外を投げるので `try` / `catch`） |
| 文字列かどうか | `typeof signed !== 'string'` なら文字列ではない |
| 2つのバイト列が同じか（時間が一定） | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`。**長さが違うと例外を投げる**ので、先に `a.length !== b.length` を調べる |

できたら、次の問いに答えてください。

1. `sign` が返す文字列の「中身」の部分は暗号化されていない。`Buffer.from(中身, 'base64url').toString()` で誰でも読めることを確かめる。署名付きの値に入れてはいけないものは何か。
2. 署名を `===` で比べると、なぜ危ないことがあるのか（ヒント: `===` は、何文字目で「違う」と分かった時点で終わる？ それにかかる時間を、外から測れたら？）。

### 問題8 HTTP から HTTPS へ移すサーバ

本文の `my-https-server.mjs`（5.2節）と `to-https.mjs`（7.1節）を1つのファイルにまとめ、さらに安全な Cookie を使うサーバ `secure-redirect-server.mjs` を作ってください。

- HTTP は `127.0.0.1:8080`、HTTPS は `127.0.0.1:8443` で待ち受ける（1つのファイルで2つのサーバを動かす）
- HTTP へのリクエストは、**どのメソッドでも** `https://localhost:8443` + 元のパスとクエリへ 308 でリダイレクトする
- HTTPS のレスポンスには `Strict-Transport-Security: max-age=300` を付ける。HTTP のレスポンスには付けない
- HTTPS の `/` では、ランダムなセッション ID を `sid` という Cookie で渡す。属性は `Path=/; Secure; HttpOnly; SameSite=Lax`
- HTTPS のレスポンスのボディには、届いたメソッド・パス・ボディを表示する

```sh
$ node secure-redirect-server.mjs
$ curl -si 'http://localhost:8080/a?b=1' | grep -i location         # Location: https://localhost:8443/a?b=1
$ curl -si -H 'Host: evil.example' http://localhost:8080/ | grep -i location   # localhost のまま
$ curl -s -L --cacert ~/dev/ch08/certs/cert.pem -d 'memo=1' http://localhost:8080/echo
HTTPS で届きました
メソッド: POST
パス: /echo
ボディ: memo=1
$ curl -si --cacert ~/dev/ch08/certs/cert.pem https://localhost:8443/ | grep -iE 'strict|set-cookie'
Strict-Transport-Security: max-age=300
Set-Cookie: sid=...; Path=/; Secure; HttpOnly; SameSite=Lax
```

ヒント:

- ランダムなセッション ID は `crypto.randomBytes(16).toString('base64url')`（推測できない16バイトの値）。
- ボディは、第6章11.2節のように `req.setEncoding('utf8')` と `data`・`end` のイベントで受け取ります。
- リダイレクト先は、リクエストの `Host` ヘッダ（`req.headers.host`）から作らず、`https://localhost:8443` と決めておきます。なぜ `Host` ヘッダを使ってはいけないのか、2つ目の `curl` の結果から考えてください。
- HSTS を HTTP のレスポンスに付けない理由は、本文7.2節の最後にあります。

## 発展

### 問題9 mkcert がしていることを openssl で再現する

mkcert は「ローカルの認証局を作り、その認証局でサーバの証明書に署名する」ツールです（本文5.3節）。同じことを openssl で行う `make-local-ca.sh` を作ってください。[samples/make-self-signed.sh](../samples/make-self-signed.sh) を読んで、まねするところから始めます。

- 使い方: `bash make-local-ca.sh [作成先] [サーバ証明書の有効日数]`（既定は `~/dev/ch08/local-ca` と `30`）
- 作成先が既にあれば、何もせずにエラーで終わる
- CA の秘密鍵と証明書（`ca-key.pem`、`ca.pem`）を作る。CA の証明書には「他の証明書に署名してよい」という印（`basicConstraints = critical, CA:TRUE` と `keyUsage = critical, keyCertSign, cRLSign`）を付ける
- サーバの秘密鍵と証明書（`server-key.pem`、`server.pem`）を作る。SAN は `localhost`、`127.0.0.1`、`::1`。CA の秘密鍵で署名する
- 秘密鍵のファイルは `chmod 600` にする
- 最後に `openssl verify -CAfile ca.pem server.pem` で確かめ、`server.pem: OK` と表示する
- macOS 標準の `openssl`（LibreSSL）で動くこと（`-addext` のような新しいオプションに頼らず、`make-self-signed.sh` のように設定ファイルを使う）

サーバの証明書は、次の2段階で作ります。

```sh
# 1. 秘密鍵と「証明書署名要求」（CSR。「この名前と公開鍵に署名してください」という申請書）を作る
openssl req -newkey rsa:2048 -nodes -keyout server-key.pem -out server.csr -config server.cnf
# 2. CA の秘密鍵で、CSR に署名して証明書にする
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -days "$DAYS" -sha256 -out server.pem -extfile server.cnf -extensions v3_server
```

作れたら、`my-https-server.mjs` をコピーした `ca-https-server.mjs` で `certDir` を `local-ca` に、ファイル名を `server.pem`・`server-key.pem` に変えて起動し、次を確かめます。

- `curl --cacert ~/dev/ch08/local-ca/ca.pem https://localhost:8444/` が成功する（信頼したのは CA の証明書だけで、サーバの証明書は信頼していないのに成功する。なぜか）
- `node samples/cert-inspect.mjs localhost 8444 --ca ~/dev/ch08/local-ca/ca.pem` で、チェーンが2段になっている

（任意）`ca.pem` を Mac のキーチェーンに「常に信頼」として登録すると、Chrome で警告が出なくなります。試した場合は、**必ず登録を削除**してください。なぜ削除すべきなのか、`ca-key.pem` が漏れた場合を想定して説明します。

### 問題10 証明書の期限を監視するツール

証明書の期限切れは、実際のサービスでもよく起きる障害です（Let's Encrypt の証明書は90日で切れます）。本文6節の `my-cert-check.mjs` を元に、複数のサーバの証明書をまとめて調べる `check-cert.mjs` を作ってください。

- 使い方: `node check-cert.mjs [--warn-days 日数] [--ca ファイル]... ホスト:ポート ...`（`--warn-days` の既定は 30。`--ca` は何回でも指定できる。ポートを省略したら 443）
- それぞれのサーバについて、1行で結果を表示する（調べ終わった順でよい）

  ```
  OK    localhost:8444   残り 29 日（期限 2026-12-08）
  WARN  localhost:9444   残り 4 日（期限 2026-11-13）
  NG    localhost:10444  DEPTH_ZERO_SELF_SIGNED_CERT
  ERROR localhost:11444  接続できません（ECONNREFUSED）
  ```

  - `OK`: 検証に成功し、残りが `--warn-days` 以上
  - `WARN`: 検証に成功したが、残りが `--warn-days` 未満
  - `NG`: 検証に失敗した（信頼できない、名前が合わない、期限切れなど）
  - `ERROR`: 接続できない、または5秒で時間切れ
- 終了ステータスは、`OK` だけなら 0、`WARN` があれば 1、`NG` があれば 2、`ERROR` があれば 3（複数あれば大きい方）。cron や CI から使えるようにするため
- `--ca` を指定しても、**実在のサイトの検証ができる**こと

ヒント:

- `tls.connect` を `for` の中で呼ぶと、全部のサーバに**同時に**接続しに行きます（結果が届いた順に、それぞれの関数が呼ばれる）。終了ステータスは、結果が届くたびに `process.exitCode = Math.max(process.exitCode ?? 0, 今の結果の数)` で大きい方を残します。`process.exitCode` に入れた値は、プログラムが終わるときの終了ステータスになります。
- 時間切れは `socket.setTimeout(5000, () => { ... })` で決め、その中で `socket.destroy()` で接続を切ります。
- 残りの日数は `Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / (24 * 60 * 60 * 1000))`。`new Date(...).toISOString().slice(0, 10)` で `2026-12-08` の形になります。
- `options.ca` を指定すると、Node.js に組み込まれた認証局の一覧の**代わり**になってしまい、実在のサイトが `NG` になります。組み込みの一覧は `tls.rootCertificates`（証明書の文字列の配列）なので、`tls.rootCertificates.concat(足したい証明書の配列)` を `ca` に渡します。

確かめ方（問題9の `make-local-ca.sh` と `ca-https-server.mjs` を使う。`ca-https-server.mjs` は、`certDir` とポートを `process.argv[2]`・`process.argv[3]` で変えられるようにしておく）。コマンドの最後の `&` は「終わるのを待たずに、後ろで動かしておく」という意味で、サーバを3つ起動したまま次のコマンドを打てます。`kill %1 %2 %3` は、`&` で動かした1つ目〜3つ目を止めます。

```sh
$ bash make-local-ca.sh ~/dev/ch08/ca-a 30
$ bash make-local-ca.sh ~/dev/ch08/ca-b 4          # 4日で切れる証明書
$ node ca-https-server.mjs ~/dev/ch08/ca-a 8444 &
$ node ca-https-server.mjs ~/dev/ch08/ca-b 9444 &
$ node samples/https-server.mjs ~/dev/ch08/certs/cert.pem ~/dev/ch08/certs/key.pem 10444 &   # 自己署名
$ node check-cert.mjs --warn-days 10 --ca ~/dev/ch08/ca-a/ca.pem --ca ~/dev/ch08/ca-b/ca.pem \
    localhost:8444 localhost:9444 localhost:10444 localhost:11444 ; echo "終了ステータス: $?"
$ node check-cert.mjs --ca ~/dev/ch08/ca-a/ca.pem github.com example.com   # インターネットに接続して
$ kill %1 %2 %3
```
