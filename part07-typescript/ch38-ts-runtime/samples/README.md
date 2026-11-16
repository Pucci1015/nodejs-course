# 第38章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [lie.ts](lie.ts) | `as` で言い切った型は、だれも確かめない（わざと TypeError で止まる） | 1 |
| [infer.ts](infer.ts) | スキーマから型を作る（`z.infer`・`z.input`・`z.output`） | 2 |
| [api.ts](api.ts) | Express の境界で確かめる。`parse<S extends z.ZodType>` で確かめた後の型を受け取る（ポート 9480） | 4 |
| [conditional.ts](conditional.ts) | 条件型（`T extends X ? A : B`）と `infer` | 4.3 |
| [upstream.ts](upstream.ts) | ほかのサービスの応答を確かめる。練習用のサービスもこのファイルの中で動かす（ポート 9481） | 5 |
| [env.ts](env.ts) | 環境変数をスキーマで読む（`preprocess`・`stringbool`・`refine`・`transform`） | 6 |
| [brand.ts](brand.ts) | ブランド型（`TaskId` と `UserId`） | 7 |
| [json-schema.ts](json-schema.ts) | スキーマから JSON Schema を作る | 8 |

## 動かし方

```sh
$ cd ~/dev/part07/ch38-ts-runtime/samples
$ node infer.ts
$ node api.ts            # Ctrl+C で止める
$ npx tsc                # samples の中を全部確かめる（エラーは出ない）
```
