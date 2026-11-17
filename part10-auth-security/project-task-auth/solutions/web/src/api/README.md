# src/api — 第10部の成果物の完成例（画面）

第8部の画面に、ログインのページを足したものです（第10部で足したものは、表の「第10部」の行）。完成例の全体は [../../README.md](../../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [auth.ts](auth.ts) | 第10部: ログインの API を呼ぶ関数（`getMe` は 401 を `null` にする）、`isUnverified`（確認がまだの 403 か） |
| [client.ts](client.ts) | API を呼ぶ関数。失敗は ApiError、成功はスキーマで確かめる（第43章 1.2節）。第10部: `request`・`jsonInit` を export し、problem の `type` も読む |
| [queries.ts](queries.ts) | TanStack Query のフック（第43章 3〜7節）。一覧は「もっと読む」で続きを足す（useInfiniteQuery）。第10部: `useMe`（ログインしている人。キー `['me']`）と `useLogout`（前の人のタスクをキャッシュから消す） |
| [schemas.ts](schemas.ts) | API の応答の形と、フォームの入力の形（第43章 1.2節・5.1節） |
