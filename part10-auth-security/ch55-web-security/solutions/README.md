# 第55章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。どの解答も、`exercises/` で `MODULE=../solutions/○○.ts node --test ○○.test.ts` と打つと、テストで確かめられます。

| 問題 | 解答のファイル |
| --- | --- |
| 1 | [csp.ts](csp.ts) |
| 2 | [fetch-metadata.ts](fetch-metadata.ts) |
| 3 | [count-lines.ts](count-lines.ts) |
| 4 | このファイルの問題4 |
| 5 | [owner-app.ts](owner-app.ts) |
| 6 | [safe-fetch.ts](safe-fetch.ts) |
| 7 | [error-handler.ts](error-handler.ts) |
| 8 | [audit-gate.ts](audit-gate.ts) |

---

## 問題1 CSP のヘッダの値を作る

```ts
export function buildCsp(options: CspOptions = {}): string {
  const { nonce, connectSrc = [] } = options;
  if (nonce !== undefined && !/^[A-Za-z0-9+/]+={0,2}$/.test(nonce)) throw new Error('nonce は base64 の文字だけにしてください');
  for (const origin of connectSrc) {
    let ok: boolean;
    try {
      const url = new URL(origin);
      ok = url.protocol === 'https:' && url.origin === origin;
    } catch {
      ok = false;
    }
    if (!ok) throw new Error(`connectSrc はオリジン（https://名前）だけにしてください: ${origin}`);
  }
  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', nonce === undefined ? ["'self'"] : ["'self'", `'nonce-${nonce}'`]],
    // …（残りの7つ）
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}
```

- `new URL('https://api.example.com/').origin` は `'https://api.example.com'`（最後の `/` が無い）なので、元の文字列と比べると、パスが付いたもの（`/` だけでも）を断れます。
- 指示を配列の配列にしておくと、順番が決まり、1か所でつなげます。`Object.entries` でもかまいません。
- `base-uri 'none'` は、`<base href="…">` で相対の URL の行き先を変えられるのを防ぎます。`object-src 'none'` は、古いプラグイン（`<object>`・`<embed>`）を動かさない指示です。
- helmet の既定（本文2.1節）は、フォントやスタイルに `https:` を許すなど、少しゆるめです。自分のアプリで使うものが決まっているなら、この問題のように絞れます。

## 問題2 Fetch Metadata のミドルウェア

```ts
const SAFE_METHODS = new Set(['GET', 'HEAD']);

export function isAllowedRequest(info: RequestInfo, options: GuardOptions = {}): boolean {
  const { method, path, site, mode, dest } = info;
  if (site === undefined || site === 'same-origin' || site === 'none') return true;
  const isPublic = (options.publicPaths ?? []).some((prefix) => path.startsWith(prefix));
  if (isPublic && SAFE_METHODS.has(method)) return true;
  return SAFE_METHODS.has(method) && mode === 'navigate' && dest === 'document';
}
```

- 判断を、Express に関係のない関数（`isAllowedRequest`）に分けたので、テストでいろいろな組み合わせを手早く試せます。ミドルウェアは、ヘッダを読んで呼ぶだけです。
- `same-site`（同じサイトの別のオリジン。例: `app.example.com` から `api.example.com`）も断っています。同じサイトの中に、ほかの人が作ったページ（利用者ごとのサブドメインなど）があると、そこから送られるからです。自分のサービスどうしでやり取りするなら、`same-site` を許す設定を足します。
- `publicPaths` の判定は `startsWith` なので、`'/api/public/'` のように最後に `/` を付けて登録します。`'/api/public'` だと `/api/publicity` も当てはまってしまいます。
- `dest === 'document'` だけを許すので、別のサイトの `<iframe>` から開かれるページの移動（`dest` が `iframe`）も断ります。

## 問題3 `exec` の関数を直す

```ts
import { execFile } from 'node:child_process'; // 修正: exec ではなく execFile
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile); // 修正

export async function countLines(dir: string, name: string): Promise<number> {
  // 追加: dir の外を指す名前・隠しファイルは断る
  if (name === '' || name.includes('/') || name.includes('\\') || name.startsWith('.')) {
    throw new Error(`使えない名前です: ${name}`);
  }
  // 修正: シェルを通さない。'--' の後は、- で始まる名前でもオプションと読まれない
  const { stdout } = await execFileAsync('wc', ['-l', '--', name], { cwd: dir });
  return Number.parseInt(stdout.trim(), 10);
}
```

直す前の4つの失敗の理由です。

| 名前 | `exec` で何が起きたか |
| --- | --- |
| `Let's go.txt`・`say "hi".txt` | `"…"` の中に `"` があると、そこで文字列が終わり、コマンドが壊れる |
| `$HOME.txt` | シェルが `$HOME` を `/Users/alice` に置き換え、`/Users/alice.txt` を探す |
| `-l.txt` | `wc` がオプションとして読み、「知らないオプション」で失敗する |
| `../secret.txt` | 数えてしまう（`dir` の外のファイル） |

- `'--'` が無いと、`execFile` でも `-l.txt` はオプションとして読まれます。シェルを通さないことと、オプションとして読ませないことは、別の問題です。
- 名前に `/` が入らなければ `..` だけの名前も `.` で始まるので、まとめて断れます。第4部 第19章のように `path.resolve` と `path.relative` で外を指すかを調べる方法も、正しい答えです。
- Mac の `wc` は数の前に空白を入れる（`       3 Let's go.txt`）ので、`trim()` してから `parseInt` します。

## 問題4 考えて答える

### (1) 同じ nonce

nonce の役目は「攻撃する側が知らない値」であることです。同じ値を使い回すと、攻撃する側は、ページを1回開いて CSP のヘッダか `<script nonce="…">` からその値を読み、紛れ込ませる `<script>` に同じ nonce を書けます。そうすると CSP が許してしまい、XSS の第2の守りが無くなります。nonce は、リクエストごとに予想できないランダムな値（16 バイト以上）を作ります。

### (2) X-Powered-By

攻撃する側が「Express で作られている」と知って、Express や Node.js の知られた弱点を狙いやすくなるのを、少しだけ難しくします。ただし、エラーの画面の形、Cookie の名前（`connect.sid` など）、応答のヘッダの並び方などから、ほかの方法でも推測できます。中身の弱点が直っていなければ、名前を隠しても攻撃は成り立ちます。「隠す」は、直すことの代わりにはなりません。

### (3) どこで止まるか

- `SameSite=Lax`: 別のサイトからの POST なので、ブラウザはセッションの Cookie を付けません。アプリには「ログインしていない」リクエストとして届き、401 になります。
- Fetch Metadata（`rejectCrossSite`）: ブラウザは `Sec-Fetch-Site: cross-site`・`Sec-Fetch-Mode: navigate`・`Sec-Fetch-Dest: document` を付けます。POST なので、`rejectCrossSite` が 403 を返します。
- `Origin` の確かめ（第52章 5節）を入れていれば、`Origin` が別のサイトなので、それでも止まります。
- そもそも、このアプリには `POST /api/tasks/1/delete` という道はありません（消すのは `DELETE`。フォームからは `DELETE` を送れないので、ここでも止まります）。

どれか1つが漏れても、ほかが止めるように重ねておくのが大事です。

### (4) 403 と 404

403 を返すと、「その id のタスクはある（ほかの人のもの）」ことが分かります。id を 1 から順に試すと、全部で何件あるか、どの id がだれのものかなどを探られます。404 なら、無いものと区別できません。

403 がよいのは、「あることは知っていてよいが、その操作はできない」場面です。たとえば、チームのタスクを「見る」ことはできるが「消す」のは管理者だけ、というとき、見えているタスクの「消す」に 404 を返すのは不自然です。そのときは 403 で「権限がありません」と伝えます。

### (5) 引いてから確かめる

- 名前が `127.0.0.1` を返すように設定した、外の名前（自分で取ったドメインなら、だれでも作れます）。文字列は `localhost` ではないので通ってしまいます。
- `[::ffff:127.0.0.1]`（本文の出力の6行目）のような、同じアドレスの別の書き方。IP アドレスには、ほかにもいくつもの書き方があります。
- そもそも `10.0.0.5` や `169.254.169.254` のような、自分以外の中の網のアドレス。

名前やアドレスの書き方は、ほぼ無数にあります。文字列で比べず、引いた後の IP アドレスを、範囲で調べます。

### (6) npm audit の判断

B を先に対応します。

- B は `dependencies` で、本番で動き、利用者が上げた画像を読むという、だれでも条件を満たせる使い方をしています。重さも `high` です。直す版が 3 週間前に出ていて、メジャー版の更新でもないので、上げて、テストを動かして、早めに出します。
- A は開発の道具（ESLint）の中だけで、本番では動きません。条件も、外から来た値を読ませるものではありません。直す版が落ち着いてから、ふだんの更新と一緒に上げれば十分です。

`severity` の名前だけでなく、「どこで動くか」「条件に当てはまるか」「直す版があるか」で判断します。

## 問題5 認可の漏れを直す

全体は [owner-app.ts](owner-app.ts) です。直したのは4か所です。

```ts
// 修正: 持ち主（ownerId）は入力で受け取らない。知らない項目は断る（z.strictObject）
const CreateTask = z.strictObject({ title: z.string().min(1).max(100) });
const UpdateTask = z.strictObject({ title: z.string().min(1).max(100).optional(), done: z.boolean().optional() });

// 修正: 持ち主は、入力ではなくセッション（ログインしている人）から
const task: Task = { id: nextId++, ownerId: req.session.userId ?? 0, title: input.title, done: false };

/** 追加: 自分のタスクだけを探す */
const findOwn = (id: string, userId: number | undefined) => tasks.findIndex((t) => t.id === Number(id) && t.ownerId === userId);

app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks[findOwn(req.params.id, req.session.userId)];
  if (task === undefined) return res.status(404).json({ detail: 'タスクがありません' });
  Object.assign(task, UpdateTask.parse(req.body));
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const index = findOwn(req.params.id, req.session.userId); // 修正: 持ち主も条件に入れる
  // …
});
```

| 漏れ | 何ができてしまったか |
| --- | --- |
| DELETE が id だけで探す | ほかの人のタスクを消せる |
| PATCH が 403 を返す | 書き換えはできないが、ほかの人のタスクが「ある」と分かる |
| POST がボディの `ownerId` を使う | ほかの人のタスクとして作れる（マスアサインメント） |
| `z.object` が知らない項目を黙って捨てる | 今は害が無いが、後で `Object.assign` するときに項目を足すと、`ownerId` を書き換えられるようになる。断っておくほうが、送った側も間違いに気付ける |

- `tasks[-1]` は `undefined` なので、`findOwn` が見つけられなかったとき（`-1`）も、`undefined` の確かめで 404 にできます。
- 「書き換えるときは、持ち主を確かめる」を道ごとに書くと、新しい道を足したときに忘れます。探す関数を1つにし、id だけで探す書き方を残さないのが大事です。データベースなら、リポジトリの関数の引数に、いつも `ownerId` を取らせます（成果物）。

## 問題6 利用者の URL を安全に取りに行く

全体は [safe-fetch.ts](safe-fetch.ts) です。

```ts
for (let hops = 0; ; hops++) {
  await check(url, lookup);
  const res = await fetchFn(url.href, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
  const location = res.headers.get('location');
  if (res.status >= 300 && res.status < 400 && location !== null) {
    if (hops >= maxRedirects) throw new OutboundError('too_many_redirects', 'リダイレクトが多すぎます');
    url = new URL(location, url);
    continue;
  }
  const length = Number(res.headers.get('content-length') ?? '0');
  if (length > maxBytes) throw new OutboundError('too_large', '大きすぎます');
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > maxBytes) throw new OutboundError('too_large', '大きすぎます');
  return { url: url.href, status: res.status, body: bytes.toString('utf8') };
}
```

- ループのいちばん上で毎回 `check` するので、最初の URL も、リダイレクトの行き先も、同じ決まりで確かめます。
- `hops` は「たどったリダイレクトの数」です。`maxRedirects: 0` なら、最初の応答が 3xx の時点で断ります。
- `Content-Length` は送る側が書く値なので、うそもありえます。読んだ後のバイト数も確かめます。この解答は全部読んでから比べるので、とても大きな応答ではメモリを使います。本番では、`res.body` を少しずつ読み、上限をこえた所で読むのをやめます（第3部 第15章の Stream と同じ考え方）。
- 本文8.1節のとおり、確かめてから fetch するまでの間に DNS の答えを変えられる手口は、この形では防げません。

## 問題7 エラーを受け取るミドルウェア

全体は [error-handler.ts](error-handler.ts) です。

```ts
export function redact(text: string): string {
  return text.replace(/(\/\/[^:/@\s]+:)[^@\s]+@/g, '$1***@').replace(/(Bearer\s+)[^\s"']+/gi, '$1***');
}

function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const status = 'status' in err ? err.status : 'statusCode' in err ? err.statusCode : undefined;
  if (typeof status !== 'number' || status < 400 || status > 499) return undefined;
  if ('expose' in err && err.expose === false) return undefined;
  return status;
}
```

- 1つ目の正規表現は、`//` の後の「`:` も `/` も `@` も空白も無い文字の並び（ユーザー名）」+ `:` を `$1` として残し、`@` までのパスワードを `***` にします。`https://example.com/a@b` のように `:` の無いものは変えません。
- `'status' in err` で絞り込むと、TypeScript は `err.status` を `unknown` として読ませてくれます（第7部 第36章）。その後 `typeof status !== 'number'` で数に絞ります。
- `res.headersSent` のときに `next(err)` を呼ぶと、Express の既定の処理が接続を閉じます。ブラウザ（テストでは fetch）は、途中で切れた応答としてエラーになります。
- 4xx をログに書かないのは、利用者の入力の間違いで毎回ログが増えると、本当の問題が埋もれるからです。ただし、認証の失敗（401）などを数えるログは、別に残します（本文10節の表）。

## 問題8 `npm audit --json` を読むコマンド

全体は [audit-gate.ts](audit-gate.ts) です。

```sh
$ node audit-gate.ts < audit-part10.json; echo $?
moderate @typescript-eslint/eslint-plugin  → typescript-eslint@8.73.0
moderate @typescript-eslint/parser  → typescript-eslint@8.73.0
moderate @typescript-eslint/type-utils  → typescript-eslint@8.73.0
moderate @typescript-eslint/typescript-estree  → typescript-eslint@8.73.0
moderate @typescript-eslint/utils  → typescript-eslint@8.73.0
moderate eslint（直接の依存）  → eslint@10.15.0
moderate minimatch  → typescript-eslint@8.73.0
         minimatch has potential denial of service via globparts amplification https://github.com/advisories/GHSA-g3hv-75wg-m249
moderate typescript-eslint（直接の依存）  → typescript-eslint@8.73.0
合計 8 件（moderate 8）。基準: high 以上
0
$ node audit-gate.ts --level moderate < audit-part10.json > /dev/null; echo $?
1
$ echo '{}' | node audit-gate.ts; echo $?
エラー: npm audit --json の形ではありません
2
```

- `summarize` は Zod の `parse`（失敗で例外）、コマンドの部分は `safeParse` で、利用者に分かる文に置き換えています。Zod のエラーの文（JSON の形）は、コマンドを使う人には読みにくいからです。
- `z.looseObject` を使うのは、npm の版が上がって項目が増えても、読めなくならないようにするためです。逆に、使う項目（`severity` など）は `z.enum` で決まった値だけにして、知らない重さが来たら気付けるようにしています。
- 並べ替えの比べる関数は、重さの差が 0 のときだけ名前を比べます（`差 || 名前の比べ`）。`localeCompare` ではなく `<` で比べると、どの環境でも同じ順になります。
- CI（第11部 第59章）では、`npm audit --json --omit=dev | node audit-gate.ts --level high` のように、本番で動くものだけを、重いものだけで止める使い方ができます。
