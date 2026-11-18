// 第61章 練習問題5の模範解答: Dockerfile を読む（命令に分ける）

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

const EXEC_KEYWORDS = new Set(['RUN', 'CMD', 'ENTRYPOINT']);

/** JSON の文字列の配列として読めれば、その配列。読めなければ undefined */
function execForm(args: string): string[] | undefined {
  if (!args.startsWith('[')) return undefined;
  try {
    const v: unknown = JSON.parse(args);
    return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : undefined;
  } catch {
    return undefined;
  }
}

export function parseDockerfile(text: string): Instruction[] {
  const result: Instruction[] = [];
  const lines = text.split(/\r?\n/);
  let stage = -1;
  let current: { line: number; parts: string[] } | undefined;

  const finish = () => {
    if (current === undefined) return;
    const joined = current.parts.join(' ').replace(/\s+/g, ' ').trim();
    const m = /^(\S+)\s*(.*)$/.exec(joined);
    const keyword = (m?.[1] ?? '').toUpperCase();
    const args = m?.[2] ?? '';
    if (keyword === 'FROM') stage += 1;
    const instruction: Instruction = { line: current.line, keyword, args, stage: Math.max(stage, 0) };
    const exec = EXEC_KEYWORDS.has(keyword) ? execForm(args) : undefined;
    if (exec !== undefined) instruction.exec = exec;
    result.push(instruction);
    current = undefined;
  };

  for (const [i, raw] of lines.entries()) {
    const trimmed = raw.trim();
    // コメントの行と空の行は、命令の途中でも捨てる
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const continues = trimmed.endsWith('\\');
    const body = continues ? trimmed.slice(0, -1) : trimmed;
    if (current === undefined) current = { line: i + 1, parts: [] };
    current.parts.push(body);
    if (!continues) finish();
  }
  finish(); // 最後の行が \ で終わっていたとき
  return result;
}

export function parseEnv(args: string): [string, string][] {
  // 古い形: 最初の空白までに = が無ければ「名前 値（残り全部）」
  const firstWord = /^\S+/.exec(args)?.[0] ?? '';
  if (!firstWord.includes('=')) {
    const rest = args.slice(firstWord.length).trim();
    return [[firstWord, rest]];
  }
  const pairs: [string, string][] = [];
  // 名前=値 か 名前="…" を、左から順に取り出す
  const re = /([A-Za-z_][A-Za-z0-9_]*)=(?:"((?:[^"\\]|\\.)*)"|(\S*))/g;
  for (const m of args.matchAll(re)) {
    pairs.push([m[1] ?? '', m[2] !== undefined ? m[2].replace(/\\(.)/g, '$1') : (m[3] ?? '')]);
  }
  return pairs;
}
