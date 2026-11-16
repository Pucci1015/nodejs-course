# 第46章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [app/vite.config.ts](app/vite.config.ts)、[app/tsconfig.json](app/tsconfig.json) | Vite と TypeScript の設定 | 2.1 |
| [app/index.html](app/index.html) | HTML のひな形（`<!--app-html-->` などに、サーバが入れる） | 2.4 |
| [app/src/data.ts](app/src/data.ts) | ページのデータの型と、URL からページを決める関数 | 2.2 |
| [app/src/App.tsx](app/src/App.tsx) | サーバでもブラウザでも描く部品 | 2.3・3 |
| [app/src/entry-server.tsx](app/src/entry-server.tsx) | サーバの入り口（`renderToString`・`renderToPipeableStream`） | 2.3・6 |
| [app/src/entry-client.tsx](app/src/entry-client.tsx) | ブラウザの入り口（`hydrateRoot`） | 3 |
| [app/server.ts](app/server.ts) | Express の SSR のサーバ | 2.4・5・6 |

## 動かし方

ターミナルを2つ使います。

```sh
# 1つ目: 練習用の API（Ctrl+C で止める）
$ cd ~/dev/part08
$ npm run api

# 2つ目: ビルドしてから、SSR のサーバを動かす
$ cd ~/dev/part08/ch46-fullstack/samples/app
$ npx vite build --outDir dist/client
$ npx vite build --ssr src/entry-server.tsx --outDir dist/server
$ node server.ts   # http://localhost:5173/（Ctrl+C で止める）
```

`src/` を変えたら、2つのビルドをやり直してから、`node server.ts` を動かし直します。
