// 第63章 練習問題1の模範解答のコピー: オブジェクトのキーを決める（本文 5.1節）

export type KeyInput = {
  /** 持ち主のユーザーの ID（1 以上の整数） */
  userId: number;
  /** 利用者が付けた名前（拡張子を見るだけ。キーには使わない） */
  fileName: string;
  /** randomUUID() で作った ID */
  id: string;
  /** 今の時刻（年と月をキーに入れる。UTC で） */
  now: Date;
};

/** 受け付ける拡張子 → キーに付ける拡張子 */
const EXTENSIONS: Record<string, string> = {
  '.png': '.png',
  '.jpg': '.jpg',
  '.jpeg': '.jpg',
  '.gif': '.gif',
  '.webp': '.webp',
  '.pdf': '.pdf',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function objectKey(input: KeyInput): string {
  const { userId, fileName, id, now } = input;
  if (!Number.isInteger(userId) || userId < 1) throw new Error(`userId が正しくありません: ${userId}`);
  if (!UUID.test(id)) throw new Error('id が UUID の形ではありません');

  // 最後の . から後ろを拡張子として見る。. が先頭（.png）なら、拡張子ではない
  const dot = fileName.lastIndexOf('.');
  const raw = dot > 0 ? fileName.slice(dot).toLowerCase() : '';
  const ext = Object.hasOwn(EXTENSIONS, raw) ? EXTENSIONS[raw] : '';

  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0'); // getUTCMonth は 0 から
  return `users/${userId}/${yyyy}/${mm}/${id}${ext}`;
}
