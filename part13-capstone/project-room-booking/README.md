# 第13部の成果物 会議室の予約

第13部の4つの章（第67〜70章）で育てた、会議室の予約のアプリの完成形です。社内の会議室を Web の画面から予約し、ほかの人の予約は読み直さずに表に出て、前の日の夕方には翌日の予約をメールで知らせます。

ほかの部の成果物と違い、この部では**章の本文そのものが、成果物を作る手順**です。章を順に進めると、`~/dev/room-booking` がこのフォルダと同じものになります。このフォルダは、最後に見比べるため、そして自分のアプリを作るときの見本として使います。

| 項目     | 内容                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 作り方   | 第67章（要件と設計）→ 第68章（API）→ 第69章（画面・リアルタイム・メール）→ 第70章（公開と振り返り）。章ごとに1つのコミット                                   |
| 確かめ方 | `npm run check`（API 90 個）・`web/` の `npm run check`（24 個）・`npm run e2e`（2 個）が通り、`docker compose -f compose.prod.yaml up` で本番と同じ形が動く |
| 資料     | 要件・画面・API・データの設計、ADR、作る順番、運用の手順、振り返り（[solutions/docs/](solutions/docs/)）                                                     |

| フォルダ                 | 中身                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| [solutions/](solutions/) | 完成形。第70章を終えたときの `~/dev/room-booking`（中身と動かし方は [solutions/README.md](solutions/README.md)） |

## 章ごとのアプリとの関係

| 章の終わり | フォルダ                                                                                 | テスト                 |
| ---------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| 土台       | [../base/](../base/)                                                                     | API 25・画面 14・E2E 1 |
| 第67章     | [../ch67-requirements-design/solutions/app/](../ch67-requirements-design/solutions/app/) | API 57・画面 14・E2E 1 |
| 第68章     | [../ch68-implementation-api/solutions/app/](../ch68-implementation-api/solutions/app/)   | API 82・画面 14・E2E 1 |
| 第69章     | [../ch69-implementation-web/solutions/app/](../ch69-implementation-web/solutions/app/)   | API 90・画面 24・E2E 2 |
| 第70章     | [solutions/](solutions/)                                                                 | API 90・画面 24・E2E 2 |

どれも、前の行のフォルダに、その章で書いたものを足しただけです。2つのフォルダを比べると、その章で何を足したかが分かります（`~/dev/part13` で `diff -r ch68-implementation-api/solutions/app ch69-implementation-web/solutions/app` のように比べられます。`-r` は、下のフォルダまで比べるオプションです）。

## 動かすとき

教材のフォルダでは動かさず、`~/dev` にコピーしてから動かします（教材のフォルダは見本として残すため）。

```sh
$ cp -R ~/dev/part13/project-room-booking/solutions ~/dev/room-booking-final
$ cd ~/dev/room-booking-final
$ docker compose up -d --wait      # PostgreSQL（5434）と Redis（6381）。~/dev/room-booking と同じものを使う
$ npm ci && npm run check
$ (cd web && npm ci && npm run check)
```

`~/dev/room-booking` と `room-booking-final` は、同じ PostgreSQL のデータベース（`roombooking`）を使います。テストはテストごとのスキーマを作って消すのでぶつかりませんが、開発のサーバ（`npm run dev`）を両方で動かすと、データを分け合います。

## 自分のアプリを作るとき

第70章 9節に、この部の進め方を自分の題材でなぞるための表があります。題材を決めたら、[../base/](../base/) を新しいフォルダにコピーし、第67章から同じ順に進めてください。題材は小さく（表が 2〜3 個、画面が 3〜4 枚、決まりが 5〜10 個）決めるのがこつです。

---

第13部の目次: [../README.md](../README.md) ／ 前: [第70章 公開と振り返り](../ch70-release-retro/README.md)
