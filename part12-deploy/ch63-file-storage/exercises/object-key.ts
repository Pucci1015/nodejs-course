// 第63章 練習問題1: オブジェクトのキーを決める（本文 5.1節）

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

export function objectKey(input: KeyInput): string {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof input}）`);
}
