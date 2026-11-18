// 第63章 練習問題3: ファイルの種類を先頭のバイトで決める（本文 5.2節の sniff を広げる）

export type FileKind = { type: string; ext: string };

export function sniffFile(data: Buffer): FileKind | undefined {
  // ここを書く
  throw new Error(`まだ書いていません（${data.length} バイト）`);
}
