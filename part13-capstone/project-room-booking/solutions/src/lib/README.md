# src/lib — 部品

Express にも HTTP にも頼らない部品です。

| ファイル・フォルダ             | 中身                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| [metrics.ts](metrics.ts)       | Prometheus の形の数（counter・gauge・histogram）と、数えるミドルウェア（第66章 3節） |
| [event-hub.ts](event-hub.ts)   | 第69章: SSE のハブ（第27章）。`sseRoute` で、つないでいる全員に配る                  |
| [event-bus.ts](event-bus.ts)   | 第69章: Redis の Pub/Sub で、全部の台のハブに知らせを流す（第66章 7節）              |
| [sse-format.ts](sse-format.ts) | 第69章: SSE の1つのイベントを文字にする（第27章 5節）                                |
