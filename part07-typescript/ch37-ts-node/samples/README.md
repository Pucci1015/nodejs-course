# 第37章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル・フォルダ | 内容 | 本文の節 |
| --- | --- | --- |
| [enum-demo.ts](enum-demo.ts) | enum と引数のプロパティ。`node` では動かず、`npx tsx` なら動く（この教材では書かない書き方の例） | 1.2 |
| [build-try/](build-try/) | tsc でビルドして `dist/` の JavaScript を動かす、小さなプロジェクト | 1.3 |
| [env-and-files.ts](env-and-files.ts) | `process.env`・`readFile`・`process.argv` の型 | 3 |
| [pg-types.ts](pg-types.ts) | `pool.query<Row>` で、pg の行に型を付ける | 4.3 |
| [todo-api/](todo-api/) | データの層の interface・メモリの実装・型の付いた Express のアプリ・テスト | 4・5・7 |
| [floating.ts](floating.ts) | ESLint が見つける間違い（待ち忘れた Promise・any）。わざと直していない | 6 |

## 動かし方

```sh
$ cd ~/dev/part07/ch37-ts-node/samples
$ node env-and-files.ts
$ npx tsc                        # samples の中を確かめる（enum-demo.ts・build-try・todo-api は除く。エラーは出ない）
$ npx eslint floating.ts         # 6つのエラーが出る（わざと）
$ cd todo-api && npm run check   # 型・ESLint・テストをまとめて確かめる
```

`pg-types.ts` は、第6部の PostgreSQL が動いているときだけ動かせます（`cd ~/dev/part06 && docker compose up -d --wait`）。
