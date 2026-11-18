// 追加（第12部）: ファイルの置き場所の形（第63章 7節の blob-store.ts から、成果物で使うものだけにして、署名付き URL を足した）
// アプリは S3 を直接使わず、この形だけを使う。本番と開発は S3（s3-blob-store.ts）、テストの一部はメモリの偽物

export type StoredBlob = { key: string; size: number; lastModified: Date };

export type SignedUrlOptions = {
  /** 使える秒数 */
  expiresIn: number;
  /** ブラウザに返させる Content-Disposition（ダウンロードの名前） */
  contentDisposition: string;
};

export interface BlobStore {
  /** 置く（同じキーなら上書き） */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** 消す。無くても失敗にしない */
  delete(key: string): Promise<void>;
  /** prefix で始まるものを、全部（孤児の掃除に使う） */
  list(prefix: string): Promise<StoredBlob[]>;
  /** 取り出すための署名付き URL（ブラウザが、アプリを通らずに直接取りに行く。第63章 4節） */
  signedGetUrl(key: string, options: SignedUrlOptions): Promise<string>;
  /** つながるか（/readyz で使う）。つながらなければ例外 */
  check(): Promise<void>;
}
