# 第11部の道具（tools/）

| ファイル | 中身 | 使う所 |
| --- | --- | --- |
| [check-tests.ts](check-tests.ts) | 「テストを書く」練習問題の確認の道具。書いたテストが、正しい実装では通り、わざと壊した実装（ミュータント）では落ちるかを確かめる（第56章 9節） | 第56〜58章の練習問題 |
| [tsconfig.json](tsconfig.json) | `check-tests.ts` を `npx tsc` で確かめるための設定 | — |

使い方（練習問題のフォルダで）:

```sh
$ node ../../tools/check-tests.ts slug.test.ts              # node --test で動かす
$ node ../../tools/check-tests.ts TaskCard.test.tsx --vitest # Vitest で動かす（テストのファイルのあるフォルダを Vitest の root にする）
$ node ../../tools/check-tests.ts ../solutions/slug.test.ts  # 模範解答のテストを確かめる
```

- テストのファイルが `slug.test.ts` なら、正しい実装は今いるフォルダの `slug.ts`、ミュータントは `mutants/slug-*.ts` です
- テストは、確かめる実装を環境変数 `MODULE` から読みます（練習問題のひな形のとおり）。道具は、`MODULE` を正しい実装・ミュータントの順に変えて、テストを何回も動かします
- 中身は読まなくてかまいません（第56章 9節で、同じことを手で1回ずつ確かめます）
