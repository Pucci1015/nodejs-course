# src/routes — ルートの層

HTTP を読み（Zod で確かめ）、サービスを呼び、応答の形にします。

| ファイル・フォルダ               | 中身                                                           |
| -------------------------------- | -------------------------------------------------------------- |
| [auth.ts](auth.ts)               | `/api/auth/…`（登録・確認・ログイン・ログアウト・再設定・IdP） |
| [ops.ts](ops.ts)                 | `/healthz`・`/readyz`・`/version`・`/metrics`                  |
| [static-site.ts](static-site.ts) | ビルドした画面を配る（`STATIC_DIR`。第65章 6節）               |
