# 第16章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [hello-cli/](hello-cli/) | `bin` を書いた小さなパッケージ。シバン、`chmod +x`、`npm link` を試す | 2 | — |
| [args-demo.mjs](args-demo.mjs) | `util.parseArgs` で引数を解析する。`multiple`・`short`・`default`、エラーのときは終了コード 2 | 3 | — |
| [stdin-demo.mjs](stdin-demo.mjs) | パイプなら全部読む、端末なら `readline/promises` で質問する | 4 | — |
| [color-demo.mjs](color-demo.mjs) | `styleText` と `NO_COLOR`・`FORCE_COLOR`、`hasColors()`・`columns` | 5 | — |
| [exit-demo.mjs](exit-demo.mjs) | `process.exit()` だとパイプへの出力が途中で切れる。`process.exitCode` との比較 | 6 | — |
| [epipe-demo.mjs](epipe-demo.mjs) | `\| head` で出力先が先に閉じたときの EPIPE と、その受け止め方 | 7 | — |
| [signal-demo.mjs](signal-demo.mjs) | `SIGINT`・`SIGTERM` を受け取って片付けてから終わる。2回目はすぐ終わる | 8 | — |
| [config-demo.mjs](config-demo.mjs) | 既定の値 < 設定ファイル（XDG） < 環境変数 < 引数 の優先順位 | 9 | — |
| [cli-test-demo/](cli-test-demo/) | CLI を `spawn` で起動してテストする | 10 | — |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node args-demo.mjs add 牛乳を買う -t 買い物 --due 2026-11-05
$ node exit-demo.mjs exit | wc -c
$ node epipe-demo.mjs crash | head -3
$ node signal-demo.mjs              # Ctrl+C で止める
$ cd cli-test-demo && node --test count.test.mjs
```

- `signal-demo.mjs` と `config-demo.mjs` 以外は、ファイルを作りません。`signal-demo.mjs` は OS の一時フォルダに一時ファイルを1つ作り、終わるときに消します
- `config-demo.mjs` は `~/.config/demo-cli/config.json` を読むだけで、書きません。試すときは `XDG_CONFIG_HOME=/tmp/xdg` のように、別の場所を指してから作ってください
