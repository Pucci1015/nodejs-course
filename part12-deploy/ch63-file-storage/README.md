# 第63章 ファイルの保存

タスクに画像を添付する、プロフィールの写真を置く。こうした**利用者のファイル**は、アプリのディスクに置くと、デプロイのたびに消え、台数を増やすと見えなくなります（第62章 2節）。この章では、**オブジェクトストレージ**（Amazon S3 と、同じ API を持つサービス）に置く方法を学びます。SDK で置く・取り出す、署名付き URL の仕組みを自分で作って確かめる、アップロードを安全に受け取る、ダウンロードで渡す、テストのために置き場所を取り替えられるようにする、を手を動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第62章、第4部 第20章（ボディを読む・中身で種類を調べる）、第2部 第8章（HMAC）、第11部 第57章（契約テスト） |
| この章のゴール | ファイルをディスクやデータベースでなく、オブジェクトストレージに置く理由を説明できる / SDK で置く・取り出す・一覧にする・消すができる / 署名付き URL を、HMAC を重ねて自分で作れる / アップロードを、大きさと中身で確かめ、利用者の名前をキーに使わずに置ける / `Content-Disposition` と `nosniff` で、ダウンロードを安全に渡せる / 置き場所を形（interface）で隠し、偽物と本物に同じ契約テストを当てられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | S3 のクライアント、置く・取り出す例、手で作る署名付き URL、アップロードのサーバ、`BlobStore` と契約テスト |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part12/ch63-file-storage/` で実行します（`cd ~/dev/part12/ch63-file-storage`）。
> - 練習用の S3 互換のサーバ（[../tools/mini-s3.ts](../tools/mini-s3.ts)）を、**別のターミナル**で起動しておきます。`cd ~/dev/part12 && npm run s3` で、`http://127.0.0.1:9800` で待ちます。中身はメモリに覚えるだけなので、止めると消えます。
> - 5節のアップロードのサーバは **9837** で待ちます。
> - 本物のクラウドのストレージ（Amazon S3 など）は使いません。9節で、選び方だけを説明します。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| オブジェクトストレージと SDK（2・3節） | 成果物（タスクの添付ファイル） |
| 署名付き URL（4節） | 第65章（CDN から配るとき、だれに見せるか）、成果物（添付を開く） |
| アップロードの確かめ方・ダウンロードの渡し方（5・6節） | 成果物 |
| `BlobStore` と契約テスト（7節） | 成果物（テストはメモリ、本番は S3）、第64章（ジョブから消す） |
| 孤児を掃除する（8節） | 第64章（定期実行のジョブにする） |

---

## 1. ファイルをどこに置くか

| 置き場所 | 良い所 | 困る所 |
| --- | --- | --- |
| アプリのディスク（`uploads/` フォルダ） | 簡単。開発ではよく使う | PaaS では、デプロイのたびに消える。2台目のアプリからは見えない |
| データベース（`bytea` の列） | 行と一緒に消える・バックアップされる | 大きなファイルでデータベースが重くなる。配るたびにデータベースとアプリを通る |
| **オブジェクトストレージ** | 何台のアプリからも同じものが見える。大きさの心配が少ない。安い。ブラウザに直接配れる（4・6節） | 外のサービスなので、つながらないことがある。データベースとの食い違いに気をつける（8節） |

本番では、**ファイルの中身はオブジェクトストレージ、ファイルの情報（名前・大きさ・持ち主・キー）はデータベース**に置くのがふつうです。

**Flask では**: `request.files['photo']` で受け取ったファイルを、`f.save(os.path.join(UPLOAD_FOLDER, secure_filename(f.filename)))` でディスクに保存し、`send_from_directory` で返すのが、チュートリアルの形でした。`secure_filename` は、名前から `../` などを取り除く Werkzeug の関数です。本番では Flask でも、boto3（Python の AWS の SDK）で S3 に置きます。この章の Node.js の書き方は、その boto3 とほとんど同じ形です。

## 2. オブジェクトストレージ

### 2.1 言葉

| 言葉 | 意味 |
| --- | --- |
| **バケット**（bucket） | 入れ物。アプリ（や環境）ごとに作る。名前は `task-files` など |
| **キー**（key） | バケットの中での名前。`users/42/2026/11/xxxx.png` のように `/` を含めてよい |
| **オブジェクト**（object） | キーで置いた、ファイルの中身と、少しの情報（`Content-Type`、大きさ、ETag、置いた時刻） |
| フォルダ | **無い**。`users/42/` は、キーの頭が同じものを `Prefix` で一覧にしているだけ |
| 上書き | 同じキーに置くと、前のものは置き換わる（バージョンを残す設定もある） |

S3 の API は HTTP です。`PUT /バケット/キー` で置き、`GET /バケット/キー` で取り出します。ただし、すべての頼みに**署名**（4節）が要ります。

### 2.2 手を動かす: 署名の無い頼みは断られる

`npm run s3` の画面には、こう出ています。

```
練習用の S3: http://127.0.0.1:9800（アクセスキー dev-only-access-key、バケット task-files, demo）
```

`curl` で、署名を付けずに頼んでみます。

```sh
$ curl -s -i http://127.0.0.1:9800/demo/notes/2026/a.txt
HTTP/1.1 403 Forbidden
Connection: close
Content-Type: application/xml
…

<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>AccessDenied</Code><Message>署名がありません</Message><Resource>/demo/notes/2026/a.txt</Resource><RequestId>128b17ad-…</RequestId></Error>
```

S3 のエラーは、JSON ではなく **XML** で返ります。`Code` が、エラーの種類です（`AccessDenied`・`NoSuchKey`・`SignatureDoesNotMatch` など）。本物の S3 でも、同じ `Code` が返ります。

## 3. SDK で使う

署名を毎回自分で作るのは大変なので、ふつうは AWS の SDK（`@aws-sdk/client-s3`）を使います。S3 互換のサーバ（Cloudflare R2・MinIO など）にも、同じ SDK でつなげます。

### 3.1 手を動かす: クライアントを作る

[samples/s3-client.ts](samples/s3-client.ts) を作ります。ほかのサンプルが、これを import します。

```ts
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';

export const BUCKET = process.env.S3_BUCKET ?? 'demo';

export function createS3Client(overrides: S3ClientConfig = {}): S3Client {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9800',
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'dev-only-access-key',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'dev-only-secret-key',
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...overrides,
  });
}
```

| 設定 | 意味 |
| --- | --- |
| `endpoint` | つなぎ先。本物の Amazon S3 なら書かない（リージョンから決まる）。R2・MinIO・mini-s3 は書く |
| `region` | リージョン（データを置く地域）。署名にも使う。mini-s3 と R2 は `us-east-1`・`auto` などの決まった値 |
| `credentials` | **アクセスキー**（だれか）と**シークレット**（署名の鍵）。秘密の値なので、本番は環境変数で（第60章 6節）。**必ず明示して渡す**。渡さないと、SDK は `~/.aws/credentials` や `AWS_…` の環境変数にある、本物の鍵を探しに行く |
| `forcePathStyle: true` | URL を `http://ホスト/バケット/キー` の形にする。付けないと `http://バケット.ホスト/キー` の形になり、`127.0.0.1` では使えない |
| `requestChecksumCalculation` | 3.3節 |
| `...overrides` | 呼ぶ側が、一部だけ変えられるようにする（テストで `endpoint` を変えるなど） |

### 3.2 手を動かす: 置く・取り出す・一覧・消す

[samples/s3-try.ts](samples/s3-try.ts) です。SDK は、1つの操作を1つの **Command**（`PutObjectCommand` など）にして、`s3.send(…)` で送ります。

```ts
await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'notes/hello.txt', Body: 'こんにちは', ContentType: 'text/plain; charset=utf-8' }));
const got = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'notes/hello.txt' }));
console.log('取り出しました:', await got.Body?.transformToString(), got.ContentType, got.ContentLength, 'バイト');
```

```sh
$ node samples/s3-try.ts
置きました。ETag: "c0e89a293bd36c7a768e4e9d2c5475a8"
取り出しました: こんにちは text/plain; charset=utf-8 15 バイト
一覧: notes/2026/a.txt 1
一覧: notes/hello.txt 15
消した後に取り出すと: NoSuchKey
```

| 書き方 | 意味 |
| --- | --- |
| `PutObjectCommand` の `Body` | 文字列・Buffer・ストリーム（3.3節）。`ContentType` を付けないと、取り出すときに `application/octet-stream`（種類の分からないバイト）になる |
| `ETag` | 中身から作った印（第2部 第7章 5節の ETag と同じ考え）。小さなファイルでは MD5 |
| `got.Body` | ストリーム。`transformToString()`・`transformToByteArray()` で全部読む。大きいものは `pipe` で流す |
| `ListObjectsV2Command` の `Prefix` | キーの頭が同じものだけ。1回で最大 1000 件。続きは `ContinuationToken`（7.1節） |
| `err.name` | SDK のエラーは、`name` に S3 の `Code`（`NoSuchKey` など）が入る。`instanceof` より、これで見分けるのが簡単 |
| `DeleteObjectCommand` | 無いキーを消しても、成功になる |

「こんにちは」が 15 バイトなのは、UTF-8 で日本語1文字が3バイトだからです（第2部 第7章 2節）。

### 3.3 手を動かす: ストリームのまま置く

大きなファイルは、メモリに全部読まず、ストリームのまま置きます（第3部 第15章）。[samples/stream-upload.ts](samples/stream-upload.ts) です。

```ts
await s3.send(
  new PutObjectCommand({
    Bucket: BUCKET,
    Key: `uploads/${path.basename(file)}`,
    Body: fs.createReadStream(file),
    ContentLength: size, // 長さを先に教える（S3 は、長さの分からない送り方を断る。練習問題4の6）
  }),
);
```

3MB の乱数のファイルを作って置きます。`head -c 3000000 /dev/urandom` は「`/dev/urandom`（乱数が出てくる特別なファイル）の先頭 3000000 バイト」です。

```sh
$ head -c 3000000 /dev/urandom > big.bin
$ node samples/stream-upload.ts big.bin
置きました: uploads/big.bin（3000000 バイト）
```

`CHECKSUM=default` を付けて、SDK の既定の設定で送ってみます。

```sh
$ CHECKSUM=default node samples/stream-upload.ts big.bin
An error was encountered in a non-retryable streaming request.
失敗: NotImplemented 501 aws-chunked の送り方には対応していません。クライアントに requestChecksumCalculation: 'WHEN_REQUIRED' を付けてください
```

執筆時点の SDK は、既定（`WHEN_SUPPORTED`）では、置くたびに中身のチェックサム（CRC32 など）を計算し、ストリームを **aws-chunked** という特別な形に包んで送ります。Amazon S3 はこれを受け付けますが、S3 互換のサービスには、対応していないものがあります（mini-s3 もその1つ）。`WHEN_REQUIRED` にすると、チェックサムが必須の操作のときだけ付けます。つなぐ先の説明に従って選びます。`rm big.bin` で消しておきます。

## 4. 署名付き URL

### 4.1 署名の仕組み

S3 の署名（**AWS 署名バージョン4**、SigV4）は、HMAC（第2部 第8章 2節）を何回も重ねたものです。

1. 頼みを、決まった形の文字列にする（**正規化したリクエスト**: メソッド・パス・クエリ・ヘッダ）
2. 時刻・範囲（日付/リージョン/s3/aws4_request）と、1 のハッシュをつないで、「署名する文字列」を作る
3. シークレットを、日付・リージョン・サービスの順に HMAC して、**その日・そのリージョンだけの鍵**を作る
4. 3 の鍵で、2 を HMAC したものが署名

サーバは、同じ手順で署名を計算し、送られた署名と比べます。合えば「シークレットを知っている人が、この頼みを、この時刻に作った」と分かります。シークレットそのものは、通信に一度も出ません。mini-s3 の `verifySignature`（[../tools/mini-s3.ts](../tools/mini-s3.ts)）が、サーバ側の確かめ方です。読んでみると、手順がそのまま書いてあります。

署名を、ヘッダではなく **URL のクエリ**に入れたものが、**署名付き URL**（presigned URL）です。URL を持っている人はだれでも、期限まで、その1つの操作だけができます。シークレットを渡さずに、ブラウザに「このファイルだけ、60 秒だけ見てよい」と許せます。

### 4.2 手を動かす: 署名付き URL を自分で作る

[samples/sign-by-hand.ts](samples/sign-by-hand.ts) を作ります。上の 1〜4 を、そのまま書いたものです。

```ts
// 1. 時刻と「範囲」（scope）
const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const date = amzDate.slice(0, 8);
const scope = `${date}/${region}/s3/aws4_request`;

// 2. 正規化したリクエスト
const path = `/${bucket}/${key.split('/').map(enc).join('/')}`;
const query = new Map([
  ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
  ['X-Amz-Credential', `${accessKeyId}/${scope}`],
  ['X-Amz-Date', amzDate],
  ['X-Amz-Expires', String(expires)],
  ['X-Amz-SignedHeaders', 'host'],
]);
const canonicalQuery = [...query].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
const canonicalRequest = ['GET', path, canonicalQuery, `host:${endpoint.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');

// 3. 署名する文字列
const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');

// 4. その日だけの鍵で署名
const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), 's3'), 'aws4_request');
const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
```

| 行 | 意味 |
| --- | --- |
| `toISOString().replace(…)` | `2026-11-18T14:17:14.123Z` → `20261118T141714Z`（`-`・`:`・ミリ秒を取る）。時刻は UTC |
| `enc` | `encodeURIComponent` に加えて、`! ' ( ) *` も `%XX` にする（AWS の決まり。`encodeURIComponent` はこの5つを残す） |
| `key.split('/').map(enc).join('/')` | キーの `/` はそのまま、ほかの文字は `%XX` に |
| `.sort(…)` | クエリは、名前の順に並べてから署名する（サーバも同じ順に並べて計算するので、順番の違いで署名が変わらない） |
| `X-Amz-SignedHeaders` が `host` | 署名に含めるヘッダは `Host` だけ。ブラウザがほかのヘッダを付けても合う |
| `UNSIGNED-PAYLOAD` | ボディのハッシュは署名しない（GET にボディは無い。PUT で中身を決めないためにも使う） |
| `hmac(hmac(hmac(hmac(…))))` | 3 の「その日だけの鍵」。この鍵が漏れても、その日・そのリージョン・S3 にしか使えない |

3.2節で置いた `notes/2026/a.txt` の URL を、2秒の期限で作って、開いてみます（`$(…)` は、中のコマンドの出力を文字列として使う zsh の書き方です）。

```sh
$ node samples/s3-try.ts > /dev/null        # notes/2026/a.txt を置き直す
$ U=$(node samples/sign-by-hand.ts notes/2026/a.txt 2)
$ echo "$U"
http://127.0.0.1:9800/demo/notes/2026/a.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=dev-only-access-key%2F20261118%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261118T141714Z&X-Amz-Expires=2&X-Amz-SignedHeaders=host&X-Amz-Signature=458013f84a5e37e16132055fb7dea60deb6f41f6d753e4f6b0674e49968eb803
$ curl -s "$U"
a
```

署名を自分で作った URL で、取り出せました。2秒待ってから、もう一度開きます。

```sh
$ curl -s "$U"
<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>AccessDenied</Code><Message>Request has expired</Message>…</Error>
```

期限が切れました。今度は 60 秒の URL を作り、URL の `X-Amz-Expires=60` の所を、手で `X-Amz-Expires=3600` に書き換えてから開きます。

```sh
$ curl -s "（X-Amz-Expires を 3600 に書き換えた URL）"
<?xml version="1.0" encoding="UTF-8"?>
<Error><Code>SignatureDoesNotMatch</Code><Message>署名が合いません（キー・時刻・ヘッダ・パスのどれかが違います）</Message>…</Error>
```

期限もクエリの一部として署名されているので、書き換えると署名が合わなくなります。URL を受け取った人は、期限を延ばせません。

### 4.3 手を動かす: SDK で作る

ふだんは、SDK の `getSignedUrl`（`@aws-sdk/s3-request-presigner`）で作ります。[samples/presign.ts](samples/presign.ts) です。

```ts
const getUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({
    Bucket: BUCKET,
    Key: 'notes/2026/a.txt',
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent('メモ.txt')}`,
  }),
  { expiresIn: 60 },
);

const putUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({ Bucket: BUCKET, Key: 'uploads/from-browser.png', ContentType: 'image/png' }),
  { expiresIn: 300, signableHeaders: new Set(['content-type']) },
);
```

| 書き方 | 意味 |
| --- | --- |
| `ResponseContentDisposition` | 取り出すときに返す `Content-Disposition` を、URL で決める（6.1節）。クエリの `response-content-disposition` になり、署名に含まれる |
| `expiresIn` | 秒。S3 の上限は 7 日（604800 秒） |
| `signableHeaders` | 署名に含めるヘッダを足す。`content-type` を含めると、置く人は同じ `Content-Type` で送らないと 403 になる |

```sh
$ node samples/presign.ts
GET: http://127.0.0.1:9800/demo/notes/2026/a.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&…&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27%25E3%2583%25A1%25E3%2583%25A2.txt&x-amz-checksum-mode=ENABLED&x-id=GetObject
PUT: http://127.0.0.1:9800/demo/uploads/from-browser.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&X-Amz-SignedHeaders=content-type%3Bhost&x-id=PutObject
```

GET の URL を `curl -s -D - "（GET の URL）"` で開くと、`content-disposition: attachment; filename*=UTF-8''%E3%83%A1%E3%83%A2.txt` が付いて返ります（`-D -` は、ヘッダも画面に出す。第2部 第6章）。PUT の URL には、`curl -X PUT -H 'content-type: image/png' --data-binary @ファイル "（PUT の URL）"` で置けます。`content-type: text/html` で送ると、`SignatureDoesNotMatch` で断られました。

## 5. アップロードを受け取る

### 5.1 キーは自分で決める

利用者が付けたファイルの名前（`../../ねこ.png`）を、そのままキーに使ってはいけません。

| 名前をキーに使うと | 理由 |
| --- | --- |
| ほかの人のファイルを上書きできる | 同じ名前（`photo.png`）で置き直される。`users/2/…` のような、ほかの人の場所を指す名前も作れる |
| 名前が分かれば、ほかの人のファイルを推測できる | 公開のバケットなら、URL を当てられる |
| 使えない文字・長すぎる名前 | ストレージごとに決まりが違う |

キーは、`files/（randomUUID() で作った ID）` のように**アプリが決め**、利用者の名前は、データベースに**表示用として**だけ持ちます。練習問題1で、ユーザーと年月で分けたキーを作ります。

### 5.2 手を動かす: 受け取って置くサーバ

[samples/upload-server.ts](samples/upload-server.ts) は、ファイルを受け取り、中身を確かめてから、ストレージに置くサーバです。まず、種類を確かめる [samples/sniff.ts](samples/sniff.ts) を作ります。名前の拡張子や、送られた `Content-Type` は、送る人が自由に書けるので信じず、**先頭のバイト**（マジックナンバー）で決めます（第4部 第20章）。

```ts
const SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

export function sniff(data: Buffer): string | undefined {
  for (const { type, bytes } of SIGNATURES) {
    if (data.length >= bytes.length && bytes.every((b, i) => data[i] === b)) return type;
  }
  return undefined;
}
```

サーバの、受け取る所です。

```ts
app.post('/files', express.raw({ type: () => true, limit: '5mb' }), async (req, res) => {
  const body: unknown = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) { /* 400 */ }
  const type = sniff(body);
  if (type === undefined) { /* 415 */ }
  const id = randomUUID();
  const key = `files/${id}`; // キーに、利用者が付けた名前を使わない
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type }));
  // …名前などを files（Map）に覚えて、201 を返す
});
```

| 書き方 | 意味 |
| --- | --- |
| `express.raw({ type: () => true, limit: '5mb' })` | ボディを、どの `Content-Type` でも Buffer で受け取る。5MB を超えたら、読むのをやめて `entity.too.large` のエラーにする（第4部 第20章の `readBody` と同じ仕事） |
| `ContentType: type` | 送られた `Content-Type` ではなく、中身で決めた種類で置く |
| 最後の `onError` | `entity.too.large` を 413 の JSON にする（Express のエラーのミドルウェア。第5部 第24章） |

サーバを起動し、別のターミナルで、PNG の先頭だけを持つ小さなファイルを置きます。`printf` は、`\x89` のような書き方で、文字にできないバイトも書けるコマンドです。

```sh
$ node samples/upload-server.ts
http://127.0.0.1:9837/ で待っています
```

```sh
$ printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' > cat.png
$ curl -s -i --data-binary @cat.png --url-query 'name=ねこ.png' http://127.0.0.1:9837/files
HTTP/1.1 201 Created
Location: /files/2e1a8e9e-7f08-462f-8967-f9d3f9ea5009
Content-Type: application/json; charset=utf-8
…

{"id":"2e1a8e9e-7f08-462f-8967-f9d3f9ea5009","key":"files/2e1a8e9e-7f08-462f-8967-f9d3f9ea5009","name":"ねこ.png","type":"image/png","size":16}
```

| オプション | 意味 |
| --- | --- |
| `--data-binary @cat.png` | ファイルの中身を、そのままボディにして POST する（`-d` と違い、改行などを変えない） |
| `--url-query 'name=ねこ.png'` | クエリを、`%XX` にしてから URL に足す（curl 7.87 以降）。日本語をそのまま URL に書くと、Node.js が 400 で断る |

PNG でないファイルと、5MB を超えるファイルも送ってみます。

```sh
$ echo hello > note.txt
$ curl -s --data-binary @note.txt --url-query 'name=a.png' http://127.0.0.1:9837/files
{"error":"PNG・JPEG・GIF だけを受け付けます"}
$ head -c 6000000 /dev/zero > big0
$ curl -s --data-binary @big0 http://127.0.0.1:9837/files
{"error":"5MB までです"}
```

名前が `a.png` でも、中身がテキストなので 415 で断りました。`/dev/zero` は、0 のバイトが出てくる特別なファイルです。

5MB までを Buffer に読んでから置くのは、中身を確かめてから置きたいからです。もっと大きなファイル（動画など）を受け付けるなら、先頭だけを読んで確かめ、残りをストリームのまま流すか、次の 5.3節のように、ブラウザから直接置かせます。

### 5.3 ブラウザから直接置かせる

アプリを通すと、大きなファイルほど、アプリのメモリと時間を使います。代わりに、アプリは**置くための署名付き URL**（4.3節の PUT）だけを作り、ブラウザがストレージに直接置く、というやり方があります。

1. ブラウザ → アプリ: 「`ねこ.png`（image/png、120KB）を置きたい」
2. アプリ: 大きさと種類を確かめ、キーを決め、データベースに「置く途中」の行を作り、PUT の署名付き URL を返す
3. ブラウザ → ストレージ: その URL に PUT する（ストレージに、そのオリジンからの **CORS**（第2部 第9章）を許しておく。mini-s3 は `S3_CORS_ORIGINS`）
4. ブラウザ → アプリ: 「置き終わった」
5. アプリ: `HeadObjectCommand` で、本当に置かれたか・大きさが合っているかを確かめ、先頭を読んで種類を確かめ、行を「置いた」にする。合わなければ消す

手順が増え、2 と 5 の間に、ストレージにだけあってデータベースには無いもの（8節の孤児）ができえます。この教材の成果物は、添付ファイルが小さいので、5.2節の「アプリが受け取る」形にします。

## 6. ダウンロードで渡す

### 6.1 `Content-Disposition`

**`Content-Disposition`** ヘッダで、ブラウザに「開く」か「保存する」か、保存するならどんな名前か、を伝えます。

| 値 | ブラウザ |
| --- | --- |
| `inline` | その場で表示する（画像・PDF） |
| `attachment; filename="cat.png"` | 保存する。名前は `cat.png` |
| `attachment; filename*=UTF-8''%E3%81%AD%E3%81%93.png` | 名前に日本語を使うときの書き方（RFC 6266・5987）。`UTF-8''` の後ろに `%XX` で書く |

日本語の名前を `filename="ねこ.png"` と書くと、ヘッダに ASCII 以外の文字が入り、ブラウザによって文字化けします。両方を書いて、古いブラウザには `filename`、今のブラウザには `filename*` を読ませるのが確実です（練習問題2）。

### 6.2 手を動かす: 署名付き URL へ送る

5.2節のサーバの `GET /files/:id` は、ファイルをアプリで中継せず、60 秒の署名付き URL へ `302` で送ります。

```sh
$ curl -s -i http://127.0.0.1:9837/files/2e1a8e9e-7f08-462f-8967-f9d3f9ea5009
HTTP/1.1 302 Found
Cache-Control: no-store
Location: http://127.0.0.1:9800/demo/files/2e1a8e9e-…?X-Amz-Algorithm=AWS4-HMAC-SHA256&…&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27%25E3%2581%25AD%25E3%2581%2593.png&response-content-type=image%2Fpng&…
…
$ curl -s -L -o got.png -D - http://127.0.0.1:9837/files/2e1a8e9e-7f08-462f-8967-f9d3f9ea5009
HTTP/1.1 302 Found
…
HTTP/1.1 200 OK
content-type: image/png
content-disposition: attachment; filename*=UTF-8''%E3%81%AD%E3%81%93.png
Content-Length: 16
…
$ cmp got.png cat.png && echo 同じです
同じです
```

`-L` で、`Location` についていきました。`cmp` は、2つのファイルを1バイトずつ比べるコマンドです（同じなら何も出さない）。

| 渡し方 | 良い所 | 困る所 |
| --- | --- | --- |
| 署名付き URL へリダイレクト | アプリを通らないので速く、アプリが軽い。CDN（第65章）とも合わせやすい | URL を他人に渡すと、期限までは開ける。期限は短くする |
| アプリが中継する（練習問題7） | 毎回、ログインと持ち主を確かめられる。ストレージの場所を隠せる | 大きなファイルでアプリが忙しくなる |

どちらでも、**だれが見てよいか**は、`GET /files/:id` の所で、アプリが確かめます（第10部 第55章 7節の認可。成果物で、持ち主だけに見せる）。

`Cache-Control: no-store` を付けたのは、302 の応答（毎回変わる署名付き URL）を、ブラウザや CDN に覚えさせないためです。最後に、`Ctrl+C` でサーバを止め、`rm cat.png got.png note.txt big0` で消しておきます。

### 6.3 他人が置いたファイルを見せる危険

利用者が置いたファイルを、**自分のアプリと同じオリジン**で、`inline` で見せると、危ないことがあります。

| ファイル | 何が起きうるか |
| --- | --- |
| HTML・SVG | 中にスクリプトを書ける。同じオリジンで開くと、そのスクリプトは、ログインしている人の Cookie で API を呼べる（XSS。第10部 第55章 4節） |
| 種類を偽ったファイル | `Content-Type` が無い・間違っていると、ブラウザが中身から種類を推測して（MIME スニッフィング）、HTML として開くことがある |

守り方は、重ねて使います。

- 受け付ける種類を、中身で確かめた画像と PDF だけにする（SVG は受け付けない。練習問題3）
- 返すときに `X-Content-Type-Options: nosniff`（推測させない。第4部 第19章）と、正しい `Content-Type`
- 画像以外は `attachment`（保存させる）
- できれば、利用者のファイルは、アプリと**別のドメイン**（`files.example.com` や、ストレージのドメイン）から配る。別のオリジンなら、そこでスクリプトが動いても、アプリの Cookie には届かない。署名付き URL へリダイレクトする 6.2節の形は、これになっている

## 7. 置き場所を取り替えられるようにする

アプリのあちこちで `s3.send(…)` を呼ぶと、テストのたびに S3（か mini-s3）が要ります。第6部・第7部でデータの層を `TaskRepo` に隠したように、ファイルの置き場所も、**形**（interface）に隠します。

### 7.1 手を動かす: `BlobStore`

[samples/blob-store.ts](samples/blob-store.ts) に、アプリが使う操作だけを書きます（blob は「中身の分からないバイトの塊」の意味）。

```ts
export interface BlobStore {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | undefined>;
  head(key: string): Promise<BlobInfo | undefined>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<{ key: string; size: number }[]>;
}
```

S3 で作ったものが [samples/s3-blob-store.ts](samples/s3-blob-store.ts) です。大事な所は2つです。

```ts
function isNotFound(err: unknown): boolean {
  return err instanceof Error && (err.name === 'NoSuchKey' || err.name === 'NotFound');
}
```

「無い」を例外でなく `undefined` で返すために、`NoSuchKey`（GET）と `NotFound`（HEAD。HEAD の応答にはボディが無いので、XML の `Code` が読めず、SDK は状態 404 から `NotFound` という名前を付ける）を見分けます。

```ts
let token: string | undefined;
do {
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token, MaxKeys: options.pageSize }),
  );
  for (const o of res.Contents ?? []) found.push({ key: o.Key ?? '', size: o.Size ?? 0 });
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token !== undefined);
```

一覧は、1回の頼みで最大 1000 件です。`IsTruncated`（続きがあるか）が `true` なら、`NextContinuationToken` を次の頼みの `ContinuationToken` に渡して、続きを頼みます。`do { … } while (条件)` は、中を1回やってから条件を調べる繰り返しです。

### 7.2 手を動かす: 契約テスト

本物と偽物が同じように動くことを、**同じテスト**で確かめます（第11部 第57章 6節の `repoContract` と同じ考え）。[samples/blob-contract.ts](samples/blob-contract.ts) の `blobStoreContract(名前, 作る関数)` は、7つのテストを登録します。[samples/s3-blob-store.test.ts](samples/s3-blob-store.test.ts) は、mini-s3 をテストの中で空いているポートに起動し（`startMiniS3({ port: 0 })`）、テストごとに新しいバケットを作って当てます。

```sh
$ node --test samples/s3-blob-store.test.ts
✔ S3: 置いたものを、同じバイトと種類で取り出せる (70.672182ms)
✔ S3: 無いキーは undefined（例外にしない） (13.641094ms)
✔ S3: 同じキーに置くと上書き (12.788208ms)
✔ S3: 消すと無くなる。無いキーを消しても失敗しない (13.136495ms)
✔ S3: 一覧は prefix で始まるものだけを、キーの順に (24.728936ms)
✔ S3: 日本語・空白・記号を含むキー (8.566512ms)
✔ S3: 取り出したバイトを書き換えても、置いてあるものは変わらない (8.852796ms)
ℹ tests 7
ℹ pass 7
ℹ fail 0
…
```

`pageSize: 2` で作っているので、5つのキーの一覧は、3回の頼みに分かれます。続きの頼み方が間違っていれば、ここで落ちます。メモリの偽物を作って、同じテストを通すのが練習問題6です。最後のテストは、第11部の成果物で見つけたのと同じ種類のバグ（偽物が、中のオブジェクトをそのまま渡してしまう）を見つけるためのものです。

## 8. 消すこと

| 場面 | すること |
| --- | --- |
| 利用者がファイルを消した | データベースの行を消してから、ストレージのオブジェクトを消す。ストレージを消すのに失敗しても、利用者には見えなくなっている。残ったものは、下の掃除で消える |
| タスクやユーザーを消した | その添付ファイルも消す。数が多いなら、後ろの仕事（第64章）に回す |
| 置いたが、データベースに行が無い（**孤児**） | 置いた後でアプリが落ちた、5.3節で「置き終わった」が来なかった、など。定期的に一覧と照らして消す（練習問題8、第64章で定期実行に） |
| 古いものを自動で消す | ストレージの**ライフサイクルの設定**（「`tmp/` の下は 1 日で消す」など）。S3・R2 にある |

孤児を消すときは、**置いたばかりのものは消さない**（置いてから行を作るまでの間かもしれない）、**分からないときは消さない**（データベースにつながらないなら止める）、の2つが大事です。消したものは戻らないので、最初は `dryRun`（数えるだけ）で動かして確かめます。

バックアップも考えます。データベースのバックアップと、ストレージのバックアップ（バージョンを残す設定や、別の場所への写し）は、別々に取られるので、時刻が少しずれます。戻すときの食い違い（行はあるがファイルが無い）を、アプリが 404 で扱えるようにしておきます。

## 9. 本物のストレージを選ぶ

| サービス（執筆時点） | 特徴 |
| --- | --- |
| Amazon S3 | 元祖。機能がいちばん多い。外へ配る転送量にお金がかかる |
| Cloudflare R2 | S3 と同じ API。外へ配る転送量が無料（執筆時点）。`region` は `auto` |
| Google Cloud Storage | S3 と同じ API（互換の入口）も持つ |
| PaaS のストレージ | Render の Disk（1台のアプリにだけつながるディスク）、Fly.io の Volumes など。複数台から共有できないものが多い |
| 自分で動かす（MinIO・SeaweedFS・Garage など） | 手元の開発や、自分のサーバで。MinIO のコミュニティ版は、執筆時点で配布の形や機能が変わってきているので、使う前に**必ず公式で確認** |

どれを使っても、この章の SDK のコードは、`endpoint`・`region`・鍵を変えるだけで動きます。

ほかに、本番で決めておくことです。

- **バケットは公開しない**。読むのは、署名付き URL か、アプリの中継だけにする
- アプリに渡す鍵は、そのバケットだけ、要る操作（置く・取り出す・消す・一覧）だけの権限にする（最小の権限）
- 鍵は環境変数で渡し、取り替えられるようにする（第60章 6節）

最後に、「URL を渡すと、その画像を取り込んで添付する」機能を作るときは、**SSRF**（第10部 第55章 8節）に気をつけます。アプリのサーバが、利用者の指定した URL を取りに行くので、`169.254.169.254`（クラウドの中の秘密の入口）や `127.0.0.1` の管理画面を指されると、中の情報を取られます。第55章 練習問題6の `safeFetch`（行き先のアドレスを確かめる、リダイレクトを追わない、大きさと時間の上限）を通してから、この章の確かめ方（中身の種類・大きさ）で受け取ります。

## 10. Flask との対応

| Flask（Python） | この章（Node.js） |
| --- | --- |
| `request.files['photo']` | `express.raw()` の `req.body`（Buffer）。複数のファイルや、フォームと一緒なら multer など |
| `app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024`（超えたら 413） | `express.raw({ limit: '5mb' })` |
| `secure_filename(f.filename)` | 名前はキーに使わない。キーは `randomUUID()` |
| `send_from_directory(…, as_attachment=True, download_name=…)` | `Content-Disposition: attachment; filename*=UTF-8''…` |
| boto3 の `s3.put_object(Bucket=…, Key=…, Body=…)` | `s3.send(new PutObjectCommand({ Bucket, Key, Body }))` |
| boto3 の `s3.generate_presigned_url('get_object', Params=…, ExpiresIn=60)` | `getSignedUrl(s3, new GetObjectCommand(…), { expiresIn: 60 })` |

## まとめ

- 利用者のファイルは、中身をオブジェクトストレージ、情報をデータベースに置く。アプリのディスクは、デプロイで消え、台数を増やすと見えない。
- S3 の API は、バケット・キー・オブジェクト。フォルダは無く、`Prefix` で一覧にする。SDK には `endpoint`・`region`・鍵を明示して渡し、S3 互換のサーバでは `forcePathStyle` とチェックサムの設定に気をつける。
- 署名（SigV4）は HMAC を重ねたもの。期限やヘッダも署名に含まれるので、署名付き URL は書き換えられない。シークレットを渡さずに、1つの操作を短い間だけ許せる。
- アップロードは、大きさの上限と、先頭のバイトで種類を確かめる。キーはアプリが決め、利用者の名前は表示用に持つだけ。
- ダウンロードは `Content-Disposition`（`filename*`）・正しい `Content-Type`・`nosniff`。HTML・SVG は受け付けず、できれば別のオリジンから配る。だれが見てよいかは、アプリが確かめる。
- 置き場所は `BlobStore` の形に隠し、本物と偽物に同じ契約テストを当てる。
- 孤児は、置いたばかりのものと、分からないものを消さないようにして、定期的に掃除する。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Amazon S3 ユーザーガイド「オブジェクトの概要」「署名付き URL」: https://docs.aws.amazon.com/AmazonS3/latest/userguide/
- AWS「Signature Version 4 の署名の作り方」: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
- AWS SDK for JavaScript v3「@aws-sdk/client-s3」: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/
- Cloudflare R2「S3 API compatibility」: https://developers.cloudflare.com/r2/api/s3/api/
- RFC 6266「Content-Disposition」: https://www.rfc-editor.org/rfc/rfc6266
- MDN「Content-Disposition」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Disposition
- OWASP「File Upload Cheat Sheet」: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html

---

前の章: [第62章 クラウドへのデプロイ](../ch62-cloud-deploy/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次の章: [第64章 バックグラウンドジョブ](../ch64-background-jobs/README.md)
