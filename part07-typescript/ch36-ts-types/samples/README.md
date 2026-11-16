# 第36章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [narrow.ts](narrow.ts) | 絞り込み（`=== null`・`typeof`・`Array.isArray`・`in`・`instanceof`） | 1 |
| [events.ts](events.ts) | 判別できるユニオンと `assertNever` | 2 |
| [guards.ts](guards.ts) | 型ガード（`value is Task`）とアサーション関数（`asserts value is Task`） | 3 |
| [generics.ts](generics.ts) | ジェネリクス（`first<T>`・`pluck<T, K extends keyof T>`・`Page<T>`） | 4 |
| [utility.ts](utility.ts) | ユーティリティ型（`Omit`・`Partial`・`Pick`・`Record`・`Awaited`・`Readonly`） | 5 |
| [result.ts](result.ts) | Result 型 | 6 |
| [satisfies.ts](satisfies.ts) | `as const`・`typeof`・`satisfies`・テンプレートリテラル型 | 7 |
| [classes.ts](classes.ts) | `implements`・`#private`・エラーのクラス | 8 |

## 動かし方

```sh
$ cd ~/dev/part07/ch36-ts-types
$ node samples/events.ts
$ cd samples && npx tsc; cd ..   # samples の中を全部確かめる（エラーは出ない）
```
