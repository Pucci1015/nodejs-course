# test

| ファイル・フォルダ | 中身 |
| --- | --- |
| [actions.test.ts](actions.test.ts) | Server Action のテスト。Next.js の外で、ふつうの関数として呼んで確かめる（第49章 練習問題5 と同じやり方） |
| [components.test.tsx](components.test.tsx) | 画面の部品（Client Component）のテスト。Server Action と next/navigation は偽物にする |
| [fake-api.ts](fake-api.ts) | テストのための、偽のタスク管理 API（第8部の成果物の test/fake-api.ts と同じ）。メモリの上で、第7部の API と同じように答える |
| [pages.test.ts](pages.test.ts) | ページのテスト。偽の API と、このアプリの開発サーバを起動して、ページを HTTP で読んで確かめる |
| [seed.ts](seed.ts) | テストの例のタスク。締め切りは、今日（日本の日付）から数えて決める |
| [servers.ts](servers.ts) | テストで使う道具: 偽の API を HTTP のサーバとして動かす・Next.js の開発サーバを起動する・ページを読む |
