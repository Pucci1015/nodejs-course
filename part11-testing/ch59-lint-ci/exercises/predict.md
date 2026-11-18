# 練習問題4 考えて答える

答えを書いてから、動かして確かめられるものは確かめてください。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

## 問1 warning と終了コード

設定が `rules: { 'prefer-const': 'warn' }` だけのとき、`let a = 1; export { a };` と書いたファイルを lint しました。

1. `npx eslint .` の終了コード（`echo $?` で出る数）は、いくつでしょう
2. `npx eslint . --max-warnings 0` ではどうでしょう
3. CI で lint するとき、どちらで動かすべきでしょう。なぜでしょう

## 問2 && と ;

`package.json` の `check` を、次の2通りで書きました。`lint` で ESLint が error を出したとします（ほかは通る）。

```json
"check": "npm run typecheck && npm run lint && npm run format:check && npm test"
```

```json
"check": "npm run typecheck; npm run lint; npm run format:check; npm test"
```

1. それぞれ、テスト（`npm test`）は動くでしょうか
2. それぞれ、`npm run check` の終了コードは 0 でしょうか、0 以外でしょうか
3. CI で `run: npm run check` としたとき、2つ目の書き方では何が困るでしょう

## 問3 ESLint と Prettier がぶつかると

Prettier の設定は `"singleQuote": true` です。ESLint の設定に、`eslint-config-prettier` を入れずに、`quotes: ['error', 'double']`（文字列は `"` で囲む）というルールを足しました。

1. `npx prettier --write .` の後に `npx eslint .` を動かすと、どうなるでしょう
2. `npx eslint . --fix` の後に `npx prettier --check .` を動かすと、どうなるでしょう
3. `eslint-config-prettier` を `extends` の**最後**に置くのは、なぜでしょう

## 問4 CI のあれこれ

1. CI では `npm install` ではなく `npm ci` を使います。違いは何でしょう（第3部 第14章）
2. `actions/setup-node` の `cache: npm` は、何を覚えておき、いつ使い直すでしょう。`node_modules` を覚えておくのでしょうか
3. ワークフローの先頭に `permissions: contents: read` と書きました。書かないと、どうなることがあるでしょう
