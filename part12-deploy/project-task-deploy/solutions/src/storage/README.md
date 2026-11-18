# src/storage — ファイルの置き場所（第12部）

アプリは S3 を直接使わず、`BlobStore` の形だけを使います（第63章 7節）。テストでは、メモリの偽物（`test/support/memory-blob-store.ts`）に取り替えられます。偽物と S3 版が同じように動くことは、`test/contract/blob-store.test.ts` で確かめています。

| ファイル                             | 中身                                                                                                                                                                                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [blob-store.ts](blob-store.ts)       | 形（`interface BlobStore`）: `put`・`delete`・`list(prefix)`（置いた時刻つき）・`signedGetUrl(key, { expiresIn, contentDisposition })`・`check()`（`/readyz` 用）                                                                                                           |
| [s3-blob-store.ts](s3-blob-store.ts) | `createS3BlobStore(options)`。AWS SDK v3 で作る。鍵はいつも明示して渡す。署名付き URL は、**ブラウザが使う入口（`S3_PUBLIC_ENDPOINT`）の名前で**作る（署名に Host が入るので、コンテナの中の名前 `s3:9800` で作ると、ブラウザからは 403 になる）。`check()` は `HeadBucket` |
