# 第56章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part11/ch56-testing-basics`）で `node --test samples/○○.test.ts` と打ちます。この章のサンプルは、サーバを起動しません。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [duration.ts](duration.ts) | 1 | `parseDuration`（`1h30m` などを分の数にする） |
| [duration.test.ts](duration.test.ts) | 1〜3・9 | `parseDuration` のテスト。境界を表で回す。`MODULE` で実装を取り替えられる |
| [mutants/](mutants/) | 9 | `duration.ts` をわざと壊したもの（ミュータント） |
| [due.ts](due.ts) | 5.1 | `daysUntil`・`dueLabel`（「今」を引数で受け取る） |
| [due-bad.ts](due-bad.ts) | 5.1・5.2 | 中で `new Date()` を読む、テストしにくい形 |
| [due.test.ts](due.test.ts) | 5.1・5.2 | 「今」を引数で渡すテストと、`mock.timers` で `Date` を止めるテスト |
| [debounce.ts](debounce.ts)・[debounce.test.ts](debounce.test.ts) | 5.3 | `mock.timers` で `setTimeout` の時間を進める |
| [remind.ts](remind.ts)・[remind.test.ts](remind.test.ts) | 6 | 送る処理を引数で受け取る関数と、`mock.fn`・`mock.method` のテスト |
| [shipping.ts](shipping.ts)・[shipping.test.ts](shipping.test.ts) | 8 | カバレッジを測る（わざと足りないテスト） |
| [tsconfig.json](tsconfig.json) | | このフォルダを `npx tsc` で確かめる設定 |

```sh
$ cd ~/dev/part11/ch56-testing-basics
$ node --test samples/duration.test.ts
$ node --test --experimental-test-coverage samples/shipping.test.ts
$ cd samples && node ../../tools/check-tests.ts duration.test.ts    # samples の duration.ts とミュータントで確かめる
```
