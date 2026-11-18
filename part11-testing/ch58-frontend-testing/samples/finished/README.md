# 第58章 テストの完成形（samples/finished）

本文の「手を動かす」で `web/` に書くテストと、Playwright の設定の完成形です。`samples/app` と同じ並びに置いてあるので、`app` のコピーに重ねると動きます（動かし方は [../README.md](../README.md)）。このフォルダだけでは、`import` する部品が無いので動きません。

| フォルダ・ファイル | 中身 |
| --- | --- |
| [src/](src/) | Vitest のテスト（12 個）と、テストの道具 `test-helpers.tsx` |
| [e2e/](e2e/) | Playwright の E2E のテスト（3 個） |
| [playwright.config.ts](playwright.config.ts) | Playwright の設定（API 9721・画面 9722） |
