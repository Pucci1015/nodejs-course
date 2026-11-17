// 第53章 練習問題3: SMTP の応答（1行・複数行）を読む（本文2節）

export type ReplyKind = 'ok' | 'intermediate' | 'temporary' | 'permanent';
export type Reply = { code: number; kind: ReplyKind; lines: string[] };

export function parseReply(text: string): Reply | null {
  // ここを書く
  throw new Error(`まだ書いていません: ${text}`);
}
