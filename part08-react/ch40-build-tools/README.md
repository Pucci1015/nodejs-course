# 第40章 ビルドツール

第39章の画面は、ブラウザがそのまま読める JavaScript だけで書きました。そのため、TypeScript も、npm のパッケージ（`zod` など）も使えませんでした。
この章では、**ビルドツール**の **Vite**（ヴィート）を使います。Vite は、開発中は TypeScript やパッケージをブラウザが読める形にその場で変えて配り、公開するときは、全部を少数のファイルにまとめます（**バンドル**）。第41章からの React も、Vite の上で動かします。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第39章、第3部 第14章（npm・モジュール）、第7部（TypeScript） |
| この章のゴール | ブラウザがそのままでは読めないもの（`.ts`・パッケージの名前の import）と、バンドラが何をするかを説明できる / Vite の開発サーバで画面を動かせる / CSS・JSON・画像を import できる / `import.meta.env` と `.env` を使い、秘密の値を画面に入れてはいけない理由を説明できる / プロキシで API を同じオリジンに見せられる / `vite build` で作ったファイルを読める / プラグインが何をするかを説明できる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`hello/`・`tasks-app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch40-build-tools/` で実行します。手を動かして作るフォルダ（`hello/`・`tasks-app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch40-build-tools
>   ```
>
> - Vite の開発サーバは、ポート **5173** を使います。第39章のファイルのサーバ（`node ../tools/serve.ts`）が動いていたら、Ctrl+C で止めておいてください。
> - 5節からは、練習用の API（`~/dev/part08` で `npm run api`）も使います。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| Vite の開発サーバ（2節） | 第41〜45章のすべての画面、第8部の成果物 |
| `import.meta.env` と `.env`（4節） | 第8部の成果物（中継先を環境変数 `API_TARGET` で変える）、第12部（本番とステージングで値を変える） |
| プロキシ（5節） | 第43章・成果物（`/api` を練習用の API や第7部の API に中継する） |
| `tsconfig.json` の読み方（6節） | 第41〜46章（`.tsx` の設定）、第9部（Next.js の tsconfig） |
| `vite build` とファイルの名前のハッシュ（7節） | 第12部 第65章（CDN と `Cache-Control`。名前が変わるファイルは長く覚えさせる） |
| プラグイン（8節） | 第41章（React のプラグイン）、第45章（Tailwind CSS のプラグイン） |

---

## 1. なぜビルドするのか

第39章の `serve.ts` で、次の2つを動かすと、ブラウザの Console にこう出ます。

```js
import { z } from 'zod'; // a.js
```

```text
Failed to resolve module specifier "zod". Relative references must start with either "/", "./", or "../".
```

```ts
const n: number = 1; // b.ts
```

```text
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream".
```

- ブラウザの `import` は、URL（`./a.js`・`/src/a.js`）しか読めません。`'zod'` のような**パッケージの名前**を、`node_modules` の中のファイルに置き換えるのは、Node.js の決まりで、ブラウザは知りません。
- ブラウザは、TypeScript を読めません（型を取り除く人がいない）。
- パッケージは、中でさらにたくさんのファイルを import しています。そのままブラウザに配ると、何百回もリクエストすることになります。

これを片付けるのが**ビルドツール**です。

| 仕事 | 中身 |
| --- | --- |
| 変換 | TypeScript・JSX（第41章）を、ブラウザが読める JavaScript にする |
| 解決 | `'zod'` を `node_modules/zod/…` のファイルにする |
| バンドル | たくさんのファイルを、少数のファイルにまとめる（使っていない部分は捨てる） |
| 開発サーバ | 保存したらすぐ画面に出す |

Vite は、**開発中**は、ブラウザに頼まれたファイルを1つずつその場で変換して返し（速い）、**公開用**には、Rolldown という部品で全部をまとめます（`vite build`）。

## 2. 手を動かす: Vite を動かす

### 2.1 最初の画面

`hello` フォルダを作ります。

```sh
$ mkdir -p hello/src
$ cd hello
```

`hello/index.html` を作ります。Vite では、`index.html` がアプリの入り口です。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>はじめての Vite</title>
  </head>
  <body>
    <h1 id="title"></h1>
    <ul id="tasks"></ul>
    <img id="logo" alt="ロゴ" width="48" />
    <p id="env"></p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- `src="/src/main.ts"`: `.ts` のファイルを、そのまま書きます。Vite が、ブラウザに頼まれたときに JavaScript に変えて返します。

`hello/src/main.ts` を作ります（3・4・8節で使う所も、先に書いてしまいます。足りないファイルは、この後で作ります）。

```ts
import { z } from 'zod'; // node_modules のパッケージを、名前だけで import できる
import './style.css'; // CSS も import できる（Vite が <style> にして入れる）
import logoUrl from './logo.svg'; // 画像は、その URL（文字列）になる
import tasksJson from './tasks.json'; // JSON は、そのままオブジェクトになる
import { greeting } from 'virtual:greeting'; // 8節: プラグインが作るモジュール

const Task = z.object({ id: z.number(), title: z.string() });
type Task = z.infer<typeof Task>;

const tasks: Task[] = z.array(Task).parse(tasksJson);

const title = document.querySelector<HTMLHeadingElement>('#title');
const list = document.querySelector<HTMLUListElement>('#tasks');
const logo = document.querySelector<HTMLImageElement>('#logo');
const env = document.querySelector<HTMLParagraphElement>('#env');
if (!title || !list || !logo || !env) throw new Error('index.html に要素がありません');

title.textContent = `タスク（${tasks.length} 件）`;
list.replaceChildren(
  ...tasks.map((t) => {
    const li = document.createElement('li');
    li.textContent = t.title;
    return li;
  }),
);
logo.src = logoUrl;
// 4節: import.meta.env は、Vite が埋め込む値
env.textContent = `MODE=${import.meta.env.MODE} / VITE_GREETING=${import.meta.env.VITE_GREETING ?? '（なし）'}`;
console.log(greeting);
```

`hello/tsconfig.json` を作ります（6節で説明します）。

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "vite.config.ts"]
}
```

3節と8節のファイル（`style.css`・`logo.svg`・`tasks.json`・`vite.config.ts`・`virtual.d.ts`）は、[samples/hello/](samples/hello/) からコピーしておきます。

```sh
$ cp ../samples/hello/src/style.css ../samples/hello/src/logo.svg ../samples/hello/src/tasks.json ../samples/hello/src/virtual.d.ts src/
$ cp ../samples/hello/vite.config.ts ../samples/hello/.env .
```

開発サーバを動かします。

```sh
$ npx vite

  VITE v8.3.5  ready in 122 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

- `npx vite` は、今いるフォルダの `index.html` を入り口にして、開発サーバを動かします。止めるのは Ctrl+C（か `q` と Enter）です。
- `vite` は、`~/dev/part08/node_modules/.bin/` にあります。`npx` は、上のフォルダの `node_modules` も探します（第7部 第35章）。

http://localhost:5173/ を開くと、「タスク（2 件）」と2つの題名、ロゴ、`MODE=development / VITE_GREETING=こんにちは` が出ます。

### 2.2 保存したら、すぐ変わる（HMR）

ブラウザを開いたまま、`src/style.css` の `color: teal;` を `color: crimson;` に変えて保存します。ページを読み直さなくても、見出しの色が変わります。`src/main.ts` を変えて保存すると、ページが自動で読み直されます。

これを **HMR**（Hot Module Replacement）と言います。Vite の開発サーバは、ブラウザと WebSocket（第5部 第27章）でつながっていて、「このファイルが変わった」と知らせます（DevTools の Console の `[vite] connected.`）。

DevTools の Network を見ると、`main.ts` や `style.css` が、別々のリクエストで届いています。開発中は**まとめずに**、1つずつ変換して配っています。

## 3. CSS・JSON・画像の import

`main.ts` の最初の行を見ます。

| 書き方 | 何になるか |
| --- | --- |
| `import { z } from 'zod'` | `node_modules/zod` のモジュール |
| `import './style.css'` | その CSS が、ページに入る（開発中は `<style>`、build では `.css` のファイル） |
| `import tasksJson from './tasks.json'` | JSON を読んだオブジェクト |
| `import logoUrl from './logo.svg'` | 画像の **URL の文字列**（`/src/logo.svg`、build では `/assets/logo-ハッシュ.svg` か、小さければ `data:` の URL） |

- JavaScript から CSS や画像を import するのは、JavaScript の決まりではなく、**Vite の決まり**です。Node.js で `node src/main.ts` と動かすと、`import './style.css'` で止まります。
- `tasksJson` の型は、tsc が JSON の中身から作ります（`resolveJsonModule`）。それでも、外のファイルの中身なので、`main.ts` では Zod で確かめてから使っています（第38章）。

## 4. 環境変数（import.meta.env）

### 4.1 手を動かす: .env を読む

`hello/.env` を見ます（2.1節でコピーしたもの）。

```text
# 第40章 4節: VITE_ で始まる名前だけが、画面のコード（import.meta.env）から見える
# ここに書いた値は、ビルドした JavaScript にそのまま入る。秘密の値は書かない
VITE_GREETING=こんにちは
```

Vite は、起動するときに `.env` を読み、`VITE_` で始まる名前だけを `import.meta.env` に入れます。`main.ts` では、`import.meta.env.VITE_GREETING` で読んでいます。

| 名前 | 中身 |
| --- | --- |
| `import.meta.env.MODE` | `npx vite` なら `'development'`、`npx vite build` なら `'production'` |
| `import.meta.env.DEV`・`PROD` | 開発中か・build したものか（`true` か `false`） |
| `import.meta.env.VITE_…` | `.env`（や、起動するときの環境変数）に書いた値。いつも**文字列** |

- `.env` を変えたら、開発サーバを起動し直します（起動のときに1回だけ読むため）。
- 第5部 第26章の Node.js の `process.env` は、サーバの中だけで読む値でした。`import.meta.env` は、**ビルドしたファイルに文字としてそのまま入ります**。ブラウザに届くので、だれでも DevTools で読めます。

> **秘密の値（API キー・パスワード）は、`VITE_` の名前で書きません。** 画面のコードに入れた値は、隠せません。秘密の値が要る処理は、サーバ（API）の中でします。`VITE_` が付いていない名前は、画面のコードには入りません（練習問題4で確かめます）。

## 5. プロキシ: API を同じオリジンに見せる

### 5.1 手を動かす: 第39章の画面を Vite で動かす

第39章では、画面（`localhost:5173`）と API（`127.0.0.1:9500`）が別のオリジンだったので、CORS が要りました。Vite の開発サーバに**プロキシ**（中継）を頼むと、画面からは同じオリジンの `/api/…` に見えます。

`tasks-app` フォルダを作ります。

```sh
$ cd ~/dev/part08/ch40-build-tools
$ mkdir -p tasks-app/src
$ cd tasks-app
```

`tasks-app/vite.config.ts` を作ります。

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true, // 5173 が使われていたら、別の番号にせず止まる
    proxy: {
      // 画面からは同じオリジン（localhost:5173）の /api に見える。CORS は要らない
      '/api': 'http://127.0.0.1:9500',
    },
  },
});
```

`tasks-app/src/api.ts` を作ります。第39章の `request` を TypeScript にし、応答を Zod で確かめます。

```ts
import { z } from 'zod';

export const Task = z.object({
  id: z.number(),
  title: z.string(),
  status: z.enum(['todo', 'doing', 'done']),
  dueDate: z.string().nullable(),
  version: z.number(),
});
export type Task = z.infer<typeof Task>;
const Page = z.object({ items: z.array(Task), nextCursor: z.string().nullable() });

export async function listTasks(): Promise<Task[]> {
  // プロキシがあるので、オリジンを書かずに /api から始める
  const res = await fetch('/api/tasks?limit=100&sort=dueDate');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Page.parse(await res.json()).items;
}
```

`index.html`・`src/main.ts`・`src/stats.ts`・`tsconfig.json` は、[samples/tasks-app/](samples/tasks-app/) からコピーします（`tsconfig.json` は、`extends` を `"../../tsconfig.base.json"` に直します）。

```sh
$ cp ../samples/tasks-app/index.html .
$ cp ../samples/tasks-app/src/main.ts ../samples/tasks-app/src/stats.ts src/
$ printf '{\n  "extends": "../../tsconfig.base.json",\n  "include": ["src", "vite.config.ts"]\n}\n' > tsconfig.json
```

- `printf '文字' > ファイル` は、文字をファイルに書くコマンドです。`\n` は改行です。エディタで作ってもかまいません。

練習用の API を動かしたまま（別のターミナルで `cd ~/dev/part08 && npm run api`）、`npx vite` で開発サーバを動かし、http://localhost:5173/ を開くと、5件のタスクが出ます。

DevTools の Network で `tasks?limit=…` を見ると、URL は `http://localhost:5173/api/tasks?…` で、`Access-Control-Allow-Origin` のヘッダはありません。ブラウザから見ると同じオリジンなので、CORS が要りません。Vite の開発サーバが、受け取ったリクエストを `http://127.0.0.1:9500` に送り直し、応答を返しています。

```text
ブラウザ ──/api/tasks──▶ Vite（5173） ──/api/tasks──▶ 練習用の API（9500）
```

- `strictPort: true`: 5173 が使われていたら、別の番号にせず、止まります。番号が勝手に変わると、プロキシや CORS の設定とずれるからです。
- プロキシは、**開発サーバ**（と `vite preview`）の機能です。本番では、同じことを別の方法（同じサーバから画面と API を配る、など）でします（第12部）。

## 6. TypeScript の設定を読む

### 6.1 tsconfig.base.json

`hello/tsconfig.json` は、部の直下の [../tsconfig.base.json](../tsconfig.base.json) を `extends` で読んでいます。第7部の設定との違いは、次の所です。

| 設定 | 第8部 | 第7部（Node.js） | 理由 |
| --- | --- | --- | --- |
| `lib` | `["es2024", "DOM", "DOM.Iterable"]` | `["es2024"]` | `document`・`HTMLElement` などの型を使う |
| `module`・`moduleResolution` | `esnext`・`bundler` | `nodenext` | import の解決は Vite（バンドラ）の決まり。パッケージの名前や、拡張子の無い import も読める |
| `jsx` | `react-jsx` | なし | 第41章の JSX を、React の関数の呼び出しとして読む |
| `types` | `["vite/client", "node"]` | `["node"]` | `import.meta.env`・CSS や画像の import の型（`vite/client`）。テストの `process.env` のために `node` も |

`strict`・`noUncheckedIndexedAccess`・`verbatimModuleSyntax`・`noEmit` などは、第7部と同じです。

### 6.2 Vite は型を確かめない

`tasks-app/src/main.ts` の `renderTask` の引数を `task: number` に変えて保存しても、開発サーバの画面は動き続けます（変な表示になるだけ）。Vite は、`.ts` から**型を取り除くだけ**で、型が正しいかは確かめません（速くするため）。

型は、`npx tsc` で確かめます。

```sh
$ npx tsc
src/main.ts:20:25 - error TS2339: Property 'dueDate' does not exist on type 'number'.
（ほかにも出る）
```

- 確かめたら、`task: Task` に戻しておきます。
- 第7部の `npm run check` と同じく、コミットの前やビルドの前に `npx tsc` を動かす習慣にします。

`main.ts` の最初の `$` 関数を見てください。

```ts
function $<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (el === null) throw new Error(`index.html に ${selector} がありません`);
  return el;
}
```

`document.querySelector` は、見つからなければ `null` を返すので、戻り値の型は `HTMLElement | null` です。`$` の中で `null` を確かめて投げておけば、`$` の戻り値は `null` になりません。関数の中で使うたびに `if` や `!` を書かずに済みます（第35章 5節）。

## 7. ビルドとプレビュー

### 7.1 手を動かす: vite build

`tasks-app` で、公開用のファイルを作ります。

```sh
$ npx vite build
vite v8.3.5 building client environment for production...
transforming...
✓ 102 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.41 kB │ gzip:  0.28 kB
dist/assets/stats-DmZMyHnK.js   0.15 kB │ gzip:  0.16 kB
dist/assets/index-7z4-uwPW.js  86.76 kB │ gzip: 25.38 kB

✓ built in 143ms
```

- `dist/` に、公開するファイルが全部できます。`index.html` の中の `<script>` は、`/assets/index-7z4-uwPW.js` に書き換わっています（`cat dist/index.html` で見る）。
- ファイルの名前の `-7z4-uwPW` は、中身から作った**ハッシュ**です。中身が変われば名前も変わるので、ブラウザや CDN に「この名前のファイルは、ずっと覚えてよい」と言えます（第2部 第7章のキャッシュ。第12部 第65章）。
- `gzip:` は、圧縮して送ったときの大きさです。`zod` を丸ごと含むので、`index-….js` は 87 kB あります。

`npx vite preview` で、`dist/` を配るサーバを動かせます（http://localhost:4173/）。

```sh
$ npx vite preview
  ➜  Local:   http://localhost:4173/
```

- `preview` は、build したものを手元で確かめるためのサーバです。本番のサーバとしては使いません。
- `vite.config.ts` の `server.proxy` は、`preview` でも使われます。

### 7.2 import() で分ける

`main.ts` の「集計を見る」のボタンを見ます。

```ts
async function showStats() {
  const { summarize } = await import('./stats.ts');
  statsResult.textContent = summarize(tasks);
}
// addEventListener は、渡した関数の Promise を待たない。待たないことを void で書く（第37章 6節）
statsButton.addEventListener('click', () => void showStats());
```

`import('./stats.ts')`（**動的 import**）は、呼ばれたときに初めてファイルを読み込み、Promise を返します。build すると、`stats.ts` は別のファイル（`stats-DmZMyHnK.js`）になり、ボタンを押すまで読み込まれません。DevTools の Network で、ボタンを押したときに `stats-….js` が届くのを確かめます。

使う人が少ない画面（設定・集計）を分けておくと、最初に読むファイルが小さくなり、画面が早く出ます。第44章では、画面（ページ）ごとに分けます。

## 8. プラグイン

### 8.1 手を動かす: ファイルの無いモジュール

Vite は、**プラグイン**で機能を足せます。第41章の React（JSX を変換する）、第45章の Tailwind CSS も、プラグインです。

`hello/vite.config.ts` を見ます（2.1節でコピーしたもの）。

```ts
import { defineConfig, type Plugin } from 'vite';

function greeting(): Plugin {
  return {
    name: 'greeting',
    // import 'virtual:greeting' を見つけたら、「これは自分が作るモジュール」と名前を返す
    resolveId(id) {
      return id === 'virtual:greeting' ? '\0virtual:greeting' : undefined;
    },
    // その名前のモジュールの中身（JavaScript のコード）を、文字列で返す
    load(id) {
      if (id !== '\0virtual:greeting') return undefined;
      return `export const greeting = ${JSON.stringify(`ビルドした時刻: ${new Date().toLocaleString('ja-JP')}`)};`;
    },
  };
}

export default defineConfig({
  plugins: [greeting()],
});
```

`hello` で `npx vite` を動かし、DevTools の Console を見ると、`ビルドした時刻: …` が出ています。`main.ts` の `import { greeting } from 'virtual:greeting'` は、ファイルではなく、このプラグインが作ったモジュールを読んでいます。

| フック | Vite が呼ぶとき | 返すもの |
| --- | --- | --- |
| `resolveId(id)` | `import 'id'` を見つけたとき | 自分が受け持つなら、そのモジュールの名前。受け持たないなら `undefined` |
| `load(id)` | モジュールの中身が要るとき | 中身（JavaScript のコードの文字列）。受け持たないなら `undefined` |
| `configResolved(config)` | 設定が決まったとき | なし（`config.mode` などを覚えておける） |

- 名前の前の `\0` は、「本物のファイルではない」という印です（ほかのプラグインが、ファイルとして読もうとしない）。
- tsc は、プラグインが作るモジュールを知らないので、`src/virtual.d.ts` で型を教えています（`declare module`。第37章 2節の `.d.ts`）。

## 9. ほかのツール・Flask と比べる

| ツール | 中身 |
| --- | --- |
| webpack | 長く使われてきたバンドラ。設定が多い。古いプロジェクトでよく見る |
| esbuild | Go で書かれた、とても速い変換・バンドラ |
| Rollup・Rolldown | ライブラリのバンドラ。Vite 8 は、build に Rolldown（Rust で書かれた Rollup の後継）を使う |
| Parcel | 設定がほとんど要らないバンドラ |

Flask では、CSS や JavaScript は `static/` フォルダに置き、`url_for('static', filename='app.js')` で URL を作って、そのまま配っていました。ビルドはしません。TypeScript やパッケージを使いたいときは、Flask のアプリとは別に Vite などでビルドし、できたファイルを `static/` に置く、という形になります。

## まとめ

- ブラウザは、パッケージの名前の import も TypeScript も読めない。ビルドツールが、変換・解決・バンドルをする。
- Vite は、開発中はファイルを1つずつ変換して配り（HMR で保存するとすぐ変わる）、`vite build` で `dist/` にまとめる。
- CSS・JSON・画像も import できる（Vite の決まり）。
- `import.meta.env.VITE_…` はビルドしたファイルにそのまま入る。秘密の値は書かない。
- 開発サーバのプロキシで、`/api` を API に中継すれば、CORS が要らない。
- Vite は型を確かめない。`npx tsc` で確かめる。
- build したファイルの名前にはハッシュが付く。`import()` で、後で読むファイルを分けられる。
- プラグインは `resolveId`・`load` などのフックで、Vite に機能を足す。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Vite 公式「はじめに」: https://ja.vite.dev/guide/
- Vite 公式「環境変数とモード」: https://ja.vite.dev/guide/env-and-mode
- Vite 公式「サーバーオプション（server.proxy）」: https://ja.vite.dev/config/server-options
- Vite 公式「プラグイン API」: https://ja.vite.dev/guide/api-plugin
- MDN「JavaScript モジュール」（動的 import）: https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Modules

---

前: [第39章 素の JavaScript で API とつなぐ](../ch39-vanilla-api/README.md) ／ 次: [第41章 React の基礎](../ch41-react-basics/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
