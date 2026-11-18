# 第62章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答です。自分の答えと見比べてください。動かすときは、`exercises/` で `MODULE=../solutions/○○` を付けてテストを動かします。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [db-url.ts](db-url.ts) | `MODULE=../solutions/db-url.ts node --test db-url.test.ts` |
| 2 | [https-only.ts](https-only.ts) | `MODULE=../solutions/https-only.ts node --test https-only.test.ts` |
| 3 | [pool-budget.ts](pool-budget.ts) | `MODULE=../solutions/pool-budget.ts node --test pool-budget.test.ts` |
| 4 | このファイルの「問題4」 | |
| 5 | [deploy.yml](deploy.yml) | `MODULE=../solutions/deploy.yml node --test deploy-yml.test.ts` |
| 6 | [wait-for-version.ts](wait-for-version.ts) | `MODULE=../solutions/wait-for-version.ts node --test wait-for-version.test.ts` |
| 7 | [migration-check.ts](migration-check.ts) | `MODULE=../solutions/migration-check.ts node --test migration-check.test.ts` |
| 8 | [switch-proxy.ts](switch-proxy.ts) | `MODULE=../solutions/switch-proxy.ts node --test switch-proxy.test.ts` |

---

## 問題1 `DATABASE_URL` を確かめる

```ts
let u: URL;
try {
  u = new URL(url);
} catch {
  return { redacted: '(読めません)', problems: ['URL として読めません'] };
}
// …調べる
if (u.password !== '') u.password = '***';
return { redacted: u.href, problems };
```

- 読めない URL を `redacted` にそのまま返さないのは、その文字列にパスワードが入っているかもしれないからです。ログに出す値は、いつも「中身を見せない」側に倒します。
- `hostname` は、IPv6 のアドレスを `[::1]` のように角かっこ付きで返します。`'::1'` と比べると当たりません。
- `password` に `'***'` を代入すると、`URL` が `href` を作り直してくれます。文字列の `replace` で消すと、パスワードに `@` などの記号が入っているとき（URL では `%40` になる）に、うまく消せないことがあります。
- 本番の設定を起動のときに確かめる `loadConfig`（第60章 練習問題1）から呼んで、`problems` があれば起動しない、という使い方ができます。ただし、PaaS の中の道（内部の URL）を使うときは、暗号化しないのが正しいこともあるので、`sslmode` の決まりは警告にとどめるのも1つの手です。

## 問題2 http の頼みを https へ

```ts
return (req, res, next) => {
  if (!options.enabled || req.secure || exempt.includes(req.path)) {
    next();
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    res.redirect(308, `https://${req.hostname}${req.originalUrl}`);
    return;
  }
  res.status(400).type('text/plain').send('HTTPS で送ってください\n');
};
```

- `req.secure`・`req.hostname` は、`trust proxy` を設定しているときは `X-Forwarded-Proto`・`X-Forwarded-Host` を見ます（第60章 7.1節）。`trust proxy` を付け忘れると、PaaS では**いつも** http に見えるので、https で来ても 308 を返し続け、ブラウザは「リダイレクトが多すぎます」で止まります。
- `req.path` はクエリを含まないパス、`req.originalUrl` はクエリを含むもとの URL です（ルーターの中でも `originalUrl` は変わりません）。
- `/healthz` を除くのは、PaaS のヘルスチェックは、ロードバランサの内側から http で来ることがあるからです。除かないと、308 を「失敗」と見られて、デプロイが終わりません。
- 実際の PaaS は、たいてい http → https の送り直しを自分でしてくれます（本文 3.2節の表）。このミドルウェアは、「そうでない場所に置いたときの保険」です。

## 問題3 接続の数の予算

```ts
function available(b) { return b.maxConnections - b.reserved - b.others; }
function processesPer(b) { return b.processesPerInstance * (b.overlapDuringDeploy ? 2 : 1); }

export function poolMax(budget) {
  const n = Math.floor(available(budget) / (budget.instances * processesPer(budget)));
  if (n < 1) throw new Error('接続が足りません（台数を減らすか、データベースを大きくします）');
  return n;
}
```

- 2つの関数で同じ計算を使うので、「使ってよい数」と「同時に動くプロセスの数」を小さな関数に分けました。
- `maxInstances` の `Math.max(0, …)` は、`maxConnections` が `reserved + others` より小さいとき、負の数を返さないためです。
- 本文の例（上限 100・管理 3・ほか 5・2 台）は、ふだん 46、デプロイの重なりを入れると 23 です。`Pool` の `max` は「同時に使える最大」で、ふだんは、もっと少ない接続しか開きません（第6部 第32章 5節）。それでも、混んだ時とデプロイが重なると最大まで開くので、最大で数えます。

## 問題4 考えて答える

1. PaaS のヘルスチェックは、コンテナの**外**（ロードバランサ）から来ます。`127.0.0.1` で待つと、コンテナの中からしか届きません（第61章 2.3節）。`HOST=0.0.0.0` を Dockerfile の `ENV` か PaaS の環境変数で渡します。`PORT` の `10000` は PaaS が渡した値なので、そのままでよいです。
2. 客が、アプリの番号に直接、`X-Forwarded-For: 好きなアドレス`・`X-Forwarded-Proto: https` を付けて送れます。`trust proxy` が 1 なので、アプリはそれを信じ、`req.ip` が客の書いたアドレスになります。回数の制限（第10部 第51章）を、アドレスを変えながら逃れられ、ログのアドレスも当てになりません。`trust proxy` は「前にプロキシがいて、それ以外からは届かない」ことが前提です。
3. ふだんは 4 × 20 = 80 で上限の内です。デプロイの間は、古い 4 台と新しい 4 台が同時に動くので、最大 160 になり、上限を超えます。`Pool` の `max` を `poolMax` で計算し直して（上限 100・管理 3・ほか 5 なら、92 ÷ 8 = 11）、11 にします。データベースのプランを上げる、接続をまとめるもの（PgBouncer）を使う、も手です。
4. マイグレーションが流れた瞬間から、まだ動いている古い版が `due_date` を読み書きしようとして、`column "due_date" does not exist` で失敗します（新しい版に入れ替わるまでの間、タスクの一覧も作成もエラーになる）。止めずにするには、1回目で `ADD COLUMN due_on date` を足して両方に書く版を出し、2回目で `UPDATE` で移して `due_on` から読む版を出し、3回目で `DROP COLUMN due_date` します（本文 4.3節）。
5. `poll.ts` は、答えを受け取ってから 50 ミリ秒待つので、1秒に 18〜19 回聞いていました。つながらないときは、答えをすぐ受け取る（502 か、接続を断られる）ので、1秒に 20 回くらいになります。5秒なら、**およそ 90〜100 回**失敗します。起動が遅いアプリほど、止めてから起動するやり方は困ります。
6. 1つ目のコミットのデプロイの途中で、2つ目のコミットの実行が始まると、1つ目のジョブが取り消されます。デプロイフックをもう呼んだ後なら、PaaS の側ではデプロイが進んでいるのに、`wait-for-version.ts` の確かめは行われません。マイグレーションが半分だけ流れた状態や、どちらの版が動いているか分からない状態が生まれえます。デプロイは順に1つずつ、最後まで終えるほうが安全なので `false` にします。

## 問題5 デプロイのワークフロー

[deploy.yml](deploy.yml) は、本文の例に3か所（`# 追加:` のコメント）を足したものです。

- `workflow_dispatch:` は、値の無いキーです。YAML では `workflow_dispatch:` と書くと、値が `null` のキーになり、GitHub はそれを「手で動かせる」と読みます。
- `if: github.ref == 'refs/heads/main'` の `github.ref` は、`refs/heads/ブランチ名` の形です。手で動かす画面では、ブランチを選べるので、main 以外を選んだときにデプロイしないよう、ジョブに条件を付けます。
- `timeout-minutes` の既定は 360 分（6時間）です（執筆時点）。デプロイを待つジョブが止まると、6時間、`concurrency` で次のデプロイも待たされます。
- テストは、`run:` の中に `${{ secrets.` が無いことも確かめます。`run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}` と書くと、GitHub は値をスクリプトの文字に埋め込んでから動かすので、値によってはスクリプトとして読まれてしまいます（第11部 第59章）。`env:` で渡し、スクリプトの中では `"$名前"` で読みます。

執筆の環境からは GitHub で動かしていません。YAML として読めることと、形だけを確かめました。

## 問題6 新しい版が動くまで待つコマンド

```ts
const deadline = Date.now() + timeoutSec * 1000;
for (let n = 1; ; n += 1) {
  const r = await ask(url);
  if ('version' in r && r.version === want) {
    console.log(`新しい版 ${want} が動いています（${n} 回目）`);
    return 0;
  }
  console.log(`待っています: ${'version' in r ? `今の版は ${r.version}` : r.reason}（${n} 回目）`);
  if (Date.now() + intervalSec * 1000 > deadline) break;
  await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
}
console.error(`時間切れ: ${timeoutSec} 秒たっても版 ${want} になりません`);
return 1;
```

- 1回聞く部分 `ask` は、「版が分かった」か「待つ理由」のどちらかを返すようにしました（判別できるユニオン。第7部 第36章）。`'version' in r` で、どちらかを見分けます。
- `fetch` の失敗（つながらない・時間切れ）と、`res.json()` の失敗（JSON でない）は、どちらも `catch` で「つながりません」にしました。
- 締め切りは「次に聞く時刻が過ぎるなら、待たずに終わる」で調べます。「待ってから過ぎていたら終わる」にすると、`--timeout 0.5 --interval 10` で 10 秒も待ってしまいます。
- 終了コードを `process.exit()` ではなく `process.exitCode` で返すのは、パイプに書いた出力が切れないようにするためです（第3部 第16章）。
- デプロイの後で待つほかに、6節の切り替えの前に「新しい版が起動した」ことを確かめるのにも使えます（`http://127.0.0.1:9822/version v2`）。

## 問題7 止めずにデプロイできないマイグレーションを見つける

```ts
const statements = sql
  .replace(/--.*$/gm, '')
  .split(';')
  .map((s) => s.trim().toLowerCase().replace(/\s+/g, ' '))
  .filter((s) => s !== '');
```

- 先に小文字にして空白をそろえておくと、決まりの正規表現を短く書けます。
- 決まりを `{ test, message }` の配列にして、上から順に当てています。決まりを足すときは、配列に1つ足すだけです。
- `--` の注釈を先に消すのは、注釈の中の `drop column` を見つけないためです。ただし、この作りは、`'--'` を含む文字列の値（`INSERT … VALUES ('a--b')`）の後ろも消してしまいます。完全に正しく分けるには、SQL を字句に分ける（文字列の中かどうかを覚えながら読む）必要があります。マイグレーションの点検なら、このくらいの割り切りで役に立ちます。
- 本物の道具には、Squawk（PostgreSQL のマイグレーションの点検）などがあります。CI で、新しいマイグレーションのファイルにだけ動かすと、レビューで見落としにくくなります（第11部 第59章）。

## 問題8 合言葉とヘルスチェックつきの、切り替えるプロキシ

大事な所は3つです。

```ts
function sameToken(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
```

- 合言葉を `===` で比べると、合っている文字が多いほど少しだけ時間がかかり、それを測って1文字ずつ当てられる恐れがあります。`timingSafeEqual` は、長さが同じなら、どこで違っても同じ時間で比べます。長さが違うと例外を投げるので、両方を同じ長さ（32 バイト）のハッシュにしてから比べます。

```ts
function forward(req, res) {
  const port = options.upstreams[active]!; // 頼みが来たときの行き先を、ここで決める
  const upstream = http.request({ host: '127.0.0.1', port, … }, …);
  …
}
```

- 行き先のポートを、頼みが来た時に変数に取っておくので、その後で `active` が変わっても、この頼みは最後まで同じ行き先で終わります。テストの「処理中だった頼み」は、これを確かめています。

```ts
if (!(await healthy(options.upstreams[to]!))) {
  sendJson(res, 409, { error: `${to} の ${healthPath} が 200 になりません。切り替えません` });
  return;
}
```

- 切り替える前に、行き先のヘルスチェックを `AbortSignal.timeout` 付きで確かめます。本文 6.3節の「起動しない新しい版」には切り替えません。
- 状態 409（Conflict）は、「頼みの形は正しいが、今の状態では受けられない」の意味で使いました。
- `Object.hasOwn` で名前を調べるのは、`{"to":"toString"}` のような、オブジェクトがもともと持っている名前を「ある」と見ないためです（第4部 第19章）。
- 切り替えの API は、合言葉があっても、外に出さないのがいちばんです。本物では、`/__deploy/` を別のポートで待つか、Mac（サーバ）の中からだけ届くようにします。
