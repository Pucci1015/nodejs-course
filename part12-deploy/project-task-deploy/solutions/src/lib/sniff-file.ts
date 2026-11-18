// 第63章 練習問題3の模範解答のコピー: ファイルの種類を先頭のバイトで決める（本文 5.2節の sniff を広げる）

export type FileKind = { type: string; ext: string };

/** offset バイト目から、bytes（文字列は 1 文字 = 1 バイト）と同じか */
function startsAt(data: Buffer, offset: number, bytes: string | number[]): boolean {
  const want = typeof bytes === 'string' ? Buffer.from(bytes, 'latin1') : Buffer.from(bytes);
  if (data.length < offset + want.length) return false;
  return want.every((v, i) => data[offset + i] === v);
}

/** 当てはまる印を全部持つ種類を返す。上から順に試す */
const KINDS: { kind: FileKind; marks: [number, string | number[]][] }[] = [
  { kind: { type: 'image/png', ext: '.png' }, marks: [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]] },
  { kind: { type: 'image/jpeg', ext: '.jpg' }, marks: [[0, [0xff, 0xd8, 0xff]]] },
  { kind: { type: 'image/gif', ext: '.gif' }, marks: [[0, 'GIF87a']] },
  { kind: { type: 'image/gif', ext: '.gif' }, marks: [[0, 'GIF89a']] },
  {
    kind: { type: 'image/webp', ext: '.webp' },
    marks: [
      [0, 'RIFF'],
      [8, 'WEBP'],
    ],
  },
  { kind: { type: 'application/pdf', ext: '.pdf' }, marks: [[0, '%PDF-']] },
];

export function sniffFile(data: Buffer): FileKind | undefined {
  for (const { kind, marks } of KINDS) {
    if (marks.every(([offset, bytes]) => startsAt(data, offset, bytes))) return { ...kind };
  }
  return undefined;
}
