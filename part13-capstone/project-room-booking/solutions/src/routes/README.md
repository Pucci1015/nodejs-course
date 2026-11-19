# src/routes — ルートの層

HTTP を読み（Zod で確かめ）、サービスを呼び、応答の形にします。

| ファイル・フォルダ               | 中身                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| [auth.ts](auth.ts)               | `/api/auth/…`（登録・確認・ログイン・ログアウト・再設定・IdP）。第68章: `/me` に `role` を足した |
| [ops.ts](ops.ts)                 | `/healthz`・`/readyz`・`/version`・`/metrics`                                                    |
| [static-site.ts](static-site.ts) | ビルドした画面を配る（`STATIC_DIR`。第65章 6節）                                                 |
| [rooms.ts](rooms.ts)             | 第68章: `/api/rooms`（一覧・作る・変える）                                                       |
| [bookings.ts](bookings.ts)       | 第68章: `/api/bookings`（その日の一覧・自分の予約・予約する・取り消す）                          |
