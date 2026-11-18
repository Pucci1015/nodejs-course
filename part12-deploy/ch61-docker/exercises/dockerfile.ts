// 第61章 練習問題5: Dockerfile を読む（命令に分ける）

export type Instruction = {
  /** 命令が始まる行の番号（1 から） */
  line: number;
  /** 命令の名前（大文字にそろえる。from → FROM） */
  keyword: string;
  /** 命令の後ろの文字列（続きの行をつなぎ、空白を1つにまとめたもの） */
  args: string;
  /** 何番目の段階か（最初の FROM から 0、次の FROM で 1、…） */
  stage: number;
  /** RUN・CMD・ENTRYPOINT が ["…", "…"] の形（exec の形）なら、その配列 */
  exec?: string[];
};

export function parseDockerfile(text: string): Instruction[] {
  // ここを書く
  throw new Error(`まだ書いていません: ${text.length}`);
}

export function parseEnv(args: string): [string, string][] {
  // ここを書く
  throw new Error(`まだ書いていません: ${args}`);
}
