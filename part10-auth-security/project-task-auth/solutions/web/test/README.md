# test — 第10部の成果物の完成例（画面）

第8部の画面に、ログインのページを足したものです（第10部で足したものは、表の「第10部」の行）。完成例の全体は [../README.md](../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [app.test.tsx](app.test.tsx) | 画面全体のテスト（19 個）。偽の API を fetch の代わりに置き、ボタンや入力欄を画面に出ている名前で探して操作する。第10部: キャッシュを `createQueryClient` で作り、メニューを待つようにした（偽の API は、最初から alice としてログインしている） |
| [auth.test.tsx](auth.test.tsx) | 第10部: ログイン・ログアウト・セッション切れ・登録・確認・再設定のページのテスト（15 個） |
| [fake-api.ts](fake-api.ts) | テストのための、偽のタスク管理 API。fetch の代わりに使い、メモリの上で第7部の API と同じように答える。第10部: `/api/auth/…` に答え、ログインしていなければ `/api/tasks` と `/api/events` を 401 にする。`createFakeApi(seed, { loggedIn })`・`expireSession()` |
