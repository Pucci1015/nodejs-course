# bin

コマンドの入口 [memo.mjs](memo.mjs) を置くフォルダです。`package.json` の `bin` から指しています。

1行目のシバン（`#!/usr/bin/env node`）と、実行の許可（`chmod +x`）が必要です。中身は、[../src/cli.mjs](../src/cli.mjs) の `main` を呼んで、返ってきた終了コードを `process.exitCode` に入れるだけです。入口を薄くしておくと、本体をテストから `import` しやすくなります。
