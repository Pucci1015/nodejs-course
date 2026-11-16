# 第40章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch40-build-tools/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 開発サーバとプレビューの設定 | [proxy.config.ts](proxy.config.ts)、[proxy.config.test.ts](proxy.config.test.ts) | 5・7 |
| 2 | 基本 | `import.meta.env` を確かめる | [env.ts](env.ts)、[env.test.ts](env.test.ts) | 4 |
| 3 | 基本 | API の URL を組み立てる | [api-url.ts](api-url.ts)、[api-url.test.ts](api-url.test.ts) | 5 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 4〜7 |
| 5 | 応用 | 読み込みを1回だけにする `once` | [once.ts](once.ts)、[once.test.ts](once.test.ts) | 7 |
| 6 | 応用 | 型の付いた、要素を作る関数 `h` | [h.ts](h.ts)、[h.test.ts](h.test.ts) | 6 |
| 7 | 応用 | `virtual:build-info` のプラグイン | [build-info.ts](build-info.ts)、[build-info.test.ts](build-info.test.ts) | 8 |
| 8 | 発展 | 第39章の画面を TypeScript で | [mount.ts](mount.ts)、[mount.test.ts](mount.test.ts) | 5・6、第39章 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第39章と同じです。`○○.ts` を書き、`npx vitest run ○○.test.ts` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.ts npx vitest run ○○.test.ts` で確かめられます。
この章からは TypeScript で書くので、`npx tsc` で型も確かめてください（このフォルダの `tsconfig.json` は、問題とテストのファイルを全部確かめます）。`any` と `as` は使いません。

---

## 基本

### 問題1 開発サーバとプレビューの設定

[proxy.config.ts](proxy.config.ts) の `defineConfig({ … })` の中に、次の設定を書いてください（本文5・7節）。アプリのフォルダでは、このファイルを `vite.config.ts` という名前で置きます。

| 設定 | 値 |
| --- | --- |
| 開発サーバのポート | 5173。使われていたら、別の番号にせず止まる |
| プロキシ | `/api` で始まるものを `http://127.0.0.1:9500` に中継する |
| プレビューのポート | 4173。使われていたら、別の番号にせず止まる |

```sh
$ npx vitest run proxy.config.test.ts
      Tests  3 passed (3)
```

ヒント: プレビューの設定は、`server` と同じ形で `preview: { … }` に書きます。

### 問題2 `import.meta.env` を確かめる

[env.ts](env.ts) の `readEnv(env)` を書いてください（本文4節、第38章 6節）。アプリでは `readEnv(import.meta.env)` と呼び、起動するときに1回だけ確かめます。

| 名前 | 決まり | 無いとき | 返す項目 |
| --- | --- | --- | --- |
| `VITE_API_BASE` | 空の文字列か、オリジンだけの URL（`http://127.0.0.1:9500`。パスや最後の `/` はだめ） | `''` | `apiBase`（文字列） |
| `VITE_POLL_MS` | 1000〜600000 の整数の文字列 | `5000` | `pollMs`（数） |
| `VITE_FEATURE_STATS` | `'true'`・`'false'` など（`z.stringbool()`） | `false` | `featureStats`（真偽値） |

決まりに合わない名前があれば、`EnvError`（書いてあります）を投げます。`names` には、合わなかった名前を、重ならないように全部入れます。ほかの名前（`MODE` など）は無視します。

ヒント: 「オリジンだけの URL か」は、`new URL(s).origin === s` で調べられます（URL として読めなければ `new URL` が投げるので、`try` で囲む）。

### 問題3 API の URL を組み立てる

[api-url.ts](api-url.ts) の `apiUrl(base, path, query)` を書いてください（本文5節）。`base` が `''` ならプロキシ用の `/api/…`、`'http://127.0.0.1:9500'` なら、そのオリジンの URL になります。

```ts
apiUrl('', '/api/tasks');                                    // '/api/tasks'
apiUrl('http://127.0.0.1:9500/', '/api/tasks', { limit: 20 }); // 'http://127.0.0.1:9500/api/tasks?limit=20'
apiUrl('', '/api/tasks', { status: undefined, all: true });  // '/api/tasks?all=true'
```

- `base` の最後の `/` は取ります。
- `query` の値が `undefined` か `null` の項目は付けません。数と真偽値は、文字にします。付ける項目が無ければ、`?` も付けません。

ヒント: `new URLSearchParams()` の `set(名前, 値)` で足していくと、エスケープもしてくれます。`toString()` で `limit=20&sort=-dueDate` の形になります。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `tasks-app` と `hello` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 読み込みを1回だけにする `once`

[once.ts](once.ts) の `once(loader)` を書いてください（本文7節）。`import()` で分けたファイルを、何回ボタンを押されても1回だけ読み込むために使います。

```ts
const loadStats = once(() => import('./stats.ts'));
button.addEventListener('click', async () => {
  const { summarize } = await loadStats(); // 2回目からは、同じ Promise
});
```

- `once` を呼んだだけでは、`loader` は動かしません。返した関数が初めて呼ばれたときに動かします。
- 読み込み中にもう一度呼ばれても、同じ Promise を返します（`loader` は1回）。
- `loader` が失敗したら、それを覚えずに、次に呼ばれたときにやり直します（ネットワークが一時的に切れていただけかもしれないので）。

ヒント: `let pending: Promise<T> | undefined;` に覚えます。失敗したときは、`.catch` の中で `pending = undefined` にしてから、同じエラーを投げ直します。

### 問題6 型の付いた、要素を作る関数 `h`

[h.ts](h.ts) の `h(tag, props, ...children)` と `$(selector, root)` を書いてください（本文6節、第39章 2節）。`document.createElement` を毎回書く代わりに、1回の呼び出しで、属性と中身の付いた要素を作ります。

```ts
const li = h('li', { className: 'task', dataset: { id: '1' } }, h('span', null, '牛乳'), ' ', 2);
// <li class="task" data-id="1"><span>牛乳</span> 2</li>
const input = h('input'); // 型は HTMLInputElement（input.value が使える）
```

| `props` の項目 | すること |
| --- | --- |
| `className`・`id` | そのまま入れる |
| `dataset` | `{ id: '1' }` → `data-id="1"` |
| `attrs` | `{ 'aria-label': '牛乳' }` → `setAttribute` |
| `onClick` | クリックで呼ぶ |

- `children` は、要素か、文字か、数です。`null`・`undefined`・`false` は飛ばします（`cond && h(…)` と書けるように）。文字は、**文字として**入れます。
- `$` は、`root`（省略なら `document`）の中で探し、無ければ、セレクタを含む文の `Error` を投げます。

ヒント: `HTMLElementTagNameMap` は、`'input'` → `HTMLInputElement` のような、タグの名前と要素の型の表です。`document.createElement(tag)` の戻り値の型も、これで決まります。
`el.append(…)` は、文字を渡すと文字として入れます。数は `String(…)` にしてから渡します。

### 問題7 `virtual:build-info` のプラグイン

[build-info.ts](build-info.ts) の `buildInfo({ now })` が返すプラグインに、フックを書いてください（本文8節）。アプリから次のように使えるようにします。

```ts
import { builtAt, mode } from 'virtual:build-info';
// builtAt: '2026-11-20T09:00:00.000Z'（ビルドした時刻の ISO 8601）、mode: 'production'
```

| フック | すること |
| --- | --- |
| `configResolved(config)` | `config.mode` を覚える |
| `resolveId(id)` | `id` が `'virtual:build-info'` なら `'\0virtual:build-info'` を返す。それ以外は `undefined` |
| `load(id)` | `id` が `'\0virtual:build-info'` なら、`builtAt` と `mode` を `export const` するコードの文字列を返す。それ以外は `undefined` |

- `builtAt` は `now().toISOString()` です。テストは `now` に決まった時刻を返す関数を渡します。
- 文字列をコードに埋め込むときは、`JSON.stringify(値)` にすると、`"` で囲まれ、中の `"` などもエスケープされます。

---

## 発展

### 問題8 第39章の画面を TypeScript で

[mount.ts](mount.ts) の `mountApp(root, api)` を書いてください（本文5・6節、第39章 3〜5節）。`api` は `TaskApi`（`list` と `create` を持つもの）で、テストでは偽物が渡されます。

`root` の中身を、次の3つに置き換えます。

```html
<form><input name="title" /><button>追加</button><p class="form-error"></p></form>
<p class="status"></p>
<ul></ul>
```

- 作ったらすぐ一覧を読み、`p.status` を「読み込み中…」→「2 件」にし、`<ul>` に題名の `<li>` を並べます。読めなければ「読み込めませんでした: （エラーの message）」です。`mountApp` の Promise は、最初の一覧を読み終えたら解決します。
- フォームが送られたら（`submit`）、題名の前後の空白を取り、空なら `p.form-error` に「題名を入れてください」を出して送りません。空でなければ、`api.create({ title, dueDate: null })` を呼び、成功したら入力を空にして一覧を読み直します。失敗したら、エラーの `message` を `p.form-error` に出します。

ヒント:
- `addEventListener('submit', …)` に `async` の関数を渡すと、ESLint の `no-misused-promises`（第37章 6節）に当たります。`api.create(…).then(…).catch(…)` と書くか、`async` の関数を別に作って `.catch` を付けて呼びます。
- エラーの `message` は、`err instanceof Error ? err.message : String(err)` で取り出します（`catch` の `err` は `unknown`）。
