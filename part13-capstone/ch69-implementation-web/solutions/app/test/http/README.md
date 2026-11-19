# test/http — HTTP のテスト

サーバを別のプロセスで、空いているポートに起動し、HTTP だけで話します。

| ファイル・フォルダ                   | 中身                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| [auth.test.ts](auth.test.ts)         | 登録・確認・ログイン・CSRF・ヘッダ・回数の上限・設定・IdP（13 個） |
| [ops.test.ts](ops.test.ts)           | `/healthz`・`/readyz`・`/version`・`/metrics`・SIGTERM で止まる    |
| [rooms.test.ts](rooms.test.ts)       | 第68章: 会議室の API（管理者だけが作る・変える）                   |
| [bookings.test.ts](bookings.test.ts) | 第68章: 予約の API（決まり・重なり・同時・取り消し）               |
| [realtime.test.ts](realtime.test.ts) | 第69章: SSE の知らせ・管理者の取り消しのメール・リマインド         |
