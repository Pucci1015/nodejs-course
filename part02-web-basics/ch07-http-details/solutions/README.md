# 第7章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 問題 | ポート |
| --- | --- | --- |
| [charset-server-v2.mjs](charset-server-v2.mjs) | 2 | 8101 |
| [cookie-server-v2.mjs](cookie-server-v2.mjs) | 3 | 8102 |
| [redirect-server-v2.mjs](redirect-server-v2.mjs) | 4 | 8103 |
| [cached-static-server-basic.mjs](cached-static-server-basic.mjs) | 6 | 8110（確かめるときは 8119） |
| [cookie.mjs](cookie.mjs) | 7・12（発展） | — |
| [gzip-server-v2.mjs](gzip-server-v2.mjs) | 8 | 8105 |
| [greet-server.mjs](greet-server.mjs) | 9 | 8106 |
| [cached-static-server.mjs](cached-static-server.mjs) | 10（発展） | 8110（確かめるときは 8119） |
| [negotiate.mjs](negotiate.mjs) | 11（発展） | — |

模範解答を動かして試すときも、`cp -R` で `solutions` を `~/dev/ch07/` にコピーしてから、`~/dev/ch07` で動かします（`solutions` と `exercises` が並んでいる必要があります）。

```sh
$ cd ~/dev/ch07
$ node solutions/greet-server.mjs
$ bash exercises/check-cache.sh solutions/cached-static-server.mjs

$ cd exercises                # テストは exercises で。MODULE= で、試すファイルを切り替えられる
$ MODULE=../solutions/cookie.mjs node --test cookie.test.mjs
$ MODULE=../solutions/negotiate.mjs node --test negotiate.test.mjs
```

---

## 基本

## 問題1 文字化けから原因を推理する

| 文字化け | 書いた文字コード | 読んだ文字コード | 見分けるこつ |
| --- | --- | --- | --- |
| (a) `縺ゅｊ縺後→縺�` | UTF-8 | Shift_JIS | `縺` がたくさん出る |
| (b) `ã‚ã‚ŠãŒã¨ã†` | UTF-8 | windows-1252（欧米の文字コード） | `ã` がたくさん出る |
| (c) `‚ ‚è‚ª‚Æ‚¤` | Shift_JIS | windows-1252 | `‚`（下付きのコンマ）がたくさん出る |

理由は、ひらがなのバイト列の先頭が同じだからです。

- UTF-8 のひらがなは、3バイトで `e3 81 ..` か `e3 82 ..` で始まる。`e3 81` を Shift_JIS で読むと「縺」、`e3` を windows-1252 で読むと「ã」
- Shift_JIS のひらがなは、2バイトで `82 ..` で始まる。`82` を windows-1252 で読むと「‚」

(a) の最後の `�` は、UTF-8 の15バイト（3バイト × 5文字）を Shift_JIS の2バイトずつで読んだので、最後の1バイトが余ったためです。

この「見た目の癖」を覚えておくと、ログやメールの文字化けを見たときに、すぐに原因の見当がつきます。

## 問題2 meta と JSON の文字コード

模範解答は [charset-server-v2.mjs](charset-server-v2.mjs) です。足したのは次の部分です。

```js
const htmlWithMeta = '<!doctype html><meta charset="utf-8"><title>実験</title><h1>こんにちは、世界</h1>\n';
// ...
  } else if (req.url === '/meta') {
    res.setHeader('Content-Type', 'text/html'); // ヘッダには charset を付けない
    res.end(htmlWithMeta);
  } else if (req.url === '/json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ message: 'こんにちは' }));
```

**1.** ブラウザは「① ヘッダの `charset` → ② HTML の `<meta charset>` → ③ 推測」の順に文字コードを決めます。`/no-charset` は ① も ② も無いので ③ の推測になり、外れると化けます。`/meta` は ① は無いものの ② があるので、UTF-8 として正しく読まれます。

`<meta>` は、HTML の先頭近くに書きます。ブラウザは最初の部分だけを見て `<meta charset>` を探すからです。

**2.** `/json` はヘッダに `charset=utf-8` があるので、ブラウザでも化けません。curl はバイト列をそのままターミナルに出し、ターミナルが UTF-8 で表示するので、こちらも化けません。

## 問題3 Cookie を2つ使い、消せるようにする

模範解答は [cookie-server-v2.mjs](cookie-server-v2.mjs) です。

```js
  if (req.url === '/reset') {
    // 同じ名前・同じ Path で Max-Age=0 を送ると、ブラウザは Cookie を消す
    res.setHeader('Set-Cookie', ['visits=; Max-Age=0; Path=/', 'last=; Max-Age=0; Path=/']);
    res.end('リセットしました\n');
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  const visits = Number(cookies.visits ?? 0) + 1;
  const now = new Date().toLocaleString('ja-JP');

  res.setHeader('Set-Cookie', [
    `visits=${visits}; Max-Age=600; Path=/; HttpOnly`,
    `last=${encodeURIComponent(now)}; Max-Age=600; Path=/; HttpOnly`,
  ]);

  let text = `${visits} 回目の訪問です。\n`;
  if (cookies.last !== undefined) {
    text += `前回の訪問: ${decodeURIComponent(cookies.last)}\n`;
  }
  res.end(text);
```

`curl -i` で見ると、`Set-Cookie:` の行が2つあります。

```
Set-Cookie: visits=2; Max-Age=600; Path=/; HttpOnly
Set-Cookie: last=2026%2F11%2F9%2010%3A32%3A10; Max-Age=600; Path=/; HttpOnly
```

`encodeURIComponent` を付けないと、日時の中の空白で Cookie の値が切れてしまいます（`last=2026/11/9` までしか届かない）。

## 問題4 リダイレクトを足す

模範解答は [redirect-server-v2.mjs](redirect-server-v2.mjs) です。

```js
  } else if (req.url === '/home') {
    res.statusCode = 302; // 一時的な移動
    res.setHeader('Location', '/new');
    res.end();
  // ...
  } else if (req.url === '/old-memo') {
    res.statusCode = 308; // 恒久的な移動。メソッドとボディを保ったまま /memo へ
    res.setHeader('Location', '/memo');
    res.end();
```

`curl -L -d 'text=a' http://127.0.0.1:8103/old-memo` のとき、サーバのターミナルには次のように表示されます。

```
POST /old-memo
POST /memo
GET /done
```

- `/old-memo` → `/memo` は **POST のまま**: 308 は「メソッドを変えない」（本文4.2節の表）ので、curl はボディも付けて POST し直します
- `/memo` → `/done` は **GET**: `/memo` が返す 303 は「必ず GET で見に行く」

`/old-memo` を 301 にすると、次のようになり、`見つかりません` と表示されます。

```
POST /old-memo
GET /memo
```

301 では POST が GET に変わることがあります（curl も、ブラウザも変えます）。`/memo` は POST だけを受け付けるので、404 になってしまいました。POST を受け付ける URL を引っ越すときは、308（一時的なら 307）を使います。

## 問題5 Cache-Control を選ぶ

| リソース | Cache-Control | 理由 |
| --- | --- | --- |
| 1. `/assets/app.3f9a1c7e.js` | `max-age=31536000, immutable` | 中身が変わればファイル名が変わるので、同じ URL の中身は変わらない。1年キャッシュしてよい |
| 2. `/index.html` | `no-cache` + ETag | 新しい版の JS のファイル名を知るために、毎回確認する。変わっていなければ 304 で軽く済む |
| 3. `GET /api/me/tasks` | `private, no-cache` | 人ごとに中身が違うので CDN に保存させない（`private`）。更新した直後に古い一覧が見えないよう、毎回確認する |
| 4. 残高と入出金の履歴 | `no-store` | 共有のパソコンでもディスクに残さない。「戻る」ボタンでも、キャッシュから表示させない |
| 5. `GET /api/weather?city=tokyo` | `public, max-age=600` | 全員に同じで、10分は変わらない。CDN に保存させると、サーバへのリクエストを大きく減らせる |

5 の `?city=tokyo` と `?city=osaka` は、URL が違うので別々にキャッシュされます。

## 応用

## 問題6 静的ファイルのサーバに ETag を付ける

模範解答は [cached-static-server-basic.mjs](cached-static-server-basic.mjs) です。`static-server.mjs` から変えたところには `// 追加:` のコメントがあります。

```js
      data = await fs.readFile(file);
      stat = await fs.stat(file); // 追加: 更新日時（stat.mtime）を知るため
// ...
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    const etag = `"${crypto.createHash('sha256').update(data).digest('hex').slice(0, 16)}"`;
    const headers = {
      ETag: etag,
      'Last-Modified': stat.mtime.toUTCString(),
      'Cache-Control': type.startsWith('text/html') ? 'no-cache' : 'max-age=60',
    };

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers); // 304 にも ETag などを付ける
      res.end();
      return;
    }

    headers['Content-Type'] = type;
    headers['Content-Length'] = data.length;
    res.writeHead(200, headers);
```

```sh
$ bash exercises/check-cache.sh solutions/cached-static-server-basic.mjs
[OK] 1. ETag が "..." の形で付いている
...
[NG] 8. W/ 付き（弱い比較）でも 304
[NG] 9. 複数並んだうちの1つが合えば 304
[NG] 10. * なら 304
[NG] 12. If-Modified-Since が Last-Modified と同じなら 304
...
4 件失敗しました
```

- ハッシュは64文字と長いので、`slice(0, 16)` で先頭の16文字だけにしました。ファイルを見分けるには十分です。
- **304 にもヘッダを付ける**: ブラウザは 304 を受け取ると、保存していたレスポンスのヘッダを、304 のヘッダで更新します。`Cache-Control` を付けないと、新鮮な期間が延びません。

**ブラウザでの確かめ**（Disable cache を外して、再読み込み）

| ファイル | 60秒以内の再読み込み | 60秒より後の再読み込み |
| --- | --- | --- |
| `index.html`（`no-cache`） | 毎回サーバに確認し、**304** | 304 |
| `style.css`（`max-age=60`） | サーバに聞かずに使う（`(memory cache)` や `(disk cache)` と表示される。サーバのターミナルにも何も表示されない）。ただし `⌘ + R` では、確認しに行って 304 になることもある | 古くなったので確認し、**304** |

`public/style.css` を書き換えると、最大60秒間は古いものが使われます。これが、本文5.4節で「ファイル名にハッシュを入れる」方法が使われる理由です。

## 問題7 Cookie を読む関数をテストで確かめる

模範解答は [cookie.mjs](cookie.mjs) の `parseCookie` です。

```js
export function parseCookie(header) {
  const cookies = {};
  if (header === undefined) return cookies;
  for (let part of header.split(';')) {
    part = part.trim();
    if (part === '') continue; // 空の部分は飛ばす
    const eq = part.indexOf('='); // 値に = が入ることがあるので、最初の = で分ける
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    let value = part.slice(eq + 1).trim();
    if (cookies[name] !== undefined) continue; // 同じ名前は最初のものを使う
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      value = decodeURIComponent(value);
    } catch {
      // 戻せない値は、そのまま使う
    }
    cookies[name] = value;
  }
  return cookies;
}
```

```sh
$ cd exercises
$ MODULE=../solutions/cookie.mjs node --test --test-name-pattern=parseCookie cookie.test.mjs
ℹ pass 8
ℹ fail 0
```

- `for (let part of ...)` と `let` にしたのは、`part = part.trim()` で中身を入れ替えるためです（`const` だと入れ替えられない）。
- **壊れたパーセントエンコード**で例外にしない理由: Cookie は利用者が自由に書き換えられます（本文3.2節の `curl -b`）。壊れた値を送るだけで**サーバが例外で止まる**なら、誰でもサーバを止められてしまいます。

## 問題8 Brotli にも対応する

模範解答は [gzip-server-v2.mjs](gzip-server-v2.mjs) です。

```js
  let encoding = 'identity';
  if (accept.includes('br')) {
    encoding = 'br'; // 小さくなる方を優先する
  } else if (accept.includes('gzip')) {
    encoding = 'gzip';
  }
  console.log(`Accept-Encoding: ${accept || '（なし）'} → ${encoding}`);

  if (encoding === 'br') {
    res.setHeader('Content-Encoding', 'br');
    res.end(zlib.brotliCompressSync(big));
  } else if (encoding === 'gzip') {
    // ...
```

```
identity 45893
gzip 2627
br 1204
gzip, deflate, br 1204
```

`br` と `gzip` の両方を受け入れるクライアントには、小さくなる `br` を選びます。最近のブラウザは、HTTPS のサイトでは `br` を受け入れます（`http://` のときは送らないブラウザもある）。

## 問題9 言語を選んであいさつするサーバ

模範解答は [greet-server.mjs](greet-server.mjs) です。

```js
const messages = { ja: 'こんにちは', en: 'Hello' };

function chooseLanguage(header) {
  if (header === undefined) return 'ja';
  let best = 'ja';
  let bestQ = 0;
  for (const item of header.split(',')) {
    const [tag, qText] = item.trim().split(';q=');
    const q = qText === undefined ? 1 : Number(qText); // q を省略したら 1
    const lang = tag.toLowerCase().split('-')[0]; // en-US → en
    if (messages[lang] !== undefined && q > bestQ) {
      best = lang;
      bestQ = q;
    }
  }
  return best;
}
```

- `bestQ` を 0 から始めるので、対応している言語が1つも無ければ、`best` は最初の `'ja'` のままです。
- `q > bestQ`（より大きいときだけ入れ替える）なので、同じ q なら先に書かれた方が残ります。
- `Content-Language: en` も付けておくと、返した言語がヘッダで分かります。

`Vary: Accept-Language` が無いと、CDN が最初に保存した言語のページを、全員に返してしまいます（本文6.2節の `Vary` と同じ理由）。

## 発展

## 問題10 ETag の比較の決まりをすべて守る

模範解答は [cached-static-server.mjs](cached-static-server.mjs) です。問題6の解答に足したところには `// 問題10:` のコメントがあります。

```js
// If-None-Match（例: '"a", W/"b"'）の中に、etag と一致するものがあるか
function noneMatchHits(header, etag) {
  if (header.trim() === '*') return true; // * は何にでも一致する
  for (let tag of header.split(',')) {
    tag = tag.trim();
    if (tag.startsWith('W/')) tag = tag.slice(2); // 弱い比較: 先頭の W/ を取り除いてから比べる
    if (tag === etag) return true;
  }
  return false;
}
// ...
    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    let notModified = false;
    if (inm !== undefined) {
      notModified = noneMatchHits(inm, etag);
    } else if (ims !== undefined) {
      const fileSec = Math.floor(stat.mtime.getTime() / 1000);
      const sinceSec = Math.floor(new Date(ims).getTime() / 1000);
      notModified = fileSec <= sinceSec;
    }
    if (notModified) {
```

```sh
$ bash exercises/check-cache.sh solutions/cached-static-server.mjs
...
[OK] 18. 古い Last-Modified では 200

すべて成功しました
```

- **If-None-Match を優先する**: ETag の方が正確なので、両方あるときは If-Modified-Since を見ません（テスト13）。
- **秒にそろえる**: `stat.mtime` にはミリ秒まで入っていますが、`Last-Modified` は秒までです。そろえないと、自分が返した `Last-Modified` をそのまま送られても「ミリ秒の分だけ新しい」と判断して 200 を返してしまいます（テスト12）。
- 日付が壊れていると `new Date(ims).getTime()` は `NaN`（数ではない）になり、`fileSec <= NaN` は `false` なので 200 を返します。

## 問題11 q の値を見て圧縮方式を選ぶ

模範解答は [negotiate.mjs](negotiate.mjs) です。

```js
// 'gzip;q=0.8, br' → { gzip: 0.8, br: 1 }
function parseAccept(header) {
  const prefs = {};
  for (const item of header.split(',')) {
    const parts = item.split(';');
    const name = parts[0].trim().toLowerCase();
    if (name === '') continue;
    let q = 1;
    for (let i = 1; i < parts.length; i++) {
      const param = parts[i].trim().toLowerCase();
      if (param.startsWith('q=')) q = Number(param.slice(2));
    }
    if (Number.isNaN(q)) q = 0;
    prefs[name] = q;
  }
  return prefs;
}

export function chooseEncoding(acceptEncoding, available = ['br', 'gzip']) {
  if (acceptEncoding === undefined || acceptEncoding.trim() === '') return 'identity';
  const prefs = parseAccept(acceptEncoding);

  function qOf(name) {
    if (prefs[name] !== undefined) return prefs[name];
    if (prefs['*'] !== undefined) return prefs['*'];
    if (name === 'identity') return 0.001;
    return 0;
  }

  let best = null;
  let bestQ = 0;
  for (const name of available.concat(['identity'])) {
    const q = qOf(name);
    if (q > bestQ) {
      best = name;
      bestQ = q;
    }
  }
  return best;
}
```

```sh
$ cd exercises
$ MODULE=../solutions/negotiate.mjs node --test negotiate.test.mjs
ℹ pass 17
ℹ fail 0
```

- **`identity` を 0.001 にする**: 「書かれていなくても受け入れる。ただし他に受け入れられる方式があれば、そちらを選ぶ」を、小さな値で表しました。`deflate` しか書かれていないときは、`br` と `gzip` が 0、`identity` が 0.001 なので `identity` が選ばれます。
- **`*;q=0`**: `*` が `identity` にも当てはまるので、`identity` も 0 になり、`null` が返ります。`*;q=0, identity` なら、`identity` は書かれているので 1 です。
- `available.concat(['identity'])` は、配列の後ろに `'identity'` を付け足した新しい配列を作ります（`available` 自体は変わらない）。

`null`（受け入れられる方式が無い）のとき、サーバは `406 Not Acceptable` を返すこともできます。ただし、圧縮していないレスポンスはどのクライアントでも読めるので、多くのサーバは 406 にせず、圧縮せずに返します。

## 問題12 Set-Cookie を組み立てる関数

模範解答は [cookie.mjs](cookie.mjs) の `serializeCookie` です。

```js
const BAD_NAME_CHARS = ' \t;=,"()<>@:\\/[]?{}';

function checkName(name) {
  if (name === '') throw new TypeError('Cookie の名前が空です');
  for (const ch of name) {
    if (BAD_NAME_CHARS.includes(ch) || ch.charCodeAt(0) > 126 || ch.charCodeAt(0) < 33) {
      throw new TypeError(`Cookie の名前に使えない文字があります: ${name}`);
    }
  }
}

export function serializeCookie(name, value, options = {}) {
  checkName(name);
  let text = `${name}=${encodeURIComponent(value)}`;

  if (options.maxAge !== undefined) {
    if (!Number.isInteger(options.maxAge)) throw new TypeError('maxAge は整数（秒）で指定してください');
    text += `; Max-Age=${options.maxAge}`;
  }
  if (options.expires !== undefined) {
    if (!(options.expires instanceof Date)) throw new TypeError('expires は Date で指定してください');
    text += `; Expires=${options.expires.toUTCString()}`;
  }
  if (options.domain) text += `; Domain=${options.domain}`;
  if (options.path) text += `; Path=${options.path}`;
  if (options.httpOnly) text += '; HttpOnly';
  if (options.secure) text += '; Secure';
  if (options.sameSite !== undefined) {
    const names = { strict: 'Strict', lax: 'Lax', none: 'None' };
    const sameSite = names[options.sameSite.toLowerCase()];
    if (sameSite === undefined) throw new TypeError(`sameSite は Strict / Lax / None のどれかです: ${options.sameSite}`);
    if (sameSite === 'None' && !options.secure) throw new TypeError('SameSite=None には Secure が必要です');
    text += `; SameSite=${sameSite}`;
  }
  return text;
}
```

```sh
$ MODULE=../solutions/cookie.mjs node --test cookie.test.mjs
ℹ pass 18
ℹ fail 0
```

- `maxAge` は `if (options.maxAge)` ではなく `!== undefined` で調べます。`0` は「偽」として扱われるので、`if (options.maxAge)` だと `maxAge: 0`（Cookie を消すとき）が付きません。
- **名前の誤りは例外にする**: 名前はプログラムを書く人が決めるものなので、おかしければすぐに気付けるように例外にします。値（利用者が入力したものが入ることがある）は、例外にせずパーセントエンコードします。

**最後の問い**: エンコードしないと `memo=a; Path=/admin` というヘッダになり、ブラウザは「値が `a` で、`Path=/admin` という属性が付いた Cookie」と読みます。利用者が入力した値をそのまま Cookie に入れていると、**属性を勝手に付け足される**ことになります。このように、区切り文字を含む入力で構造を壊すことを**インジェクション**と言います（第4部・第6部でも、同じ考え方が何度も出てきます）。エンコードすると `memo=a%3B%20Path%3D%2Fadmin` になり、ただの値として扱われます。
