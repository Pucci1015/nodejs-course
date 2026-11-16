# 第40章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [proxy.config.ts](proxy.config.ts) | `MODULE=../solutions/proxy.config.ts npx vitest run proxy.config.test.ts` |
| 2 | [env.ts](env.ts) | `MODULE=../solutions/env.ts npx vitest run env.test.ts` |
| 3 | [api-url.ts](api-url.ts) | `MODULE=../solutions/api-url.ts npx vitest run api-url.test.ts` |
| 4 | この README の下 | — |
| 5 | [once.ts](once.ts) | `MODULE=../solutions/once.ts npx vitest run once.test.ts` |
| 6 | [h.ts](h.ts) | `MODULE=../solutions/h.ts npx vitest run h.test.ts` |
| 7 | [build-info.ts](build-info.ts) | `MODULE=../solutions/build-info.ts npx vitest run build-info.test.ts` |
| 8 | [mount.ts](mount.ts) | `MODULE=../solutions/mount.ts npx vitest run mount.test.ts` |

`solutions/` で `npx tsc` を動かすと、解答の型も確かめられます（エラーは出ません）。

## 問題1〜3 のポイント

- 問題1: `proxy: { '/api': 'http://127.0.0.1:9500' }` の短い書き方でも、`{ target: … }` の書き方でもかまいません。`target` の書き方なら、`changeOrigin` などの細かい設定も足せます。
- 問題2: `VITE_API_BASE` は「空」と「オリジン」のどちらかなので、`z.union([z.literal(''), origin])` です。`names` を重ならないようにするには `new Set(…)` を通します（1つの名前に間違いが2つ出ることがあるため）。
- 問題3: `URLSearchParams` は、空白を `+` に、`&` を `%26` にします。自分で `encodeURIComponent` を書くより、間違いがありません。

## 問題4 の答え

1. 中身を変えなければ、何回 build しても**同じ名前**です（名前は中身から作るハッシュ）。`stats.ts` を変えると、`stats-….js` の名前が変わり、さらに `index-….js` の名前も変わります。`index-….js` の中に、`stats-….js` の名前が書かれているからです（名前が変わったので、`index` の中身も変わった）。
2. 見つかるのは `dev-only-secret-0000`（`VITE_SECRET`）だけです。`VITE_` が付いた値は、build したファイルに**文字としてそのまま**入ります。`SECRET` は画面のコードには入らず、`import.meta.env.SECRET` は `undefined` です。だから、秘密の値を `VITE_` の名前で書いてはいけません。
3. `strictPort: true` があると、2つ目は「Port 5173 is already in use」で止まります。消すと、「Port 5173 is in use, trying another one...」と出て、5174 で動きます。番号が変わると、練習用の API の CORS（5173 だけを許す）や、ブックマークとずれます。
4. 画面は動きます（Vite は型を取り除くだけ）。表示は `undefined` などのおかしなものになります。`npx tsc` は、`Property 'dueDate' does not exist on type 'number'.` などのエラーを出します。
5. `gzip:` は、gzip で圧縮したときの大きさです。サーバが圧縮して送れば、ネットワークを通る量はこちらに近くなります。`hello` で `zod` をやめると、`index-….js` は約 85 kB（gzip 25 kB）から約 1.4 kB（gzip 0.9 kB）になります。パッケージを1つ足すと、それだけ画面が重くなることがあります。足す前に、大きさを確かめる習慣を付けます。
6. `vite preview` は起動しますが、`dist/` が無いので、http://localhost:4173/ は 404 になります。`preview` は「build 済みのものを配る」だけで、自分では build しません。

## 問題5〜8 のポイント

- 問題5: `pending ??= loader().catch(…)` の `??=` は、「`pending` が `null` か `undefined` のときだけ代入する」書き方です。失敗したときに `pending = undefined` に戻すと、次の呼び出しでやり直せます。
- 問題6: `h` は、第41章の JSX が中でしていることの小さな版です。`<li className="task">牛乳</li>` と書くと、React は `jsx('li', { className: 'task', children: '牛乳' })` のような呼び出しに変えます。`HTMLElementTagNameMap[K]` で戻り値の型が決まるのは、第36章のジェネリクスと、`keyof`（タグの名前の一覧）の組み合わせです。
  - `el.addEventListener('click', props.onClick)` は、`el` の型が `HTMLElementTagNameMap[K]`（K がまだ決まっていない型）のままだと、`click` のイベントの型が `MouseEvent` だと tsc が分かりません。いったん `const base: HTMLElement = el;` に入れてから呼んでいます。
- 問題7: プラグインは、ただのオブジェクトです。`vite.config.ts` の `plugins: [buildInfo()]` に入れれば、Vite が `resolveId`・`load` を呼びます。テストでは、Vite を動かさずに、フックを直接呼んで確かめています。
- 問題8: 第39章では `let state` と `render` で作りました。ここでは、`load` の中で直接 DOM を変えています。小さな画面ならこれで足りますが、状態が増えると、第39章 8節のつらさが出てきます。次の第41章で、React で書き直します。
