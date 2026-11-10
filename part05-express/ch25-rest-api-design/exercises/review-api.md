# 練習問題4: レビューする API の設計書（わざと問題を入れてあります）

ある人が書いた「タスク管理 API」の設計書です。問題4では、この設計の問題点を見つけて、直した設計を書きます。

## 共通

- すべてのレスポンスは `200 OK` で返し、成功したかどうかは本文の `success` で知らせる

```json
{ "success": false, "error": "タスクが見つかりません" }
```

- 日付は `"2026/11/5 9:00"` の形（日本時間）

## エンドポイント

| # | メソッドと URL | 内容 |
| --- | --- | --- |
| 1 | `GET /getTasks?page=2` | タスクの一覧。1ページ 50 件で、`page` で選ぶ |
| 2 | `GET /getTask?id=3` | タスクを1件 |
| 3 | `POST /createTask` | タスクを作る。ボディは `{ "title": "…", "id": 10 }`（id は作る側が決める） |
| 4 | `POST /updateTask` | タスクを変える。ボディは `{ "id": 3, "title": "…", "done": "yes" }`。送らなかった項目は空にする |
| 5 | `GET /deleteTask?id=3` | タスクを消す |
| 6 | `POST /tasks/3/complete` | タスクを完了にする |
| 7 | `GET /tasks/search?keyword=牛乳&sort=title desc` | 題名で探す。`sort` には SQL の `ORDER BY` に入れる文字をそのまま書く |
| 8 | `GET /users/5/projects/2/tasks/3/comments/7` | タスクのコメントを1件 |

## 例

```sh
$ curl 'https://api.example.com/deleteTask?id=3'
{"success":true}
$ curl 'https://api.example.com/getTask?id=3'
{"success":false,"error":"java.lang.NullPointerException at TaskService.find(TaskService.java:42)"}
```
