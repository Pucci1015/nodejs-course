# 第35章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [bug.mjs](bug.mjs) | 打ち間違いと、数のつもりの文字列。JavaScript では動かすまで気づけない | 0 |
| [bug.ts](bug.ts) | bug.mjs に型を付けたもの。**わざと直していない**ので、`npx tsc` で2つのエラーが出る | 0 |
| [hello.ts](hello.ts) | 型注釈。`node` で動かし、`npx tsc` で確かめる | 1.2 |
| [first-types.ts](first-types.ts) | 基本の型と推論 | 2 |
| [functions.ts](functions.ts) | 引数・戻り値・`?`・決まりの値・`void`・関数の型 | 3 |
| [task-type.ts](task-type.ts) | `type` と `interface`、`readonly`、無くてもよい項目、形で比べる | 4 |
| [null-check.ts](null-check.ts) | `find` の結果、`?.`・`??`、`\| null` | 5 |
| [any-unknown.ts](any-unknown.ts) | `any`・`unknown`・`as` | 6 |
| [status.ts](status.ts) | リテラル型のユニオン、`switch`、`as const` | 7 |
| [task-model.ts](task-model.ts)・[use-model.ts](use-model.ts) | 型を export・import する（`type` を付ける、拡張子は `.ts`） | 8.1 |
| [type-assert.ts](type-assert.ts)・[type-test-try.ts](type-test-try.ts) | 型を確かめる書き方（`@ts-expect-error`、`Expect<Equal<…>>`） | 9 |

## 動かし方

```sh
$ cd ~/dev/part07/ch35-ts-basics
$ node samples/functions.ts      # 動かす（型は確かめない）
$ cd samples && npx tsc; cd ..   # samples の中を全部確かめる（bug.ts の2つのエラーだけが出る）
```

- [tsconfig.json](tsconfig.json) は、このフォルダの `.ts` を確かめるための設定です（部の `tsconfig.base.json` を読み込む）。
