# web/src/api — API とつなぐ

| ファイル・フォルダ       | 中身                                                        |
| ------------------------ | ----------------------------------------------------------- |
| [client.ts](client.ts)   | `request`（失敗は `ApiError`）・`jsonInit`・`toFieldErrors` |
| [auth.ts](auth.ts)       | ログイン・登録などの API を呼ぶ関数と `getMe`               |
| [schemas.ts](schemas.ts) | API の応答の形（Zod）                                       |
| [queries.ts](queries.ts) | TanStack Query のフック（`useMe`・`useLogout`）             |
