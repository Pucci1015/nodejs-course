// 第63章 練習問題8: どこからも使われていないオブジェクト（孤児）を掃除する（本文 8節）
import { DeleteObjectCommand, ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3';

export type SweepOptions = {
  s3: S3Client;
  bucket: string;
  /** このキーで始まるものだけを見る */
  prefix: string;
  /** データベースが知っているキーか（使われているか）。キーごとに呼ぶ */
  isReferenced: (key: string) => Promise<boolean>;
  /** 置かれてからこの時間（ミリ秒）たっていないものは、消さない（アップロードの途中かもしれない） */
  graceMs: number;
  /** 今の時刻 */
  now: Date;
  /** true なら、消さずに「消すもの」を数えるだけ */
  dryRun: boolean;
  /** 一覧を1回に何件ずつ頼むか（テスト用。既定はストレージに任せる） */
  pageSize?: number;
};

export type SweepResult = {
  /** 消した（dryRun なら、消すはずの）キー。見つけた順 */
  deleted: string[];
  /** 見たオブジェクトの数 */
  scanned: number;
};

export async function sweepOrphans(options: SweepOptions): Promise<SweepResult> {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof options} ${typeof DeleteObjectCommand} ${typeof ListObjectsV2Command}）`);
}
