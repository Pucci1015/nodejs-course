# 第8章 HTTPS と TLS

第6章・第7章の HTTP は、すべて**平文**（暗号化されていない文字）で流れていました。家の Wi-Fi やカフェのネットワーク、プロバイダの機器など、途中を通る誰もが中身を読み、書き換えられます。**HTTPS** は、HTTP を **TLS**（Transport Layer Security）という仕組みで包んで、この問題を解決したものです。
この章では、TLS を支える暗号の部品を `node:crypto` で1つずつ書いて動かし、証明書と認証局の仕組みを理解してから、自分の Mac で HTTPS のサーバを書きます。第3章11節で「公開鍵の fingerprint を確かめる」ことを学びましたが、その理由もここで分かります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第3章11節（SSH の鍵と fingerprint）、第5章（TCP）、第6章・第7章（HTTP、Cookie、リダイレクト） |
| この章のゴール | ハッシュ・共通鍵暗号・HMAC・署名・鍵交換の役割を区別できる / 証明書のチェーンと検証の流れを説明できる / TLS 1.3 のハンドシェイクの流れが分かる / 自己署名証明書で HTTPS のサーバを書ける / HTTP から HTTPS へ移し、HSTS と `Secure` Cookie を使える |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形、自己署名証明書を作るスクリプト、暗号の部品のデモ、証明書を詳しく調べるツール |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 実習は `~/dev/ch08/` で行います（教材のフォルダは見本として残しておくため）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします（やり方は第5章の「読み方」と同じです）。
>
>   ```sh
>   $ mkdir -p ~/dev/ch08 && cd ~/dev/ch08
>   $ cp -R （ここに Finder から ch08-https-tls の samples と exercises をドラッグ） .
>   ```
>
> - この章のコマンドは、すべて `~/dev/ch08/` で実行します。証明書と秘密鍵も `~/dev/ch08/` の下に作ります（教材のフォルダは OneDrive に同期されるので、秘密鍵を置かない）。
> - 「**手を動かす**」の所は、実際に打って動かしてください。完成形は `samples/` にあります。
> - 外部のサイトに対する出力は、執筆時の**出力例**です。証明書の発行者や有効期限は、サイトや時期によって変わります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| ハッシュ（2.1節） | 第4部の ETag、第10部のパスワードの保存（なぜ SHA-256 ではだめか） |
| HMAC（2.3節） | 第4部 第22章・第5部の署名付き Cookie。第10部のセッション |
| 電子署名・鍵交換（2.4節・2.5節） | 第10部の JWT。SSH や Git の署名の仕組みを理解するとき |
| 証明書と認証局（3節） | 第12部でアプリを公開するとき（HTTPS の設定、証明書の期限切れの調査） |
| `node:https` と自己署名証明書（5節） | 第10部で `Secure` Cookie をローカルで試すとき |
| HTTP から HTTPS へ、HSTS、`Secure` Cookie（7節） | 第10部の安全な認証、第12部の本番の設定 |

---

## 1. HTTP の何が危ないのか

平文の HTTP には、3つの危険があります。

| 危険 | 例 | 守る性質 | TLS での対策 |
| --- | --- | --- | --- |
| **盗聴** | カフェの Wi-Fi で、送ったパスワードや Cookie を読まれる | **機密性** | 共通鍵暗号で暗号化する |
| **改ざん** | 途中の機器が、ページに広告やウイルスを差し込む | **完全性** | 改ざんを検出できる暗号（AES-GCM など）を使う |
| **なりすまし** | 偽の Wi-Fi が、本物そっくりの偽の銀行サイトにつなぐ | **真正性**（相手が本物か） | 証明書で、相手が本物かを確かめる |

3つ目が特に大事です。暗号化していても、**相手が偽物なら、偽物に秘密を送ってしまう**からです。第3章で SSH の接続の最初に fingerprint を確かめたのは、この「相手が本物か」を確かめるためでした。HTTPS では、それを**証明書と認証局**で自動的に行います（3節）。

平文の HTTP が本当に読めることは、Mac の `tcpdump`（通信をのぞくコマンド）で確かめられます。第7章でコピーした `lab-server.mjs` を使います。

```sh
$ node ~/dev/ch07/samples/lab-server.mjs                  # ターミナル1
$ sudo tcpdump -i lo0 -A 'tcp port 8100'                  # ターミナル2
$ curl -b 'session=himitsu' http://localhost:8100/cookie  # ターミナル3
# → ターミナル2に「Cookie: session=himitsu」がそのまま表示される。Ctrl + C で止める
```

| 書き方 | 意味 |
| --- | --- |
| `sudo` | 管理者として実行する（Mac のパスワードを聞かれる）。通信をのぞくには管理者の権限が要る |
| `-i lo0` | `lo0`（ループバック。自分の Mac の中の通信）をのぞく |
| `-A` | 中身を文字として表示する |
| `'tcp port 8100'` | 8100番のポートの TCP だけを表示する |

## 2. 暗号の部品

TLS は、いくつかの暗号の部品を組み合わせて作られています。1つずつ書いて動かしてみましょう。

### 2.1 手を動かす: ハッシュ

**ハッシュ関数**は、どんな長さのデータからも、決まった長さの「指紋」（ハッシュ値）を作ります。第7章5.3節の ETag で使った SHA-256 です。

`~/dev/ch08/hash.mjs` を作ります（完成形は [samples/hash.mjs](samples/hash.mjs)）。

```js
import crypto from 'node:crypto';

for (const text of process.argv.slice(2)) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  console.log(`${text} → ${hash}`);
}
```

`process.argv.slice(2)` は、`node hash.mjs` の後ろに書いた言葉の配列です（第5章）。

```sh
$ node hash.mjs hello hellp
hello → 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
hellp → fdd7585e08c4e2afd71dcabdb4636c89d557a3f42db9e2040c8bbd1708aa4ce7
$ printf hello | shasum -a 256
2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  -
```

`shasum -a 256` は Mac に入っている「SHA-256 を計算するコマンド」です。`printf hello |` で `hello`（改行なし）を渡しています。Node.js と同じ値になりました。SHA-256 は決まった計算なので、どのプログラムで計算しても同じ値になります。

| 性質 | 意味 |
| --- | --- |
| 同じ入力なら同じ出力 | ファイルが壊れていないか、同じものかを確かめられる（第7章の ETag、Git のコミット ID） |
| 少しでも違えば全く違う出力 | `hello` と `hellp` のように、1文字の違いも見逃さない |
| 出力から入力に戻せない | ハッシュ値を見ても、元のデータは分からない |
| 同じ出力になる別の入力を見つけられない | 偽物のファイルを、本物と同じハッシュにできない |

SHA-256 は今も安全ですが、MD5 と SHA-1 は「同じ出力になる別の入力」を作れることが分かっていて、安全のためには使えません。

> パスワードの保存にも「元に戻せない」性質を使いますが、SHA-256 をそのまま使ってはいけません。SHA-256 は**速すぎる**ので、総当たりで元のパスワードを見つけられてしまいます（練習問題6で確かめます）。パスワードには、わざと遅く作られた bcrypt や Argon2 を使います（第10部 第51章）。

### 2.2 共通鍵暗号

**共通鍵暗号**は、暗号化と復号に**同じ鍵**を使います。速いので、実際のデータ（HTTP のリクエストとレスポンス）の暗号化はこれで行います。現在は **AES** と **ChaCha20** がよく使われます。

[samples/crypto-demo.mjs](samples/crypto-demo.mjs) で動きを見ます（中身は読まなくてよい）。

```sh
$ node samples/crypto-demo.mjs aes
== 共通鍵暗号（AES-256-GCM）==
  暗号文: c69b219cd1e4c01a3f7103a6ec7beb18029aecb788ff2c003c
  復号: 残高は 1,000 円です
  改ざんしたものを復号: 失敗（Unsupported state or unable to authenticate data）→ 書き換えられたことが分かる
```

AES-GCM は、暗号化と同時に「改ざんされていないか」を確かめるための値（認証タグ）を作ります。暗号文を1ビットでも書き換えると、復号が失敗します。このように**暗号化と改ざんの検出を同時に行う**方式を AEAD と言い、TLS 1.3 ではこれしか使えません。

問題は、**同じ鍵をどうやって相手と共有するか**です。鍵をそのまま送ると、途中で盗まれます。これを解決するのが 2.5節の鍵交換です。

### 2.3 手を動かす: HMAC

**HMAC** は、秘密の鍵とメッセージから作る「印」です。同じ秘密の鍵を知っている人だけが、正しい HMAC を作れます。

`~/dev/ch08/hmac.mjs` を作ります（完成形は [samples/hmac.mjs](samples/hmac.mjs)）。

```js
import crypto from 'node:crypto';

const secret = 'dev-only-secret-change-me'; // 練習用の仮の鍵。本物の鍵はファイルに書かない

function mac(text) {
  return crypto.createHmac('sha256', secret).update(text).digest('base64url');
}

// サーバが作って、値と一緒に渡す
const tag = mac('user_id=42');
console.log(`user_id=42 の HMAC: ${tag}`);

// 戻ってきたら、同じ鍵で計算し直して比べる
console.log(`user_id=42 と HMAC を確かめる: ${mac('user_id=42') === tag ? '本物' : '偽物'}`);
console.log(`user_id=1  と HMAC を確かめる: ${mac('user_id=1') === tag ? '本物' : '偽物'}`);
```

```sh
$ node hmac.mjs
user_id=42 の HMAC: DUgAzqw5WgB7rAnr9m3Z72S4g6cNIQT-IDSR-p5KeNM
user_id=42 と HMAC を確かめる: 本物
user_id=1  と HMAC を確かめる: 偽物
```

| 書き方 | 意味 |
| --- | --- |
| `crypto.createHmac('sha256', 鍵)` | SHA-256 を使った HMAC を、この鍵で計算する準備 |
| `.digest('base64url')` | 結果を **base64url**（英数字と `-` `_` だけの文字列）で受け取る。Cookie や URL にそのまま入れられる |
| `条件 ? A : B` | 条件が正しければ A、そうでなければ B になる（`if` と `else` を1つの式で書く書き方） |

第7章3.2節で「Cookie は利用者が書き換えられる」ことを確かめました。サーバが Cookie の値に HMAC を付けて渡しておけば、`user_id=1` に書き換えられても、HMAC が合わないので分かります。書き換えた人は秘密の鍵を知らないので、正しい HMAC を作れません。Flask の `session` は、`SECRET_KEY` を鍵にして、これと同じことをしていました。`SECRET_KEY` が漏れると、誰でも正しい HMAC を作れるようになり、好きなユーザーになりすませます。

`secret` の値を1文字変えて、もう一度実行してみましょう。HMAC がまったく違う値になります。

### 2.4 手を動かす: 電子署名

**公開鍵暗号**では、**秘密鍵**と**公開鍵**のペアを使います。秘密鍵は自分だけが持ち、公開鍵は誰に見せてもかまいません。HTTPS で主に使うのは**電子署名**です。秘密鍵で署名を作り、公開鍵で「この署名は、ペアの秘密鍵を持つ人が作ったものか」を確かめます。

`~/dev/ch08/sign.mjs` を作ります（完成形は [samples/sign.mjs](samples/sign.mjs)）。

```js
import crypto from 'node:crypto';

// 鍵のペアを作る。privateKey は自分だけが持ち、publicKey は誰に見せてもよい
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
console.log(publicKey.export({ type: 'spki', format: 'pem' }));

// 秘密鍵で署名する
const message = Buffer.from('localhost の公開鍵はこれです');
const signature = crypto.sign(null, message, privateKey);
console.log(`署名（${signature.length} バイト）: ${signature.toString('base64')}`);

// 公開鍵で確かめる（誰でもできる）
console.log(`元の文を確かめる      : ${crypto.verify(null, message, publicKey, signature)}`);
const changed = Buffer.from('evil.example の公開鍵はこれです');
console.log(`書き換えた文を確かめる: ${crypto.verify(null, changed, publicKey, signature)}`);
```

```sh
$ node sign.mjs
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA8rARSgASTHKM4eitMgEV8/5EdfrJNgF6FuEHWH4/h6Q=
-----END PUBLIC KEY-----

署名（64 バイト）: AF9c7BguAASAzbPz/Pp1mz/...
元の文を確かめる      : true
書き換えた文を確かめる: false
```

| 書き方 | 意味 |
| --- | --- |
| `crypto.generateKeyPairSync('ed25519')` | Ed25519 という方式の鍵のペアを作る。`{ privateKey, publicKey }` の形で受け取る（第6章5.4節の分割代入） |
| `publicKey.export({ type: 'spki', format: 'pem' })` | 公開鍵を、ファイルに保存できる文字の形（**PEM**。`-----BEGIN ...-----` で始まる）にする |
| `Buffer.from(文字列)` | 文字列をバイト列にする（第6章9.4節） |
| `crypto.sign(null, データ, 秘密鍵)` | 署名を作る（Ed25519 では1つ目は `null`） |
| `crypto.verify(null, データ, 公開鍵, 署名)` | 署名が正しければ `true` |

実行するたびに鍵のペアが新しく作られるので、公開鍵と署名は毎回変わります。

| | HMAC | 電子署名 |
| --- | --- | --- |
| 作る鍵 | 秘密の鍵（共通） | 秘密鍵 |
| 確かめる鍵 | **同じ**秘密の鍵 | 公開鍵 |
| 確かめられる人 | 秘密の鍵を知っている人だけ | **誰でも** |
| 使いどころ | 自分で作って自分で確かめる（サーバの Cookie） | 他人に確かめてもらう（証明書、ソフトウェアの配布、SSH） |

第3章で作った SSH の鍵（`~/.ssh/id_ed25519` と `id_ed25519.pub`）も、この Ed25519 です。GitHub は、あなたが秘密鍵で作った署名を、登録された公開鍵で確かめて、本人だと判断しています。

### 2.5 手を動かす: 鍵交換

**鍵交換**（Diffie-Hellman 鍵交換、楕円曲線を使うものは ECDH）は、**公開の場でやり取りしても、2人だけが同じ秘密の値を得られる**仕組みです。

`~/dev/ch08/key-exchange.mjs` を作ります（完成形は [samples/key-exchange.mjs](samples/key-exchange.mjs)）。

```js
import crypto from 'node:crypto';

// クライアントとサーバが、それぞれ使い捨ての鍵のペアを作る
const client = crypto.generateKeyPairSync('x25519');
const server = crypto.generateKeyPairSync('x25519');

// 送り合うのは公開鍵だけ。「自分の秘密鍵」と「相手の公開鍵」から計算する
const clientSecret = crypto.diffieHellman({ privateKey: client.privateKey, publicKey: server.publicKey });
const serverSecret = crypto.diffieHellman({ privateKey: server.privateKey, publicKey: client.publicKey });

console.log(`クライアントが計算した値: ${clientSecret.toString('hex')}`);
console.log(`サーバが計算した値      : ${serverSecret.toString('hex')}`);
console.log(`一致: ${clientSecret.equals(serverSecret)}`);
```

```sh
$ node key-exchange.mjs
クライアントが計算した値: 4a854b00d702115864c3db8f119ba1f8e21b7cb7187154c3c56fa7d4238ae340
サーバが計算した値      : 4a854b00d702115864c3db8f119ba1f8e21b7cb7187154c3c56fa7d4238ae340
一致: true
```

`バイト列.equals(別のバイト列)` は、中身が同じなら `true` です。

途中で公開鍵を盗み見た人は、どちらの秘密鍵も持っていないので、この値を計算できません。TLS では、この値から 2.2節の共通鍵暗号の鍵を作ります。

ただし、鍵交換だけでは「相手が本物か」は分かりません。偽物のサーバとも、問題なく鍵交換ができてしまいます。そこで、**サーバが送ってきた鍵交換の値に、サーバの秘密鍵で署名してもらい**（2.4節）、その署名を証明書の公開鍵で確かめます。

## 3. 証明書と認証局

### 3.1 証明書とは

「この公開鍵は、本当に `example.com` のものか」をどう確かめればよいでしょうか。SSH では、最初の接続のときに fingerprint を自分の目で確かめました（**TOFU**、Trust On First Use）。しかし、Web で初めて開くサイトのたびにそれをするのは現実的ではありません。

そこで HTTPS では、**認証局**（CA、Certificate Authority）という信頼された第三者が、「この公開鍵は example.com のものです」という文書に**署名**します。これが**証明書**（サーバ証明書）です。

| 証明書の中身 | 例 |
| --- | --- |
| 持ち主（Subject）と、使える名前（SAN、Subject Alternative Name） | `example.com`、`www.example.com` |
| 持ち主の公開鍵 | EC P-256 や RSA 2048 ビットの公開鍵 |
| 発行者（Issuer） | 認証局の名前 |
| 有効期間 | 2026年10月1日〜2026年12月30日 |
| 発行者の署名 | 上のすべてに対する、認証局の秘密鍵による署名（2.4節） |

今のブラウザは、名前の確認に **SAN だけ**を見ます（昔使われていた CN は見ません）。

### 3.2 証明書のチェーン

認証局は、普段は**中間認証局**の証明書で署名し、中間認証局の証明書は**ルート認証局**が署名しています。

```
ルート認証局の証明書（自分で自分に署名）       ← Mac やブラウザに最初から入っている
   │ 署名
   ▼
中間認証局の証明書                            ← サーバが一緒に送る
   │ 署名
   ▼
example.com の証明書（サーバの公開鍵が入っている） ← サーバが送る
```

ブラウザは、サーバから届いた証明書の署名を、1つ上の証明書の公開鍵で確かめ、それを繰り返して、**自分が最初から信頼しているルート認証局**にたどり着けるかを調べます。ルートの秘密鍵はとても大事なので、普段は金庫のような設備にしまわれ、日々の署名は中間認証局が行います。

Mac が信頼しているルート認証局は、「**キーチェーンアクセス**」（アプリケーション → ユーティリティ）の「システムルート」で見られます。

### 3.3 ブラウザが確かめること

| 確かめること | 失敗したときのブラウザの表示の例 |
| --- | --- |
| 信頼しているルートまでチェーンがつながるか | `NET::ERR_CERT_AUTHORITY_INVALID` |
| 証明書の名前（SAN）が、URL のホスト名と一致するか | `NET::ERR_CERT_COMMON_NAME_INVALID` |
| 有効期間内か | `NET::ERR_CERT_DATE_INVALID` |
| 失効していないか（秘密鍵が漏れたなどの理由で取り消されていないか） | `NET::ERR_CERT_REVOKED` |

証明書は「**名前と公開鍵の結び付き**」を保証するだけです。「サイトの運営者が善良か」は保証しません。詐欺のサイトでも、自分のドメインの証明書は取れます。

### 3.4 認証局から証明書をもらう

認証局は、証明書を発行する前に、申請した人が**そのドメインを本当に管理しているか**を確かめます。例えば「`http://example.com/.well-known/acme-challenge/...` に、こちらが指定した文字列を置いてください」や「DNS に、指定した TXT レコードを登録してください」（第5章5.1節）と頼み、それができた人だけに発行します。

**Let's Encrypt** は、この手順を自動で行う無料の認証局です。有効期間が短く（執筆時点では90日。さらに短くする計画が発表されています）、自動で更新する前提になっています。第12部でアプリを公開するときは、PaaS や CDN がこれを自動で行ってくれます。

### 3.5 実在のサイトの証明書を見る

ブラウザでは、アドレスバーの左のアイコン → 「この接続は保護されています」→「証明書は有効です」で見られます。好きなサイトを開いて、持ち主・発行者・有効期間・チェーンを確かめてみましょう。

コマンドでは、[samples/cert-inspect.mjs](samples/cert-inspect.mjs)（中身は読まなくてよい。6節で、この小さい版を自分で書きます）で見られます。

```sh
$ node samples/cert-inspect.mjs example.com          # 出力例
== 接続 example.com:443 ==
TLS のバージョン: TLSv1.3
暗号の組み合わせ: TLS_AES_256_GCM_SHA384
ALPN で決まったもの: h2
検証の結果: OK（信頼できる証明書）

== 証明書のチェーン（サーバの証明書 → 発行者 → …）==
[0] 持ち主: *.example.com
    発行者: DigiCert Global G3 TLS ECC SHA384 2020 CA1（DigiCert Inc）
    使える名前（SAN）: DNS:*.example.com, DNS:example.com
    有効期間: 2026-01-15T00:00:00.000Z 〜 2027-01-15T23:59:59.000Z（残り 72 日）
    公開鍵: EC prime256v1
  [1] 持ち主: DigiCert Global G3 TLS ECC SHA384 2020 CA1（DigiCert Inc）
      発行者: DigiCert Global Root G3（DigiCert Inc）
    [2] 持ち主: DigiCert Global Root G3（DigiCert Inc）
        発行者: DigiCert Global Root G3（DigiCert Inc）
```

## 4. TLS 1.3 のハンドシェイク

TCP の接続ができた後、HTTP のデータを送る前に、TLS の準備（**ハンドシェイク**）を行います。TLS 1.3（2018年）では、**1往復**で準備が終わります。

```
クライアント                                                      サーバ
  │ ── ClientHello ─────────────────────────────────────────────▶ │
  │    ・使える暗号の一覧                                          │
  │    ・鍵交換の公開鍵（key_share）           ← 2.5節              │
  │    ・接続したいホスト名（SNI）              ← 1つの IP で複数のサイト │
  │    ・話せる HTTP のバージョン（ALPN）       ← h2, http/1.1      │
  │                                                               │
  │ ◀──────────────────────────────────────────── ServerHello ── │
  │                         ・選んだ暗号、サーバの鍵交換の公開鍵      │
  │      ＝＝＝ ここから先は、鍵交換で作った鍵で暗号化される ＝＝＝     │
  │ ◀── EncryptedExtensions（選んだ ALPN など）──────────────────── │
  │ ◀── Certificate（証明書のチェーン）──────────────────── 3節 ── │
  │ ◀── CertificateVerify（ここまでのやり取りへの、サーバの署名） 2.4節 │
  │ ◀── Finished ─────────────────────────────────────────────── │
  │ ── Finished ─────────────────────────────────────────────────▶ │
  │ ══ HTTP のリクエスト（暗号化）═══════════════════════════════▶ │
```

ポイントは次のとおりです。

- クライアントは、サーバが選びそうな方式を予想して、**最初から鍵交換の値を送る**ので、1往復で済みます（TLS 1.2 では2往復でした）。
- サーバは、**ここまでのやり取り全体**に秘密鍵で署名します（CertificateVerify）。クライアントは、証明書の公開鍵でそれを確かめます。これで「このサーバは、証明書の秘密鍵を持っている（本物だ）」と分かり、途中で誰かが鍵交換の値をすり替えていないことも分かります。
- 鍵交換の鍵のペアは**接続ごとに使い捨て**です（2.5節の `key-exchange.mjs` が、実行するたびに違う値になったのと同じ）。後でサーバの秘密鍵が盗まれても、過去に録音された通信は復号できません。これを **前方秘匿性**（Forward Secrecy）と言います。
- **SNI** は暗号化される前に送られるので、途中の人には「どのサイトに接続したか」は分かります（中身は分かりません）。これを隠す ECH という仕組みも広がり始めています。

5節で HTTPS のサーバを動かしたら、`curl -v` でこの流れを見ます。

## 5. 自分の Mac で HTTPS を動かす

開発中に HTTPS が必要になる場面があります。`Secure` 属性の Cookie（7節）、HTTP/2、一部のブラウザの機能（カメラ、位置情報、Service Worker など。ただし `localhost` は特別に HTTPS と同じ扱いを受けることが多い）、本番と同じ構成での確認などです。

### 5.1 手を動かす: 自己署名証明書を作る

まず、認証局を使わず、**自分で自分に署名した証明書**（自己署名証明書）を作ります。[samples/make-self-signed.sh](samples/make-self-signed.sh) は、`openssl` コマンドで証明書と秘密鍵を作るスクリプトです（中身は読まなくてよい。練習問題9で読みます）。

```sh
$ bash samples/make-self-signed.sh        # ~/dev/ch08/certs に cert.pem と key.pem を作る
作成しました:
  証明書: /Users/alice/dev/ch08/certs/cert.pem（有効期間 30 日）
  秘密鍵: /Users/alice/dev/ch08/certs/key.pem（他人に渡さない。Git に入れない）

subject=CN = localhost, O = nodejs-course self-signed
issuer=CN = localhost, O = nodejs-course self-signed
...
$ cat ~/dev/ch08/certs/cert.pem
-----BEGIN CERTIFICATE-----
MIIDlzCCAn+gAwIBAgIU...
```

`bash ファイル` は、シェルスクリプトを実行します（第1章）。`subject`（持ち主）と `issuer`（発行者）が同じなのが、自己署名の印です。証明書も、2.4節の公開鍵と同じ PEM の形で保存されています。

### 5.2 手を動かす: node:https でサーバを書く

`~/dev/ch08/my-https-server.mjs` を作ります（完成形は [samples/my-https-server.mjs](samples/my-https-server.mjs)。7.2節で1行足したものです）。第6章11節の `node:http` のサーバと、ほとんど同じです。

```js
import https from 'node:https';
import fs from 'node:fs';

const certDir = `${process.env.HOME}/dev/ch08/certs`;
const options = {
  cert: fs.readFileSync(`${certDir}/cert.pem`), // 証明書（公開鍵が入っている）
  key: fs.readFileSync(`${certDir}/key.pem`), // 秘密鍵
};

const server = https.createServer(options, (req, res) => {
  console.log(`${req.method} ${req.url}`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`HTTPS で届きました: ${req.method} ${req.url}\n`);
});

server.listen(8444, '127.0.0.1', () => {
  console.log('https://localhost:8444/ で待ち受けています');
});
```

| 書き方 | 意味 |
| --- | --- |
| `process.env.HOME` | 環境変数 `HOME`（ホームフォルダ。`/Users/あなたの名前`）。`~` は Node.js では使えないので、こうして作る |
| `fs.readFileSync(ファイル)` | ファイルを読み込む。`await fs.readFile` と違い、読み終わるまで待つ書き方。起動するときに1回だけ読むなら、これで十分 |
| `https.createServer(options, 関数)` | HTTPS のサーバを作る。`options` に証明書と秘密鍵を渡す。関数の書き方は `http.createServer` と同じ |

```sh
$ node my-https-server.mjs                                  # ターミナル1
https://localhost:8444/ で待ち受けています

$ curl https://localhost:8444/                              # ターミナル2
curl: (60) SSL certificate problem: self-signed certificate
```

curl（とブラウザ）は、この証明書の発行者を信頼していないので、接続を止めました。ブラウザで開くと「この接続ではプライバシーが保護されません」（`NET::ERR_CERT_AUTHORITY_INVALID`）と表示されます。

```sh
$ curl --cacert ~/dev/ch08/certs/cert.pem https://localhost:8444/hello
HTTPS で届きました: GET /hello
```

`--cacert ファイル` は「この証明書を、信頼する認証局として使う」という意味です。自分で作った証明書なので、自分で信頼すると決めました。

`-v` を付けると、4節のハンドシェイクが見られます（出力例。curl の版によって表示が違います）。

```sh
$ curl -v --cacert ~/dev/ch08/certs/cert.pem https://localhost:8444/ 2>&1 | grep -E 'TLS|SSL|ALPN'
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / X25519 / RSASSA-PSS
```

（`2>&1` は「エラー出力も普通の出力に混ぜる」。curl の `-v` の表示はエラー出力に出るので、`grep` に渡すために付けます。`grep -E` は第6章10節。）

`TLS_AES_256_GCM_SHA384 / X25519 / RSASSA-PSS` は、「データの暗号化に AES-256-GCM（2.2節）、鍵交換に X25519（2.5節）、署名に RSA-PSS（2.4節）」という意味です。この章の部品がすべて登場しています。

> **`curl -k`（`--insecure`）は使わない習慣を付けましょう**。`-k` は証明書の検証を**すべて**止めるので、偽物のサーバにも黙って接続します。ネットで調べると「エラーが出たら `-k` を付ける」という情報がよく出てきますが、それは HTTPS の3つ目の守り（なりすまし対策）を捨てることです。Node.js の `NODE_TLS_REJECT_UNAUTHORIZED=0` も同じで、本番のコードには決して入れてはいけません。

[samples/https-server.mjs](samples/https-server.mjs)（8443番。中身は読まなくてよい）は、`node:http2` で HTTP/2 にも対応させ、TLS のバージョンや ALPN の結果を返すサーバです。`node samples/https-server.mjs ~/dev/ch08/certs/cert.pem ~/dev/ch08/certs/key.pem` で起動し、`curl --cacert ~/dev/ch08/certs/cert.pem https://localhost:8443/` で、HTTP のバージョンが `2.0` になることを確かめられます（第7章9節）。

実際のアプリでは、Node.js のサーバで直接 HTTPS を扱うことは少なく、手前の中継サーバ（ロードバランサや PaaS）が HTTPS を終わらせて、Node.js には HTTP で転送する構成がほとんどです（第12部）。

### 5.3 mkcert

自己署名証明書は、ブラウザで警告が出るたびに「詳細設定 → 進む」を押す必要があり、不便です。**mkcert** は、自分の Mac の中だけで使う**ローカルの認証局**を作って Mac とブラウザに信頼させ、その認証局で `localhost` の証明書を発行してくれるツールです。

```sh
$ brew install mkcert
$ mkcert -install          # ローカルの認証局を作り、Mac のキーチェーンに「信頼する」として登録する（パスワードを聞かれる）
Created a new local CA 💥
The local CA is now installed in the system trust store! ⚡️

$ mkdir -p ~/dev/ch08/mkcert && cd ~/dev/ch08/mkcert
$ mkcert localhost 127.0.0.1 ::1
...
The certificate is at "./localhost+2.pem" and the key at "./localhost+2-key.pem" ✅
$ cd ~/dev/ch08
```

（出力は mkcert の版によって少し違います。）`samples/https-server.mjs` にこの2つのファイルを渡して起動すると、ブラウザで警告なしに `https://localhost:8443/` が開けます。

| | 自己署名証明書 | mkcert |
| --- | --- | --- |
| 発行者 | 自分自身 | 自分の Mac のローカル認証局 |
| ブラウザの警告 | 出る | 出ない（ローカル認証局を信頼したので） |
| チェーン | 1段 | 2段（ローカル認証局 → localhost） |
| 他の人の Mac | 警告が出る | 警告が出る（その人の Mac はあなたのローカル認証局を信頼していない） |

> **注意**: mkcert のローカル認証局の秘密鍵（`mkcert -CAROOT` で表示されるフォルダの `rootCA-key.pem`）は、**他人に絶対に渡さないでください**。これがあれば、あなたの Mac が信頼する**どんなサイトの証明書でも**作れてしまい、あなたの通信を偽のサイトに誘導できます。dotfiles などのリポジトリに入れないように注意しましょう。使わなくなったら `mkcert -uninstall` で登録を外せます。

### 5.4 Node.js から接続するとき

Node.js（`fetch` など）は、Mac のキーチェーンではなく、**Node.js に組み込まれた認証局の一覧**を使います。そのため、mkcert の証明書を使ったサーバにブラウザでは警告なしで接続できても、Node.js からはエラーになります。

```sh
$ node -e "fetch('https://localhost:8444/').then((r) => r.text()).then(console.log)"
TypeError: fetch failed
  [cause]: Error: self-signed certificate ...       （エラーの文は状況によって違う）

$ NODE_EXTRA_CA_CERTS=~/dev/ch08/certs/cert.pem node -e "fetch('https://localhost:8444/').then((r) => r.text()).then(console.log)"
HTTPS で届きました: GET /
```

`node -e "コード"` は、ファイルを作らずにコードを実行します。`NODE_EXTRA_CA_CERTS` は「この証明書も信頼する認証局に加える」という環境変数です（`名前=値 コマンド` で、そのコマンドにだけ環境変数を渡す）。mkcert なら `NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"` です。

## 6. 手を動かす: 証明書を調べるプログラム

ブラウザや curl が行っている「証明書の検証」を、`node:tls` で自分で行ってみます。`~/dev/ch08/my-cert-check.mjs` を作ります（完成形は [samples/my-cert-check.mjs](samples/my-cert-check.mjs)）。第5章4節の `net.connect` の TLS 版です。

```js
import tls from 'node:tls';
import fs from 'node:fs';

const host = process.argv[2] ?? 'localhost';
const port = Number(process.argv[3] ?? 443);
const caFile = process.argv[4];

const options = {
  host,
  port,
  servername: host, // SNI: どのサイトの証明書が欲しいか（4節）
  rejectUnauthorized: false, // 検証に失敗しても切らずに、結果を見る（調べるためのツールなので）
};
if (caFile !== undefined) options.ca = fs.readFileSync(caFile); // この証明書を信頼する

const socket = tls.connect(options, () => {
  const cert = socket.getPeerCertificate();
  console.log(`持ち主: ${cert.subject.CN}`);
  console.log(`発行者: ${cert.issuer.CN}`);
  console.log(`期限  : ${cert.valid_to}`);
  console.log(`検証  : ${socket.authorized ? 'OK' : `NG（${socket.authorizationError}）`}`);
  socket.end();
});

socket.on('error', (err) => {
  console.log(`接続できません（${err.code}）`);
});
```

| 書き方 | 意味 |
| --- | --- |
| `{ host, port }` | `{ host: host, port: port }` の省略形（名前が同じときに使える） |
| `tls.connect(options, 関数)` | TLS で接続する。ハンドシェイクが終わったら関数が呼ばれる |
| `socket.getPeerCertificate()` | 相手の証明書。`subject.CN`（持ち主）、`issuer.CN`（発行者）、`valid_to`（期限）など |
| `socket.authorized` | 検証に成功したら `true` |
| `socket.authorizationError` | 失敗した理由（`DEPTH_ZERO_SELF_SIGNED_CERT` なら「1段目が自己署名」） |
| `options.ca` | 信頼する認証局の証明書。指定しなければ、Node.js に組み込まれた一覧を使う |

`my-https-server.mjs` を起動したまま試します。

```sh
$ node my-cert-check.mjs localhost 8444
持ち主: localhost
発行者: localhost
期限  : Dec  9 10:40:41 2026 GMT
検証  : NG（DEPTH_ZERO_SELF_SIGNED_CERT）
$ node my-cert-check.mjs localhost 8444 ~/dev/ch08/certs/cert.pem
...
検証  : OK
$ node my-cert-check.mjs localhost 8999
接続できません（ECONNREFUSED）
$ node my-cert-check.mjs example.com                      # インターネットに接続して（出力例）
持ち主: *.example.com
発行者: DigiCert Global G3 TLS ECC SHA384 2020 CA1
期限  : Jan 15 23:59:59 2027 GMT
検証  : OK
```

`rejectUnauthorized: false` は、5.2節の `curl -k` と同じく、検証に失敗しても接続を続ける設定です。このプログラムは「何が問題か」を表示するためにあえて使っていますが、**データをやり取りするプログラムでは使ってはいけません**。

（ホスト名に `127.0.0.1` のような IP アドレスを渡すと、「SNI に IP アドレスを入れてはいけない」という警告が出ます。SNI には名前だけを入れる決まりだからです。）

## 7. HTTPS を徹底させる

### 7.1 手を動かす: HTTP から HTTPS へリダイレクトする

利用者がアドレスバーに `example.com` とだけ入力すると、ブラウザは（設定によっては）まず `http://` で接続します。そこでサーバは、`http://` へのリクエストを `https://` へリダイレクトします（第7章4節）。

`~/dev/ch08/to-https.mjs` を作ります（完成形は [samples/to-https.mjs](samples/to-https.mjs)）。

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url} → HTTPS へ`);
  res.statusCode = 308; // メソッドとボディを保ったまま移動する（第7章4.2節）
  res.setHeader('Location', `https://localhost:8444${req.url}`);
  res.end();
});

server.listen(8180, '127.0.0.1', () => {
  console.log('http://localhost:8180/ で待ち受けています（HTTPS へリダイレクトする）');
});
```

`my-https-server.mjs` も起動したまま、別のターミナルで試します。

```sh
$ curl -i http://localhost:8180/hello
HTTP/1.1 308 Permanent Redirect
Location: https://localhost:8444/hello
...
$ curl -L --cacert ~/dev/ch08/certs/cert.pem -d 'x=1' http://localhost:8180/memo
HTTPS で届きました: POST /memo
```

308 なので、POST は POST のまま HTTPS に届きました。

しかし、この**最初の1回の HTTP**は暗号化されていません。偽の Wi-Fi は、ここでリダイレクトを止めて、偽のページを見せることができます。

### 7.2 手を動かす: HSTS

**HSTS**（HTTP Strict Transport Security）は、HTTPS のレスポンスに付けるヘッダで、「この先しばらく、このサイトには HTTPS でしか接続しないで」とブラウザに覚えさせます。

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

一度これを受け取ったブラウザは、`max-age` の秒数の間、`http://` と入力されても自分で `https://` に書き換えて接続し、証明書のエラーがあっても「進む」ボタンを出しません。最初の1回の問題も無くすために、主要なブラウザに「最初から HTTPS で接続するドメイン」として登録する **HSTS プリロード**という仕組みもあります（`.dev` や `.app` のドメインは、ドメイン全体が登録されています）。

`my-https-server.mjs` の `res.setHeader('Content-Type', ...)` の次に、1行足します。

```js
  res.setHeader('Strict-Transport-Security', 'max-age=300'); // 300秒は HTTPS だけで接続して
```

```sh
$ curl -si --cacert ~/dev/ch08/certs/cert.pem https://localhost:8444/ | grep -i strict
Strict-Transport-Security: max-age=300
```

（`-s` は進み具合を表示しない、`-i` はヘッダも表示する、`grep -i` は大文字・小文字を区別せずに探す、です。）

> HSTS は取り消しにくい設定です。`max-age` を長くしてから HTTPS をやめると、利用者はそのサイトを開けなくなります。最初は短い値（`max-age=300` など）で試し、問題が無いことを確かめてから長くします。ブラウザで `https://localhost:8444/` を開いた後、5分間は `http://localhost` の他のサーバを開けなくなることがあります（ブラウザの版によります）。そうなったら、Chrome の `chrome://net-internals/#hsts` の「Delete domain security policies」に `localhost` と入れて消します。

HSTS は **HTTP のレスポンスに付けても無視されます**。HTTP のレスポンスは途中で書き換えられるので、信用できないからです。

### 7.3 Secure Cookie と混在コンテンツ

- Cookie に **`Secure`** 属性を付けると、HTTPS のときだけ送られます（第7章3.3節）。ログインの Cookie には必ず付けます。付けないと、7.1節の最初の HTTP のリクエストに Cookie が付いて、盗まれます。
- HTTPS のページの中で、`http://` の画像やスクリプトを読み込むことを**混在コンテンツ**（mixed content）と言います。スクリプトを書き換えられると、ページ全体を乗っ取られるので、ブラウザは `http://` のスクリプトの読み込みを止めます（画像は自動で `https://` に書き換えて試すことがあります）。

## まとめ

- 平文の HTTP には、盗聴・改ざん・なりすましの危険がある。TLS は暗号化・改ざんの検出・相手の確認で守る。
- 部品の役割: ハッシュは指紋、共通鍵暗号（AES-GCM）はデータの暗号化と改ざんの検出、HMAC は秘密の鍵を知る人だけが作れる印、電子署名は誰でも確かめられる印、鍵交換は公開の場で共通の鍵を作る。
- 証明書は「名前と公開鍵の結び付き」に認証局が署名したもの。ブラウザは、チェーン・名前（SAN）・有効期間を確かめる。
- TLS 1.3 は1往復で準備が終わり、接続ごとに使い捨ての鍵で前方秘匿性を持つ。
- `https.createServer` に証明書と秘密鍵を渡せば、HTTPS のサーバになる。ローカルでは自己署名証明書か mkcert を使う。`curl -k` や `rejectUnauthorized: false` で検証を止めない。
- HTTP は 308 で HTTPS へ移し、HSTS と `Secure` Cookie で、HTTP に戻らないようにする。

## 練習問題

[exercises/README.md](exercises/README.md) に10問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「Transport Layer Security」: https://developer.mozilla.org/ja/docs/Web/Security/Transport_Layer_Security
- MDN「Strict-Transport-Security」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Strict-Transport-Security
- RFC 8446（TLS 1.3）: https://www.rfc-editor.org/rfc/rfc8446
- The Illustrated TLS 1.3 Connection（ハンドシェイクを1バイトずつ解説したページ。英語）: https://tls13.xargs.org/
- Let's Encrypt「仕組み」: https://letsencrypt.org/ja/how-it-works/
- mkcert: https://github.com/FiloSottile/mkcert
- Node.js ドキュメント `crypto`: https://nodejs.org/docs/latest/api/crypto.html 、`tls`: https://nodejs.org/docs/latest/api/tls.html 、`https`: https://nodejs.org/docs/latest/api/https.html

前の章: [第7章 HTTP の詳細](../ch07-http-details/README.md) ／ 次の章: [第9章 ブラウザの仕組み](../ch09-browser/README.md)
