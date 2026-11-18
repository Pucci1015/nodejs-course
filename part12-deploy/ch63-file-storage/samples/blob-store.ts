// 第63章 7節: ファイルの置き場所の「形」。アプリは S3 を直接使わず、この形だけを使う
// 本番は S3（s3-blob-store.ts）、テストはメモリの偽物（練習問題6）に取り替えられる

export type BlobInfo = { key: string; size: number; contentType: string };

export interface BlobStore {
  /** 置く（同じキーなら上書き） */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** 取り出す。無ければ undefined */
  get(key: string): Promise<{ body: Buffer; contentType: string } | undefined>;
  /** 大きさと種類だけ。無ければ undefined */
  head(key: string): Promise<BlobInfo | undefined>;
  /** 消す。無くても失敗にしない */
  delete(key: string): Promise<void>;
  /** prefix で始まるものを、キーの順に全部（一覧には種類が入らないので、キーと大きさだけ） */
  list(prefix: string): Promise<{ key: string; size: number }[]>;
}
