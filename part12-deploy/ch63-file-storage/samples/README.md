# 第63章 サンプル

本文の「手を動かす」で書くプログラムの完成形です。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part12/ch63-file-storage`）で `node samples/○○.ts` と打ちます。先に、別のターミナルの `~/dev/part12` で `npm run s3`（練習用の S3、127.0.0.1:9800）を動かしておきます（`s3-blob-store.test.ts` だけは、テストの中で起動するので要りません）。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [s3-client.ts](s3-client.ts) | 3.1 | | S3 のクライアントを作る（`endpoint`・鍵・`forcePathStyle`・チェックサムの設定）。ほかのサンプルが import する |
| [s3-try.ts](s3-try.ts) | 3.2 | | 置く・取り出す・一覧・消す |
| [stream-upload.ts](stream-upload.ts) | 3.3 | | ファイルをストリームのまま置く。`CHECKSUM=default` で SDK の既定の送り方（mini-s3 では 501） |
| [sign-by-hand.ts](sign-by-hand.ts) | 4.2 | | 署名付き URL（GET）を `node:crypto` だけで作る |
| [presign.ts](presign.ts) | 4.3 | | SDK の `getSignedUrl` で、GET と PUT の署名付き URL を作る |
| [sniff.ts](sniff.ts) | 5.2 | | 先頭のバイトで PNG・JPEG・GIF を見分ける |
| [upload-server.ts](upload-server.ts) | 5.2・6.2 | 9837 | 受け取って確かめて置く（5MB まで）、署名付き URL へ 302、消す |
| [blob-store.ts](blob-store.ts) | 7.1 | | ファイルの置き場所の形 `BlobStore` |
| [s3-blob-store.ts](s3-blob-store.ts) | 7.1 | | `BlobStore` を S3 で（一覧の続きを `ContinuationToken` で） |
| [blob-contract.ts](blob-contract.ts) | 7.2 | | `BlobStore` の契約テスト（7つ） |
| [s3-blob-store.test.ts](s3-blob-store.test.ts) | 7.2 | 空き | mini-s3 をテストの中で起動し、S3 の `BlobStore` に契約テストを当てる |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |
