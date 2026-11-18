// 第53章 練習問題3 の模範解答: SMTP の応答（1行・複数行）を読む（本文2節）

export type ReplyKind = 'ok' | 'intermediate' | 'temporary' | 'permanent';
export type Reply = { code: number; kind: ReplyKind; lines: string[] };

const KINDS: Record<string, ReplyKind> = { '2': 'ok', '3': 'intermediate', '4': 'temporary', '5': 'permanent' };

export function parseReply(text: string): Reply | null {
  const rows = text.split('\r\n');
  if (rows.at(-1) === '') rows.pop();
  if (rows.length === 0) return null;
  let code: string | null = null;
  const lines: string[] = [];
  for (const [i, row] of rows.entries()) {
    // 「3桁の数字」「- か 空白（最後の行だけ空白）」「文」。文が無い「250」だけの行も許す
    const m = /^([2-5][0-9]{2})(?:([- ])(.*))?$/.exec(row);
    if (m === null) return null;
    const [, rowCode = '', sep = ' ', rest = ''] = m;
    if (code !== null && rowCode !== code) return null; // 途中で番号が変わったらおかしい
    code = rowCode;
    const last = i === rows.length - 1;
    if ((sep === '-') === last) return null; // 最後の行だけが空白、それ以外は -
    lines.push(rest);
  }
  if (code === null) return null;
  const kind = KINDS[code[0] ?? ''];
  if (kind === undefined) return null;
  return { code: Number(code), kind, lines };
}
