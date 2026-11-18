# データの設計

```
users（土台）          rooms                     bookings
──────────           ──────────                ─────────────────
id        PK          id        PK               id          PK
email                 name      一意             room_id     → rooms.id
password_hash         capacity  1〜100           user_id     → users.id
email_verified_at     active                     title       1〜100 文字
role  ← 第68章で足す  created_at                 starts_at   timestamptz
created_at                                       ends_at     timestamptz
                                                 canceled_at  NULL なら有効
                                                 canceled_by  → users.id
                                                 created_at
reminder_log ← 第69章で足す（user_id, day。1人1日1通）
```

## 決めたこと

| 決めたこと                                                                                                        | 理由                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 時刻は `timestamptz` で、始まりと終わりの2つの列                                                                  | 30 分の枠の番号（`slot = 4`）で持つと、区切りを変えたときに全部が壊れる。瞬間で持てば、区切りは決まり（コード）の側だけ                                                |
| 重なりは `EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (canceled_at IS NULL)` | 「重なっていないか SELECT で確かめてから INSERT」では、2人が同時に確かめて、2人とも入れてしまう（第30章 6節）。制約なら、データベースが1つずつ確かめる。破ると `23P01` |
| `btree_gist` を `public` に入れる                                                                                 | `room_id WITH =`（integer の等しい）を GiST の索引で使うため。テストのスキーマに入ると、スキーマを消したときに一緒に消える                                             |
| 取り消しは `canceled_at` を入れる（行を消さない）                                                                 | だれがいつ取り消したかを残す。重なりの制約は `WHERE` で取り消したものを除く                                                                                            |
| 会議室は消さず `active`                                                                                           | 過去の予約が会議室を指している（外部キー）                                                                                                                             |
| 役割は `users.role`（`'member'`・`'admin'` の CHECK）                                                             | 役割は2つだけ。表を分ける（roles・user_roles）ほどではない                                                                                                             |
| 「1人 10 件まで」は制約にしない                                                                                   | 数の上限は制約で書きにくい。サービスで数える（同時に2件入れると 11 件になりうるが、困らない。要件で許した）                                                            |

## 索引

| 索引                                        | 使う所                                         |
| ------------------------------------------- | ---------------------------------------------- |
| `rooms_name`（一意）                        | 名前の重なり                                   |
| `bookings_no_overlap`（GiST）               | 重なりの制約。その日の予約を探すときにも使える |
| `bookings_user_starts (user_id, starts_at)` | 自分のこれからの予約                           |
