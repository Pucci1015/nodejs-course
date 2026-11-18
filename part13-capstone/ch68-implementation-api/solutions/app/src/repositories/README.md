# src/repositories — データの層

SQL を書くのは、このフォルダだけです。表の行（snake_case）を、API の形（camelCase）に直して返します。

| ファイル・フォルダ               | 中身                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [pg-users.ts](pg-users.ts)       | ユーザー・IdP の結びつき・メールのトークン。第68章: `role` を足した                                                           |
| [pg-rooms.ts](pg-rooms.ts)       | 第68章: 会議室（`list`・`get`・`insert`・`update`）。名前の重なり（23505）は `ConflictError`                                  |
| [pg-bookings.ts](pg-bookings.ts) | 第68章: 予約（`listOnDay`・`listUpcomingOf`・`countUpcomingOf`・`insert`・`cancel`）。時間の重なり（23P01）は `ConflictError` |
