// 第63章 5.2節: ファイルの種類を、名前や Content-Type ではなく、先頭のバイト（マジックナンバー）で決める
// 第4部 第20章の detectImageType と同じ考え方

const SIGNATURES: { type: string; bytes: number[] }[] = [
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // \x89PNG\r\n\x1a\n
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
];

/** 知っている種類なら MIME タイプ、知らなければ undefined */
export function sniff(data: Buffer): string | undefined {
  for (const { type, bytes } of SIGNATURES) {
    if (data.length >= bytes.length && bytes.every((b, i) => data[i] === b)) return type;
  }
  return undefined;
}
