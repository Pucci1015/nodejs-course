# 第8章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 問題 | ポート |
| --- | --- | --- |
| [file-hash.mjs](file-hash.mjs) | 1 | — |
| [hmac-v2.mjs](hmac-v2.mjs) | 2 | — |
| [sign-v2.mjs](sign-v2.mjs) | 3 | — |
| [crack-pin.mjs](crack-pin.mjs) | 6 | — |
| [signed-value.mjs](signed-value.mjs) | 7 | — |
| [secure-redirect-server.mjs](secure-redirect-server.mjs) | 8 | 8080（HTTP）、8443（HTTPS） |
| [make-local-ca.sh](make-local-ca.sh) | 9（発展） | — |
| [ca-https-server.mjs](ca-https-server.mjs) | 9・10（発展） | 8444（引数で変えられる） |
| [check-cert.mjs](check-cert.mjs) | 10（発展） | — |

模範解答を動かして試すときも、`cp -R` で `solutions` を `~/dev/ch08/` にコピーしてから、`~/dev/ch08` で `node solutions/ファイル名` のように動かします。HTTPS のサーバは、`bash samples/make-self-signed.sh` で作った `~/dev/ch08/certs` の証明書を使います。

自分の Mac の中で完結する例の出力は、この教材の作成時に実際に動かした結果です（時間や日付、ランダムな値は毎回変わります）。

---

## 基本

## 問題1 ファイルのハッシュを計算する

模範解答は [file-hash.mjs](file-hash.mjs) です。

```js
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

for (const file of process.argv.slice(2)) {
  const data = await fs.readFile(file); // バイト列のまま読む
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  console.log(`${hash}  ${file}`); // shasum と同じく、空白2つで区切る
}
```

```sh
$ node solutions/file-hash.mjs samples/hash.mjs
4c7da498731f9eb7c1d4ff9dc1791e2c43a5cbf503af640803c9995822a90a28  samples/hash.mjs
$ shasum -a 256 samples/hash.mjs
4c7da498731f9eb7c1d4ff9dc1791e2c43a5cbf503af640803c9995822a90a28  samples/hash.mjs
```

**2.** コピーした直後は、中身がまったく同じなのでハッシュも同じです（ファイル名や作った日時はハッシュに関係しません。中身のバイト列だけで決まります）。1文字変えると、ハッシュは**まったく違う値**になります。「少し似た値」にはなりません。

`fs.readFile` に `'utf8'` を付けずに読むと、バイト列のまま受け取ります。画像のような文字ではないファイルでも、そのままハッシュを計算できます。

## 問題2 HMAC を作るコマンドと確かめるコマンド

模範解答は [hmac-v2.mjs](hmac-v2.mjs) です。

```js
function check(text, tag) {
  return mac(text) === tag;
}

const command = process.argv[2];
const text = process.argv[3];
const tag = process.argv[4];

if (command === 'make' && text !== undefined) {
  console.log(mac(text));
} else if (command === 'check' && text !== undefined && tag !== undefined) {
  console.log(check(text, tag) ? '本物' : '偽物');
} else {
  console.log('使い方: node hmac-v2.mjs make 値 / node hmac-v2.mjs check 値 HMAC');
}
```

- 確かめる側は、受け取った HMAC を「元に戻す」のではなく、**同じ鍵で計算し直して比べます**。HMAC はハッシュと同じく、元には戻せません。
- `secret` を変えると、前に作った HMAC は `偽物` になります。秘密の鍵を変える（ローテーションする）と、それまでに発行した署名付きの値がすべて使えなくなるのは、このためです。
- ここでは `===` で比べていますが、サーバで使うときは、問題7のように `crypto.timingSafeEqual` で比べます。

## 問題3 別の鍵のペアでは確かめられないことを確かめる

模範解答は [sign-v2.mjs](sign-v2.mjs) です。

```js
const a = crypto.generateKeyPairSync('ed25519');
const b = crypto.generateKeyPairSync('ed25519');

const message = Buffer.from('localhost の公開鍵はこれです');
const signature = crypto.sign(null, message, a.privateKey);

console.log(`a の公開鍵で確かめる: ${crypto.verify(null, message, a.publicKey, signature)}`);
console.log(`b の公開鍵で確かめる: ${crypto.verify(null, message, b.publicKey, signature)}`);
```

```
a の公開鍵で確かめる: true
b の公開鍵で確かめる: false
```

**証明書にとっての意味**: 認証局の公開鍵で確かめて `true` になる署名は、**その認証局の秘密鍵を持つ者にしか作れません**。だから、ブラウザが認証局の公開鍵（Mac に最初から入っているルート証明書）で証明書の署名を確かめられれば、「その認証局が発行した本物の証明書だ」と分かります。偽物を作ろうとしても、自分の鍵（`b`）で署名したものは、認証局の公開鍵（`a`）では `false` になります。

## 問題4 証明書のエラーを調べる

| 操作 | 結果 | 理由（本文3.3節の表） |
| --- | --- | --- |
| 1. `curl https://localhost:8444/` | `curl: (60) SSL certificate problem: self-signed certificate` | 信頼しているルートまでたどれない（自己署名の証明書は、誰も信頼していない） |
| 2. `--cacert` 付き | 成功 | この証明書を信頼すると指定したので、チェーンがつながる。名前も `localhost` で一致 |
| 3. `https://127.0.0.1:8444/` | 成功 | SAN に `IP Address:127.0.0.1` があるので、名前（IP アドレス）も一致する |
| 4. `myapp.test` | `curl: (60) SSL: no alternative certificate subject name matches target host name 'myapp.test'` | 信頼はしているが、SAN に `myapp.test` が無いので、名前が一致しない |
| 5. Chrome | 「この接続ではプライバシーが保護されません」`NET::ERR_CERT_AUTHORITY_INVALID`。証明書の「発行先」と「発行元」がどちらも `localhost` | 自己署名で、Chrome（Mac のキーチェーン）はこの証明書を信頼していない |

```sh
$ openssl x509 -in ~/dev/ch08/certs/cert.pem -noout -ext subjectAltName
X509v3 Subject Alternative Name:
    DNS:localhost, IP Address:127.0.0.1, IP Address:0:0:0:0:0:0:0:1
```

`0:0:0:0:0:0:0:1` は IPv6 の `::1`（第5章）を省略せずに書いたものです。

4 は、信頼の問題（チェーン）と、名前の問題（SAN）が**別々に**確かめられていることを示しています。どちらか1つでも失敗すれば、接続は止まります。（curl の版によって、エラーの文は少し違います。）

## 問題5 中間者攻撃を考える

**1.** ブラウザは、証明書の発行者を**信頼するルートまでたどれない**ので、`NET::ERR_CERT_AUTHORITY_INVALID` の警告を出し、ページを表示しません。利用者が警告を無視して「進む」を押さない限り、攻撃は成功しません。だからこそ「**証明書の警告を無視して進まない**」ことが大切です。

**2.** 証明書は公開されている情報なので、攻撃者も本物の証明書を送ることはできます。しかしサーバは、**ハンドシェイクのやり取り全体に、証明書の秘密鍵で署名**して送ります（CertificateVerify）。攻撃者は `bank.example` の秘密鍵を持っていないので、正しい署名を作れません（問題3の `b` の鍵と同じで、自分の鍵で署名しても、証明書の公開鍵では `false` になる）。証明書を持っていることは本人の証明にならず、**秘密鍵を持っていること**を署名で示して、初めて本人だと分かります。

**3.**

- **HSTS が無い場合**: ブラウザは最初に `http://bank.example` へ接続します。偽の Wi-Fi は、この平文のリクエストを受け取り、HTTPS へのリダイレクトを返さずに、自分で本物のサイトと HTTPS で話しながら、利用者には HTTP のまま中身を見せることができます。利用者がアドレスバーに鍵のマークが無いことに気付かなければ、そのままパスワードを入力してしまいます。
- **HSTS が有る場合**: 以前に `bank.example` を開いて HSTS を受け取っていれば、ブラウザは最初から `https://` で接続するので、平文のリクエストが流れません。偽の証明書を送られても、「進む」ボタンが出ません。ただし、**初めて開くとき**は HSTS をまだ知らないので守られません。HSTS プリロードは、この最初の1回も守ります。

**4.**

| | SSH（初回に確かめて覚える） | HTTPS（認証局） |
| --- | --- | --- |
| 良い点 | 第三者を信頼しなくてよい。仕組みが簡単 | 初めて接続する相手でも、自動で確かめられる。利用者が何もしなくてよい |
| 弱い点 | **最初の1回**に攻撃されると見破れない（fingerprint をきちんと確かめない人が多い） | **認証局を信頼する**必要がある。どれか1つの認証局が誤って偽の証明書を発行すると、どのサイトでもなりすましができてしまう |

認証局の弱い点を補うために、発行されたすべての証明書を公開の記録に残す **Certificate Transparency** という仕組みがあり、ブラウザは記録に載っていない証明書を受け付けません。

## 応用

## 問題6 速いハッシュでは暗証番号を守れないことを確かめる

模範解答は [crack-pin.mjs](crack-pin.mjs) です。

```js
let start = performance.now();
let found = '見つかりませんでした';
for (let i = 0; i <= 9999; i++) {
  const pin = String(i).padStart(4, '0');
  const hash = crypto.createHash('sha256').update(pin).digest('hex');
  if (hash === target) {
    found = pin;
    break; // 見つかったら for を抜ける
  }
}
console.log(`SHA-256: 暗証番号は ${found}（${(performance.now() - start).toFixed(1)} ミリ秒）`);
```

```sh
$ node solutions/crack-pin.mjs
SHA-256: 暗証番号は 7351（14.5 ミリ秒）
scrypt: 1回 35.3 ミリ秒 → 10000通りを試すと約 353 秒
```

**1.** 暗証番号は `7351` で、0.01秒ほどで見つかりました。4桁の暗証番号は1万通りしかないので、ハッシュ化しても**全部試せば必ず見つかります**。「ハッシュは元に戻せない」は「計算で逆向きにたどれない」という意味で、「当てずっぽうで見つけられない」という意味ではありません。

**2.** scrypt は1回に数十ミリ秒かかるように作られていて、SHA-256 の数千〜数万倍遅くなります。正しいパスワードでログインする人にとっては、1回 0.03秒の遅れは気になりません。しかし総当たりする人にとっては、試す回数だけ遅くなります。scrypt は計算に**大量のメモリ**も使うので、GPU（単純な計算を大量に並行して行える部品）でまとめて計算しにくくなっています。第10部では、同じ目的の bcrypt や Argon2 を使います。

**3.** **ソルト**は、利用者ごとに変えるランダムな値で、パスワードと一緒にハッシュ化し、ハッシュ値と一緒に保存します（秘密にする必要はありません）。ソルトが無いと、次の問題が起きます。

- **同じパスワードの人が分かる**: ハッシュ値が同じになるので、1人のパスワードが分かれば、同じハッシュ値の全員のパスワードが分かります。
- **事前に計算した表が使える**: 「0000〜9999 のハッシュ値の表」や「よく使われるパスワードのハッシュ値の表」を1度作っておけば、漏れたハッシュ値を表で引くだけで見つかります。ソルトがあると、利用者ごとに表を作り直す必要があるので、この方法が使えません。

## 問題7 署名付きの値を作る

模範解答は [signed-value.mjs](signed-value.mjs) です。

```js
export function sign(value, secret, { maxAgeSec, now = Date.now() } = {}) {
  if (secret.length < 16) throw new Error('秘密の鍵は16文字以上にしてください');
  let exp = null; // 期限が無い
  if (maxAgeSec !== undefined) exp = now + maxAgeSec * 1000;
  // 期限も中身に入れて、一緒に署名する（期限だけを書き換えられないように）
  const payload = Buffer.from(JSON.stringify({ v: value, exp })).toString('base64url');
  return `${payload}.${mac(payload, secret)}`;
}

export function verify(signed, secret, { now = Date.now() } = {}) {
  if (typeof signed !== 'string') return null;
  const parts = signed.split('.');
  if (parts.length !== 2) return null;
  const payload = parts[0];
  const given = Buffer.from(parts[1]);
  const expected = Buffer.from(mac(payload, secret));

  if (given.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(given, expected)) return null;

  // 署名が正しいと分かってから、中身を読む
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (data.exp !== null && now > data.exp) return null; // 期限切れ
  return data.v;
}
```

```sh
$ cd exercises
$ MODULE=../solutions/signed-value.mjs node --test signed-value.test.mjs
ℹ pass 12
ℹ fail 0
```

- **`{ v: value, exp }`**: `{ v: value, exp: exp }` の省略形です（名前が同じときに使える）。
- **期限も署名する**: 期限を署名の外に置くと、攻撃者は値と署名をそのままにして、期限だけを延ばせます。値と期限を1つの JSON にまとめて、全体に署名しています（テスト「期限の情報も署名で守られている」）。
- **`.` で区切れる理由**: base64url は英数字と `-` `_` だけを使うので、`.` は中身にも署名にも出てきません。
- **署名を確かめてから中身を読む**: 署名が正しいことを確かめる前に `JSON.parse` すると、攻撃者が作った任意のデータを処理することになります。必ず先に署名を確かめます。

**問い1.** `exercises` フォルダで確かめてみます（期限の値は実行した時刻によって変わります）。

```sh
$ node -e "
import('../solutions/signed-value.mjs').then(({ sign }) => {
  const signed = sign('user:42', 'test-secret-0123456789abcdef', { maxAgeSec: 60 });
  console.log(signed);
  console.log(Buffer.from(signed.split('.')[0], 'base64url').toString());
});"
eyJ2IjoidXNlcjo0MiIsImV4cCI6MTc5MzgwMzQ0NjMyMX0.PCDRaCIIEDVCUxyXMfH_9GKOJqhciP1ja97BijuQEcA
{"v":"user:42","exp":1793803446321}
```

base64url は暗号化ではなく、ただの「書き方の変換」です。署名は**書き換え**を防ぎますが、**読まれる**ことは防ぎません。パスワード、個人情報（住所や電話番号）、API キーなど、利用者に見られて困るものは入れてはいけません。Flask の `session` も、署名されているだけで暗号化されていないので、中身は誰でも読めます。

**問い2.** `===` は、先頭から1文字ずつ比べて、**違う文字が見つかった時点で終わります**。1文字目から違えばすぐに終わり、10文字目まで合っていれば少し長くかかります。何万回も試して、返事が返るまでの時間を細かく測れば、「何文字目まで合っているか」を推測できる可能性があります（**タイミング攻撃**）。`timingSafeEqual` は、どこで違っても全体を比べるので、時間から情報が漏れません。

## 問題8 HTTP から HTTPS へ移すサーバ

模範解答は [secure-redirect-server.mjs](secure-redirect-server.mjs) です。

```js
const HTTPS_ORIGIN = 'https://localhost:8443';

const httpServer = http.createServer((req, res) => {
  res.statusCode = 308; // メソッドとボディを保ったまま移動する
  res.setHeader('Location', HTTPS_ORIGIN + req.url);
  res.end();
});
// ...
const httpsServer = https.createServer(options, (req, res) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Strict-Transport-Security', 'max-age=300');
    if (req.url === '/') {
      const sid = crypto.randomBytes(16).toString('base64url'); // 推測できないランダムな値
      res.setHeader('Set-Cookie', `sid=${sid}; Path=/; Secure; HttpOnly; SameSite=Lax`);
    }
    res.end(`HTTPS で届きました\nメソッド: ${req.method}\nパス: ${req.url}\nボディ: ${body || '（なし）'}\n`);
  });
});
```

```sh
$ curl -si 'http://localhost:8080/a?b=1' | grep -i location
Location: https://localhost:8443/a?b=1
$ curl -si -H 'Host: evil.example' http://localhost:8080/ | grep -i location
Location: https://localhost:8443/
$ curl -si --cacert ~/dev/ch08/certs/cert.pem https://localhost:8443/ | grep -iE 'strict|set-cookie'
Strict-Transport-Security: max-age=300
Set-Cookie: sid=a4F9Mzqv1xEgsUQKvypJ3A; Path=/; Secure; HttpOnly; SameSite=Lax
```

- **`Host` ヘッダからリダイレクト先を作らない**: `Host` ヘッダは利用者が自由に書けます。`` `https://${req.headers.host}${req.url}` `` のように作ると、`Host: evil.example` を送られたときに `https://evil.example/` へリダイレクトしてしまいます。手前に CDN などのキャッシュがあると、**この偽のリダイレクトがキャッシュされ、他の利用者も別のサイトに飛ばされる**ことがあります。決まった値を使うか、許可したホスト名の一覧と照らし合わせます。
- **HTTP のレスポンスに HSTS を付けない**: ブラウザは HTTP で受け取った HSTS を無視する決まりです。HTTP のレスポンスは途中で誰でも書き換えられるので、信用できないからです。
- **308 でも、最初の1回は守れない**: HTTP で送られた POST のボディ（`memo=1`）は、リダイレクトされる前に**平文で流れてしまっています**。リダイレクトは「次から HTTPS にする」ための仕組みで、だから HSTS が必要です。
- **`Secure` Cookie**: `sid` は HTTPS のときだけ送られます。利用者がうっかり `http://localhost:8080/` を開いても、そのリクエストには `sid` が付かないので、平文で流れません。

## 発展

## 問題9 mkcert がしていることを openssl で再現する

模範解答は [make-local-ca.sh](make-local-ca.sh) です。

```sh
$ bash solutions/make-local-ca.sh
作成しました（/Users/alice/dev/ch08/local-ca）:
  ca.pem          CA の証明書（信頼するときに使う。配ってよい）
  ca-key.pem      CA の秘密鍵（これがあれば何の証明書でも作れる。絶対に渡さない）
  server.pem      localhost の証明書（30 日）
  server-key.pem  localhost の秘密鍵

server.pem: OK
```

手順は、本物の認証局から証明書をもらうときと同じです。

```
(1) CA の鍵と、自己署名の CA 証明書を作る       openssl req -x509 ... -config ca.cnf
(2) サーバの鍵と、証明書署名要求（CSR）を作る    openssl req -newkey ... -out server.csr
(3) CA の秘密鍵で CSR に署名し、証明書にする     openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem ...
```

本物の世界では、(2) をサーバの運営者が行い、CSR（公開鍵と名前だけが入っていて、秘密鍵は入っていない）を認証局に送ります。認証局はドメインの持ち主かを確かめてから (3) を行います。**サーバの秘密鍵は、認証局にも渡しません**。

**つまずきやすいところ**:

- `basicConstraints = CA:TRUE` を付け忘れると、その証明書で署名した証明書は検証に失敗します（「この証明書は認証局ではない」）。
- サーバ証明書に `subjectAltName` を付け忘れると、curl やブラウザは名前が合わないと判断します（問題4の4と同じ）。
- `-extfile` で拡張を指定しないと、`openssl x509 -req` は CSR の拡張（SAN など）を**コピーしません**。サーバ証明書の拡張は、署名するときの設定ファイルに書きます。

**確かめ**（[ca-https-server.mjs](ca-https-server.mjs) を使う）:

```sh
$ node solutions/ca-https-server.mjs                          # ターミナル1
$ curl --cacert ~/dev/ch08/local-ca/ca.pem https://localhost:8444/
HTTPS で届きました: GET /
$ node samples/cert-inspect.mjs localhost 8444 --ca ~/dev/ch08/local-ca/ca.pem
...
検証の結果: OK（信頼できる証明書）
[0] 持ち主: localhost（nodejs-course）
    発行者: nodejs-course local CA（nodejs-course）
...
  [1] 持ち主: nodejs-course local CA（nodejs-course）
      発行者: nodejs-course local CA（nodejs-course）
```

信頼したのは CA の証明書だけですが、サーバの証明書には CA の署名があり、CA の公開鍵で確かめられる（問題3）ので、チェーンがつながって成功します。[1] は持ち主と発行者が同じ、つまり自己署名の**ルート**です。

**キーチェーンに登録したら削除する理由**: キーチェーンに `ca.pem` を「常に信頼」で登録すると、Mac（と Safari、Chrome）は、この CA が署名した証明書を、本物の認証局の証明書と**同じように信頼**します。もし `ca-key.pem` が漏れたら（OneDrive に同期された、dotfiles と一緒に GitHub に上げた、など）、それを手に入れた人は `bank.example` でも `github.com` でも、**あなたの Mac が信じる偽の証明書**を作れます。偽の Wi-Fi などと組み合わせると、あなたの HTTPS の通信を警告なしにのぞけてしまいます。実験が終わったら、キーチェーンアクセスで登録した証明書を削除します。

## 問題10 証明書の期限を監視するツール

模範解答は [check-cert.mjs](check-cert.mjs) です。

```sh
$ node solutions/check-cert.mjs --warn-days 10 --ca ~/dev/ch08/ca-a/ca.pem --ca ~/dev/ch08/ca-b/ca.pem \
    localhost:8444 localhost:9444 localhost:10444 localhost:11444 ; echo "終了ステータス: $?"
ERROR localhost:11444  接続できません（ECONNREFUSED）
OK    localhost:8444   残り 29 日（期限 2026-12-09）
WARN  localhost:9444   残り 3 日（期限 2026-11-13）
NG    localhost:10444  DEPTH_ZERO_SELF_SIGNED_CERT
終了ステータス: 3
```

接続できない 11444 は、TLS のハンドシェイクが要らないので、いちばん先に結果が出ました。30日の証明書が「残り 29 日」、4日の証明書が「残り 3 日」になるのは、作った直後でも少し足りない分を切り捨てるからです。

中心の部分は次のとおりです。

```js
function report(level, target, message) {
  console.log(`${level.padEnd(5)} ${target.padEnd(16)} ${message}`);
  process.exitCode = Math.max(process.exitCode ?? 0, LEVELS[level]);
}

for (const target of targets) {
  const [host, portText] = target.split(':');
  const options = { host, port: Number(portText ?? 443), servername: host, rejectUnauthorized: false };
  if (caList.length > 0) options.ca = tls.rootCertificates.concat(caList);

  const socket = tls.connect(options, () => {
    // 証明書を見て OK / WARN / NG を report する
  });
  socket.setTimeout(5000, () => {
    report('ERROR', target, '時間切れ');
    socket.destroy();
  });
  socket.on('error', (err) => {
    report('ERROR', target, `接続できません（${err.code}）`);
  });
}
```

- **同時に調べる**: `tls.connect` は接続を始めるだけで、終わるのを待ちません。`for` で全部のサーバに接続を始め、結果が届いた順に関数が呼ばれます。1つが時間切れでも、他を待たせません。
- **`padEnd(5)`**: 5文字になるまで後ろに空白を足します。列がそろって読みやすくなります。
- **`authorizationError`**: チェーンの失敗（`UNABLE_TO_VERIFY_LEAF_SIGNATURE` など）だけでなく、名前の不一致（`ERR_TLS_CERT_ALTNAME_INVALID`）や期限切れ（`CERT_HAS_EXPIRED`）もここに入ります。
- **`ca` の落とし穴**: `ca` を指定すると、Node.js に組み込まれた認証局の一覧の**代わり**になります。自分の CA だけを渡すと、`github.com` の検証が失敗するようになります。`tls.rootCertificates.concat(caList)` で、組み込みの一覧に足しています。
- **ポートを省略したとき**: `'example.com'.split(':')` は `['example.com']` なので、`portText` は `undefined` になり、`?? 443` で 443 になります。

実在のサイトに対しては（出力例）:

```
$ node solutions/check-cert.mjs --ca ~/dev/ch08/ca-a/ca.pem github.com example.com
OK    github.com       残り 85 日（期限 2027-01-29）
OK    example.com      残り 72 日（期限 2027-01-15）
```

**使いどころ**: この終了ステータスを使えば、cron（定期的にコマンドを実行する仕組み）や GitHub Actions（第11部）で毎日実行し、1以上なら通知する、という監視が作れます。
