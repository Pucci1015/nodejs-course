# 第70章 サンプル

本文の「手を動かす」で書く小さなスクリプトの完成形です。うまく動かないときに見比べてください。どれも部のフォルダ（`~/dev/part13/ch70-release-retro/`）で、部の `node_modules` の `yaml` と `zod` を使って動かします。

| ファイル                       | 本文の節 | 動かし方                                                                |
| ------------------------------ | -------- | ----------------------------------------------------------------------- |
| [show-jobs.ts](show-jobs.ts)   | 4.2      | `node samples/show-jobs.ts ~/dev/room-booking/.github/workflows/ci.yml` |
| [show-env.ts](show-env.ts)     | 5.1      | `node samples/show-env.ts ~/dev/room-booking/render.yaml`               |
| [list-links.ts](list-links.ts) | 7.2      | `node samples/list-links.ts ~/dev/room-booking`                         |
| [tsconfig.json](tsconfig.json) | —        | 型を確かめる設定（`npx tsc -p samples`）                                |

この章を終えたときのアプリ（Dockerfile・compose.prod.yaml・CI・render.yaml・運用の手順・README・振り返り）は、成果物の [../../project-room-booking/solutions/](../../project-room-booking/solutions/) にあります。
