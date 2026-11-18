# files/migrations/ — アプリのマイグレーションのコピー

練習問題8のテストが、「どれも足すだけ（問題なし）」になることを確かめるために読みます。元は `~/dev/room-booking/migrations/`（完成形は [../../../../project-room-booking/solutions/migrations/](../../../../project-room-booking/solutions/migrations/)）です。

| ファイル                                         | 中身                                                 |
| ------------------------------------------------ | ---------------------------------------------------- |
| [001_create_users.sql](001_create_users.sql)     | ユーザー・外のログイン・メールのトークン・セッション |
| [002_rooms_bookings.sql](002_rooms_bookings.sql) | 会議室と予約（EXCLUDE 制約）                         |
| [003_roles.sql](003_roles.sql)                   | ユーザーの役割（`NOT NULL DEFAULT 'member'`）        |
| [004_reminder_log.sql](004_reminder_log.sql)     | リマインドを送った記録                               |
