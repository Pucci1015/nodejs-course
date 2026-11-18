# 第60章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=../solutions/○○.ts node --test ○○.test.ts` と打つと、テストで確かめられます。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [config.ts](config.ts) |
| 2 | [rotation.ts](rotation.ts) |
| 3 | [client-ip.ts](client-ip.ts) |
| 4 | このファイルの問題4 |
| 5 | [health.ts](health.ts) |
| 6 | [supervise.ts](supervise.ts) |
| 7 | [cookie-rules.ts](cookie-rules.ts) |
| 8 | [check-env.ts](check-env.ts) |

---

## 問題1 本番で必須の設定を確かめる

```ts
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d{1,5}$/).transform(Number).pipe(z.number().max(65535)).default(9807),
  SESSION_SECRETS: z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()))
    .pipe(z.array(z.string().min(32)))
    .optional(),
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//).optional(),
});

export function loadConfig(env: Record<string, string | undefined>): Config {
  const input = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  const r = Env.safeParse(input);
  if (!r.success) throw new ConfigError([...new Set(r.error.issues.map((i) => String(i.path[0])))]);
  const e = r.data;
  const missing: string[] = [];
  if (e.NODE_ENV === 'production') {
    if (e.SESSION_SECRETS === undefined) missing.push('SESSION_SECRETS');
    if (e.DATABASE_URL === undefined) missing.push('DATABASE_URL');
  }
  if (missing.length > 0) throw new ConfigError(missing);
  return { env: e.NODE_ENV, port: e.PORT, sessionSecrets: e.SESSION_SECRETS ?? [DEV_SESSION_SECRET], databaseUrl: e.DATABASE_URL ?? DEV_DATABASE_URL };
}
```

- `new Set(…)` で、同じ名前を1つにします。`SESSION_SECRETS` の2つの要素が短いと、issue は2つ出ますが、名前は1つで十分です。
- **足りないものを全部集めてから投げる**のが大事です。1つずつ投げると、「直してデプロイ → 次のエラー → 直してデプロイ」を繰り返すことになります。
- `PORT` の `regex(/^\d{1,5}$/)` は `-1`・`1e3`・`80a` を断り、`.pipe(z.number().max(65535))` が `65536`〜`99999` を断ります。`Number('1e3')` は 1000 になってしまうので、`Number()` の前に形を確かめるのが大事です（第7部 第38章 6節の `z.coerce` の落とし穴）。
- `ConfigError` の `names` は、名前だけです。メッセージにも値を入れないので、ログに残しても安全です。

## 問題2 鍵を取り替えられる署名

```ts
export function unsign(signed: string, keys: string[]): Verified | undefined {
  const dot = signed.lastIndexOf('.');
  if (dot < 0) return undefined;
  const value = signed.slice(0, dot);
  const given = Buffer.from(signed.slice(dot + 1));
  for (const [keyIndex, key] of keys.entries()) {
    const expected = Buffer.from(mac(value, key));
    if (expected.length === given.length && timingSafeEqual(expected, given)) return { value, keyIndex };
  }
  return undefined;
}

export function needsResign(signed: string, keys: string[]): boolean {
  const r = unsign(signed, keys);
  return r !== undefined && r.keyIndex > 0;
}
```

- 配列の `entries()` は、`[位置, 値]` の組を順に返します。`for (const [i, key] of keys.entries())` で、位置と鍵を一緒に取れます。
- `lastIndexOf('.')` で最後の `.` で分けるので、値に `.` が入っていても大丈夫です（署名の base64url には `.` が入りません）。
- `timingSafeEqual` は、長さが違うと例外を投げます。長さは秘密ではない（署名の長さはだれでも知っている）ので、先に比べてかまいません（第4部 第22章 5節）。
- `needsResign` を使うと、アプリは「古い鍵で合ったら、新しい鍵で署名し直した Cookie を返す」ことができます。手順2の待つ期間が、短くて済みます。

## 問題3 プロキシの後ろで、客の IP アドレスを決める

```ts
export function clientIp(input: ClientIpInput): string {
  const { remoteAddress, forwardedFor, trustedHops } = input;
  const forwarded = (forwardedFor ?? '').split(',').map((s) => s.trim()).filter((s) => s !== '');
  const chain = [remoteAddress, ...forwarded.reverse()].map(normalize);
  const index = Math.min(trustedHops, chain.length - 1);
  return chain[index] ?? normalize(remoteAddress);
}
```

- 「近い順」に並べ直すのが考え方の中心です。0 段なら、つながってきた相手。1 段なら、その相手（自分のプロキシ）が書いた右端。客が左に何を書いても、右端はプロキシが足したものなので、うそが入りません。
- `chain[index]` の型は `string | undefined`（`noUncheckedIndexedAccess`。第7部 第35章 8節）なので、`??` で `remoteAddress` を返しています。実際には `index` は必ず配列の中です。
- Express の `trust proxy` には、数のほかに、`'loopback'` や `'10.0.0.0/8'` のような「信じてよい相手の IP アドレス」も書けます。PaaS が、ロードバランサの IP アドレスの範囲を公開しているときは、そちらがより確かです（Express の「Express behind proxies」）。

## 問題4 考えて答える

**問1**: `9900` です。`export` した値は、`node` にとって「シェルで付けた値」なので、`--env-file` のファイルより強くなります（本文 2.3節）。困るのは、前に `export` したことを忘れて、「`.env` を書き換えたのに変わらない」と悩むときです。`echo $PORT` か `env | grep PORT`（`env` は環境変数の一覧を出すコマンド、`grep` は行を絞るコマンド。第1部 第1章）で確かめます。

**問2**: 待つ時間は 1・2・4・8・16 秒（ここまでで 31 秒・5回）、その後は 30 秒ごとです。600 秒では、5 + (600 − 31) ÷ 30 ≒ 5 + 19 で、**およそ 24 回**です。困るのは、**直らない間違いを、ずっと起動し直し続ける**ことです。だれも気づかず、ログが同じエラーで埋まります。だから練習問題6では「続けて何回落ちたらあきらめる」を足し、あきらめたことを知らせます。PaaS では、デプロイした新しい版が起動しなければ、古い版のまま動かし続けます（第62章 6節）。

**問3**: 署名は最初の鍵（古い鍵）でされ続けます。確かめは両方の鍵でするので、その間は何も困りません。ところが手順3で古い鍵を外すと、**取り替えの間に配ったすべての Cookie が通らなくなり、全員がログアウト**します。新しい鍵は「前に足す」のが決まりです。練習問題2の `needsResign` で「古い鍵で合った値の数」をログに数えておくと、外してよいかを判断できます。

**問4**: `true` は「`X-Forwarded-For` の全部を信じる」なので、`req.ip` はいちばん左、つまり**客が自分で書いた値**になります。毎回ちがう `X-Forwarded-For: 192.0.2.1`・`192.0.2.2`・… を付けて頼めば、毎回ちがう人として数えられ、回数の制限にかかりません。`trust proxy` を、ロードバランサの段の数の `1` にすれば、`req.ip` はロードバランサが足した右端（本当の相手）になります。

**問5**: データベースが止まると、3つのアプリの `/healthz` がどれも失敗し、動かす場所が「死んでいる」と判断して**3つとも起動し直します**。起動し直したアプリも、データベースが戻るまで `/healthz` に失敗するので、起動し直しを繰り返します。データベースが戻った瞬間、全部のアプリが一度に起動して接続を作り、データベースに負担がかかります。その間、データベースを使わないページ（静的なファイル、`/healthz` そのもの）まで返せません。データベースは `/readyz` で確かめ、「送らないで」だけを伝えます（本文 8節）。

**問6**: `trust proxy` が無いと、アプリから見た通信は HTTP（`req.secure` が `false`）です。express-session は、`secure: true` の Cookie を、HTTPS でない応答には**付けません**。ログインの処理そのものは成功し、`/login` の応答（303 など）も返りますが、Cookie が届かないので、次のページで「ログインしていない」になります。エラーのログも出ないので、気づきにくい不具合です（本文 7.3節）。

## 問題5 `/healthz` と `/readyz` のルーター

```ts
router.get('/readyz', async (_req, res) => {
  if (isStopping()) {
    res.status(503).json({ status: 'stopping' });
    return;
  }
  const names = Object.keys(checks);
  const results = await Promise.allSettled(names.map((name) => withTimeout(Promise.resolve().then(() => checks[name]?.()), timeoutMs)));
  const summary: Record<string, 'ok' | 'error'> = {};
  let allOk = true;
  for (const [i, r] of results.entries()) {
    const name = names[i] ?? '';
    summary[name] = r.status === 'fulfilled' ? 'ok' : 'error';
    if (r.status === 'rejected') {
      allOk = false;
      console.error(`readyz: ${name}:`, r.reason instanceof Error ? r.reason.message : r.reason);
    }
  }
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'error', checks: summary });
});
```

- `Promise.all` を使うと、1つ失敗した時点で全体が失敗になり、ほかの結果が分かりません。`allSettled` は全部の結果を待ち、それぞれ `fulfilled` か `rejected` かを教えてくれます。
- `Promise.resolve().then(() => checks[name]?.())` は、確かめる関数が `async` でなく、その場で `throw` した場合も、失敗の Promise にするための書き方です。直接 `checks[name]()` と呼ぶと、同期の `throw` が `map` の中で起き、ルーター全体が 500 になります。
- `Cache-Control: no-store` は、`router.use` で全部の応答に付けています。ヘルスチェックの答えを、途中のプロキシが覚えて返すと、止まっているのに「ok」と見えてしまいます。
- 返す名前ごとの `ok`・`error` は、運用する人が「どれが落ちているか」を一目で知るためです。理由（つなぎ先の住所など）はログにだけ書きます。

## 問題6 落ちたら起動し直す見張り役

[supervise.ts](supervise.ts) の中心は、子が終わったときの処理です。

```ts
c.on('exit', (code, signal) => {
  child = undefined;
  onEvent({ type: 'exit', code, signal });
  if (stopping) {
    finish({ reason: 'stopped', restarts: total });
    return;
  }
  if (Date.now() - startedAt >= stableMs) consecutive = 0;
  if (consecutive >= maxRestarts) {
    onEvent({ type: 'give-up', restarts: total });
    finish({ reason: 'gave-up', restarts: total });
    return;
  }
  const delayMs = Math.min(baseDelayMs * 2 ** consecutive, maxDelayMs);
  consecutive += 1;
  total += 1;
  onEvent({ type: 'wait', delayMs, restarts: consecutive });
  waiting = setTimeout(() => {
    waiting = undefined;
    start();
  }, delayMs);
});
```

- 「続けて落ちた回数」（`consecutive`）と「全部で起動し直した回数」（`total`）を分けて数えます。しばらく動いていたら `consecutive` だけを 0 に戻すので、何日も動くサーバが、たまに落ちても、毎回すぐ（`baseDelayMs` で）起動し直されます。
- `stop()` は、2つの場合を分けます。子が動いていれば `SIGTERM` を送り、`exit` の中で `finish` します。待っている間なら、子はいないので、タイマーを止めて、その場で `finish` します。
- `done` は、`finish` という変数に `resolve` を取っておく形で作っています。`let finish!: …` の `!` は、「`new Promise` の中で必ず入れるので、使う前に入っている」と TypeScript に伝える書き方です。
- 本物の見張り役（Docker・PaaS・systemd）にも、似た決まりがあります。たとえば Kubernetes（コンテナをたくさん動かす仕組み）は、落ち続けるコンテナを `CrashLoopBackOff` という状態にして、待つ時間を延ばしていきます。

## 問題7 本番の Cookie の設定と、名前の頭の決まり

```ts
export function cookieProblems(name: string, options: CookieOptions): string[] {
  const problems: string[] = [];
  if (name.startsWith('__Host-')) {
    if (!options.secure) problems.push('__Host- には Secure が要ります');
    if (options.path !== '/') problems.push('__Host- の path は / だけです');
    if (options.domain !== undefined) problems.push('__Host- には domain を付けられません');
  } else if (name.startsWith('__Secure-')) {
    if (!options.secure) problems.push('__Secure- には Secure が要ります');
  }
  if (options.sameSite === 'none' && !options.secure) problems.push('SameSite=None には Secure が要ります');
  return problems;
}
```

- ブラウザは、決まりに合わない `__Host-`・`__Secure-` の Cookie を、黙って捨てます。エラーにはならないので、こういう確かめを起動のときやテストで動かしておくと、気づかないまま「ログインできない」を防げます。
- `hstsHeader` で本番だけにしているのは、mkcert（第2部 第8章）で `https://localhost` を開発に使っているときに送ると、ブラウザが localhost のほかのアプリまで HTTPS でしか開かなくなるからです（ブラウザは、http の応答の HSTS は無視します）。`max-age=0` は「覚えたものを忘れて」の合図なので、0 は許しています。
- helmet（第10部 第55章 2節）も HSTS を付けます。helmet の既定は `max-age=31536000; includeSubDomains`（365 日）です。本番で初めて付けるときは、まず短い `max-age`（数分〜1日）で試し、問題が無いのを確かめてから延ばす、という進め方がよく勧められます。

## 問題8 `.env.example` と見比べるコマンド

[check-env.ts](check-env.ts) の流れは、次のとおりです。

1. `parseArgs` でオプションを読む。知らないオプションは例外なので、`try` で受けて終了コード 2
2. `.env.example` と `--env-file` のファイルを `readFile` → `parseEnv`。読めなければ終了コード 2
3. `{ ...fromFile, ...env }` で合わせる（後ろに書いた環境変数が勝つ）
4. ファイルにあって例に無い名前に `[注意]`
5. 例で値が空の名前に、値があるかを見る。`--production` なら `[NG]` で数える、無ければ `[注意]`

```ts
for (const [name, exampleValue] of Object.entries(example)) {
  if (exampleValue !== '') continue;
  const value = actual[name];
  if (value !== undefined && value !== '') continue;
  if (production) {
    console.log(`[NG] ${name}: 値がありません（本番では必須）`);
    missing += 1;
  } else {
    console.log(`[注意] ${name}: 値がありません（本番では必須）`);
  }
}
```

- 書き間違いの確かめは、`--env-file` のファイルだけを見ます。環境変数（`env`）には、`PATH`・`HOME` など、アプリと関係のない名前がたくさんあるからです。
- 値をどこにも書かないので、このコマンドの出力を CI のログに残しても安全です。CI（第11部 第59章）で、デプロイの前に `node check-env.ts .env.example --production` を動かすと、PaaS の設定の付け忘れに、デプロイの前に気づけます（第62章 7節）。
- `util.parseEnv` は、`# コメント`・`"…"` で囲んだ値・`export 名前=値` も読めます。自分で `split('=')` するより、`node --env-file` と同じ読み方になるので安心です。
