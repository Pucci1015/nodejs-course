# 第65章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答です。動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [cache-policy.ts](cache-policy.ts) | `MODULE=../solutions/cache-policy.ts node --test cache-policy.test.ts` |
| 2 | [parse-cache-control.ts](parse-cache-control.ts) | `MODULE=../solutions/parse-cache-control.ts node --test parse-cache-control.test.ts` |
| 3 | [freshness.ts](freshness.ts) | `MODULE=../solutions/freshness.ts node --test freshness.test.ts` |
| 4 | このファイルの「問題4」 | |
| 5 | [storable.ts](storable.ts) | `MODULE=../solutions/storable.ts node --test storable.test.ts` |
| 6 | [hash-assets.ts](hash-assets.ts) | `MODULE=../solutions/hash-assets.ts node --test hash-assets.test.ts` |
| 7 | [spa-app.ts](spa-app.ts) | `MODULE=../solutions/spa-app.ts node --test spa-app.test.ts` |
| 8 | [tag-cache.ts](tag-cache.ts) | `MODULE=../solutions/tag-cache.ts node --test tag-cache.test.ts` |

---

## 問題1 応答の種類ごとに Cache-Control を決める

```ts
if (method !== 'GET' && method !== 'HEAD') return 'no-store';
if (status !== 200 && status !== 304) return 'no-store';
if (pathname.startsWith('/assets/')) {
  return HASHED.test(pathname) ? 'public, max-age=31536000, immutable' : 'public, max-age=0';
}
if (pathname.startsWith('/api/public/')) return 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
if (pathname === '/api' || pathname.startsWith('/api/')) return 'private, no-store';
const last = pathname.split('/').at(-1) ?? '';
if (!last.includes('.')) return 'no-cache';
return 'public, max-age=0';
```

- いちばん大事なのは、**順番**です。エラーと書き換えを最初に `no-store` にしておくと、後の行で「1年覚えてよい」を付けてしまう心配がありません。
- 「覚えてよいもの」を1つずつ足し、分からないものは覚えさせない側に倒しています。`/api` の下は、`/api/public/` だけを例外にして、残りは全部 `private, no-store` です。新しい API を足したときに、書き忘れても人ごとの応答が CDN に覚えられません（本文 8.1節）。
- `/api/publicity` が `/api/public/` に当たらないよう、最後の `/` まで比べています。`startsWith('/api/public')` だと当たってしまいます。
- 301 も `no-store` にしました。301 は「ずっと移った」なので、ブラウザがとても長く覚えることがあり、間違えたときに直せません。覚えさせたいときだけ、はっきり時間を書きます。
- 成果物では、この関数の形で、Express のミドルウェアから `Cache-Control` を付けます。

## 問題2 Cache-Control を分ける

```ts
for (const ch of value) {
  if (ch === '"') inQuote = !inQuote;
  if (ch === ',' && !inQuote) {
    parts.push(current);
    current = '';
  } else {
    current += ch;
  }
}
```

- 本文 2.2節の `split(',')` は、`no-cache="Set-Cookie, X-Foo"` を `no-cache="Set-Cookie` と ` X-Foo"` に切ってしまい、` x-foo"` という名前の指示ができてしまいます。1文字ずつ見て、囲みの中かを覚えておけば、正しく切れます。
- `split('=')` も、`private="a=b"` を3つに切ってしまうので、最初の `=` の位置（`indexOf`）で2つに分けました。
- 同じ名前が2回あったときの扱いは、HTTP の決まり（RFC 9111）では「どれを使うかは決まっていない、扱いが分かれる」ものです。ここでは「最初のもの」にしましたが、本当は、オリジンが2回書かないようにするのが先です。
- `sharedLifetime` で、数字だけでない値を無いものとして扱うのは、`max-age=1.5` を `Number` にすると 1.5 になり、`max-age=` を `Number('')` にすると **0** になるからです。0 は「すぐ古くなる」という意味の、ちゃんとした値なので、書き間違いと区別がつかなくなります。
- `private` を「覚えてはいけない」として `undefined` にしたのは、この関数が **共有**キャッシュ（CDN）のためだからです。ブラウザなら、`private` でも覚えてよいです。

## 問題3 年齢と、新鮮か・古いか

```ts
function ageOf(info: StoredInfo, now: number): number {
  return Math.max(0, info.initialAge + Math.floor((now - info.storedAt) / 1000));
}
```

- 年齢を秒に切り捨てるのは、`Age` ヘッダが「秒の整数」だからです（RFC 9111 5.1節）。比べるのも同じ値でしておくと、ヘッダに出した年齢と、新鮮かどうかの判断が食い違いません。
- `Math.max(0, …)` は、サーバの時計が戻った（時刻を合わせ直した）ときに、負の年齢を出さないためです。
- ちょうど `lifetime` で新鮮でなくなる（`<` で比べる）のは、`max-age=0` を「0 秒も新鮮でない」にするためです。`<=` にすると、`max-age=0` を、覚えた直後の 1 秒だけ新鮮として扱ってしまいます。

## 問題4 考えて答える

1. CDN が 600 秒、その後ブラウザがさらに 600 秒覚えるので、いちばん長くて 20 分です（CDN が覚えて 599 秒たったものをブラウザが受け取ると、本当はブラウザは `Age: 599` を見て残り 1 秒とするので、多くの場合はもっと短くなります。ただし `Age` を正しく扱わないキャッシュがあると、20 分になります）。`public, max-age=0, s-maxage=600` なら、ブラウザは毎回聞き直し、CDN だけが 600 秒覚えます。変わったときに CDN から消せば、次に聞いた人から新しい数になります。**消せるのは CDN だけ**で、ブラウザの中のものは消せないので、ブラウザには長く覚えさせないのが基本です。
2. ブラウザは、古い `index.html` を1年間、確かめずに使い続けます。新しい版をデプロイしても、一度開いた人には古い画面が出続けます。古い画面が読む古い JS が消えていれば、画面が壊れます。CDN から消しても、**ブラウザが覚えているものは消えない**ので、直りません（その人がキャッシュを消すか、1年待つしかない）。だから、名前の変わらないもの（`index.html`）には、決して長い時間を付けません。`Clear-Site-Data` ヘッダでブラウザに消させる方法もありますが、それを返すには、まずブラウザがサーバに聞いてくれる必要があります。
3. `no-store` にすると、ブラウザも CDN も覚えないので、毎回 `index.html` の全体が届きます。`no-cache` なら、覚えておいて、変わっていなければ 304（ボディなし）で済みます。`index.html` は小さいので大きな差ではありませんが、CDN がオリジンに聞くのも、オリジンが毎回本文を返すのも、増えます。秘密の情報が入っていない `index.html` には、`no-cache` で十分です。
4. 5つとも `MISS` で、オリジンには5回届きます。執筆の環境で試した出力です。

   ```
   {"user":"alice"}
   200 MISS age=
   …（5 回とも同じ）
   ```

   CDN のターミナルには、1つ目の `MISS` の後に4つの `COLLAPSED` が出ますが、1つ目の応答が `no-store` で覚えられないと分かると、`まとめられない応答なので、取り直します` と出して、4つとも自分でオリジンに取りに行きました。人ごとの応答を、別の人の頼みに分けてしまわないためです。そのぶん、4つは「1つ目を待つ時間」も余計にかかりました。本物の CDN（Varnish・Fastly など）は、「この URL は覚えられない」ことを短い間覚えておき（hit-for-pass）、次からは待たせずに、すぐオリジンに送ります。
5. `index.html` は、利用者が最初に開く URL（`https://app.example.com/`）なので、名前を変えられないからです。名前を変えられないので、`no-cache` で毎回確かめます。その代わり、`index.html` の中に「今の版の JS・CSS の名前」が書いてあるので、`index.html` さえ新しければ、ほかのファイルは名前で新しいものに入れ替わります。
6. アプリに頼みを送ってくるのが、利用者ではなく CDN のサーバだからです。本当の客の IP アドレスは、CDN が付ける `X-Forwarded-For`（や CDN ごとのヘッダ）に入ります。このままでは、回数の制限は「CDN のサーバごと」に数えることになり、多くの人をまとめて1人として数えて、すぐ上限に達して全員が 429 になります。Express の `trust proxy` を CDN の段の数に合わせて設定し（第60章 7節）、`req.ip` が本当の客を指すようにします。だれでも `X-Forwarded-For` を書いて送れるので、「信じる段の数」を正しく決めることが大事です。

## 問題5 CDN が覚えてよい応答か

- 順番に意味があります。たとえば `no-store` と `Set-Cookie` の両方があれば `'no-store'` を返します。ログに出す理由として、より根本の理由（オリジンが「覚えるな」と言った）を先にしました。
- 覚えてよい状態の番号は、RFC 9110 15.1節の「heuristically cacheable」（時間が書いていなくても推測で覚えてよい）ものです。302・307 は「一時的」なので入っていません。201（作った）・401・500 も入っていません。
- `Set-Cookie` のある応答を覚えないのは、HTTP の決まりではなく、CDN の安全のための方針です。HTTP の決まりでは覚えてよいのですが、覚えると、その Cookie（セッションの ID など）を全員に配ってしまいます。多くの CDN も、既定で同じように扱います（執筆時点）。
- `HEAD` を `'method'` にしたのは、練習用の CDN と同じく、「GET の応答を覚え、HEAD はそのまま通す」形にしたためです。本物のキャッシュは、GET で覚えたものから HEAD に答えることもあります。

## 問題6 名前にハッシュを入れて、HTML を書き換える

```ts
for (const [name, content] of Object.entries(assets)) {
  const hashed = hashedName(name, content);
  files[hashed] = content;
  manifest[name] = hashed;
  out = out.replaceAll(`"/${name}"`, `"/${hashed}"`);
}
```

- `hashedName` は、本文 5.1節のものに、フォルダを分けてつなぎ直す所を足しました。`path.extname('noto.sans.woff2')` は最後の `.` から後ろ（`.woff2`）を返すので、「最後の `.` の前」に入ります。
- 解答では `path.posix`（いつも `/` で区切る `path`）を使いました。Mac では `path` と同じですが、Windows でビルドしても URL の区切りが `\` にならないようにするためです。
- `manifest`（元の名前 → 新しい名前）は、Vite も作れます（`build.manifest`）。サーバ側で HTML を作るとき（第8部 第46章の SSR）に、「今の版の JS の名前」を調べるのに使います。
- 本物のビルドの道具は、CSS の中の `url(...)` や、JS の中の `import()` の名前も書き換えます。そのため、「A が B を読むなら、B の名前が決まってから A の中身を書き換え、A のハッシュを計算する」という順番が要ります（中身が変われば、ハッシュも変わるため）。この問題では、HTML だけを書き換えるので、順番を考えなくて済みました。

## 問題7 ビルドした画面を配るアプリ

```ts
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
// …
app.get('/index.html', (_req, res) => {
  res.redirect(301, '/');
});
```

- 404 に `no-store` を付けるのは、本物の CDN が 404 を短い間覚えることがあるからです。デプロイの途中で、新しい JS がまだ無い一瞬に 404 を覚えられると、新しい版を開いた人の画面が壊れたままになります。
- `/index.html` を `/` へ送るのは、同じページが2つの URL にならないようにするためです。CDN は URL ごとに覚えるので、2つあると、片方だけが古いまま残ることがあります。
- `res.sendFile` は、`Cache-Control` を先に書いておけば、それを使います（書いていなければ `public, max-age=0`）。
- テストで 304 を確かめる所は、`fetch` ではなく `node:http` を使いました。`fetch` は、`If-None-Match` を自分で付けると、`Cache-Control: no-cache`（と `Pragma: no-cache`）も勝手に足します（Fetch の決まり。Node.js 24 で確かめました）。Express は、頼みに `Cache-Control: no-cache` があると「新しいものが欲しい」と見て、304 ではなく 200 を返します。ブラウザの「強制再読み込み」と同じ扱いです。

## 問題8 印で消せる、アプリの中のキャッシュ

```ts
function startLoad(key: string, load: () => Promise<Loaded<T>>): Promise<T> {
  const running = loading.get(key);
  if (running) return running;
  const gen = genOf(key);
  const p = load()
    .then((loaded) => {
      if (genOf(key) === gen) entries.set(key, { … });
      return loaded.value;
    })
    .finally(() => {
      if (loading.get(key) === p) loading.delete(key);
    });
  loading.set(key, p);
  return p;
}
```

- 同時の読み込みをまとめるのは、「読み込み中の **Promise** を覚えておき、2人目からはそれを返す」だけです。Promise は何人が `await` しても、同じ結果になります。失敗したときも、全員に同じ例外が届きます（テストの5つ目）。
- 後ろの取り直しは、`startLoad(key, load).catch(() => {})` と、`await` せずに `catch` だけ付けました。`catch` を付けないと、失敗したときに unhandled rejection（第3部 第13章）でプロセスが落ちます。
- 「読み込み中に消されたら覚えない」が無いと、次の順で、古いデータが戻ってきます。
  1. A さんが一覧を読み始める（データベースから、古い題名を読む）
  2. B さんが題名を変えて、印で消す
  3. A さんの読み込みが終わり、古い題名を覚える。次の `ttlMs` の間、全員に古い題名が出る

  消すたびに番号を増やし、読み込みの始めと終わりで番号が違えば覚えない、とすると防げます。本物の CDN でも同じことが起きうるので、7.2節では「書き換えが終わった後に消す」と、短い `s-maxage` を組み合わせました。
- `finally` の中で `loading.get(key) === p` を確かめるのは、消した後に始まった新しい読み込み（別の Promise）を、古い読み込みの終わりで消してしまわないためです。
- 値の型を `createTagCache<T>` で1つに決めたので、`as` を使わずに書けました。いろいろな型の値を1つのキャッシュに入れたいなら、型ごとにキャッシュを作ります。
- このキャッシュは、プロセスのメモリにあるので、サーバが2台あると、それぞれが別々に覚え、片方で消しても、もう片方には残ります。台をまたいで消すには、Redis の Pub/Sub（第6部 第34章）で「この印を消して」を全台に知らせるか、Redis そのものをキャッシュにします（第66章）。
