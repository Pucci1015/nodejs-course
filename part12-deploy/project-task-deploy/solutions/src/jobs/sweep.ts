// 追加（第12部）: どこからも使われていないファイル（孤児）を消す（第63章 練習問題8の sweep-orphans.ts を、BlobStore で書き直した）
// タスクを消すと、添付の行は ON DELETE CASCADE で消えるが、ストレージの中身は残る。それを、この仕事が後で消す
import type { BlobStore } from '../storage/blob-store.ts';

export type SweepOptions = {
  blobs: BlobStore;
  prefix: string;
  /** データベースが知っているキーか */
  isReferenced: (key: string) => Promise<boolean>;
  /** 置かれてからこの時間たっていないものは、消さない（置いてから行を入れるまでの間かもしれない） */
  graceMs: number;
  now: Date;
};

export async function sweepOrphans(o: SweepOptions): Promise<{ deleted: string[]; scanned: number }> {
  const deleted: string[] = [];
  const all = await o.blobs.list(o.prefix);
  for (const b of all) {
    if (o.now.getTime() - b.lastModified.getTime() < o.graceMs) continue;
    if (await o.isReferenced(b.key)) continue;
    await o.blobs.delete(b.key);
    deleted.push(b.key);
  }
  return { deleted, scanned: all.length };
}
