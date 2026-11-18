// 第61章 練習問題6の模範解答: Dockerfile の点検（問題5の parseDockerfile を使う）
// 使い方: node lint-dockerfile.ts Dockerfile   → 見つけたことを1行ずつ書き、あれば終了コード 1
import { readFile } from 'node:fs/promises';
import { type Instruction, parseDockerfile, parseEnv } from './dockerfile.ts';

export type Problem = { line: number; message: string };
export type { Instruction };

const SECRET_NAME = /SECRET|PASSWORD|TOKEN|KEY/i;

export function lintDockerfile(text: string): Problem[] {
  const instructions = parseDockerfile(text);
  const problems: Problem[] = [];
  const stageNames = new Set<string>(); // FROM … AS 名前 で付けた名前（後の FROM で使ってよい）
  const copiedAll = new Set<number>(); // COPY . … をした段階の番号

  for (const ins of instructions) {
    const { line, keyword, args, stage } = ins;
    if (keyword === 'FROM') {
      const [image = '', as, name] = args.split(' ').filter((s) => !s.startsWith('--'));
      if (as?.toUpperCase() === 'AS' && name !== undefined) stageNames.add(name);
      if (!stageNames.has(image) || image === name) {
        const pinned = image.includes('@sha256:') || (/:[^/]+$/.test(image) && !image.endsWith(':latest'));
        if (!pinned) problems.push({ line, message: 'FROM のイメージに版（タグ）を付けてください' });
      }
    }
    if ((keyword === 'CMD' || keyword === 'ENTRYPOINT') && ins.exec === undefined) {
      problems.push({ line, message: `${keyword} は ["node", "…"] の形（exec の形）で書いてください` });
    }
    if (keyword === 'COPY' && /^(?:--\S+ )*\. /.test(args)) copiedAll.add(stage);
    if (keyword === 'RUN') {
      if (/\bnpm (?:ci|install|i)\b/.test(args) && copiedAll.has(stage)) {
        problems.push({ line, message: 'package.json だけを先にコピーしてから npm ci してください（キャッシュが効きません）' });
      }
      if (/\bnpm (?:install|i)\b/.test(args)) problems.push({ line, message: 'npm install ではなく npm ci を使ってください' });
    }
    if (keyword === 'ENV' || keyword === 'ARG') {
      // ARG は「名前」か「名前=既定の値」。ENV は parseEnv で名前を取り出す
      const names = keyword === 'ARG' ? [args.split('=')[0] ?? ''] : parseEnv(args).map(([n]) => n);
      for (const n of names) {
        if (SECRET_NAME.test(n)) problems.push({ line, message: `秘密の値（${n}）をイメージに入れないでください` });
      }
    }
  }

  // 最後の段階の、最後の USER が root 以外か
  const lastStage = Math.max(0, ...instructions.map((i) => i.stage));
  const users = instructions.filter((i) => i.stage === lastStage && i.keyword === 'USER');
  const lastUser = users.at(-1)?.args;
  if (lastUser === undefined || lastUser === 'root' || lastUser === '0') {
    const from = instructions.find((i) => i.stage === lastStage && i.keyword === 'FROM');
    problems.push({ line: from?.line ?? 1, message: '最後の段階に USER がありません（root で動きます）' });
  }
  // 行の番号の順に並べる（同じ行なら、見つけた順のまま。sort は安定）
  return problems.sort((a, b) => a.line - b.line);
}

if (import.meta.main) {
  const file = process.argv[2] ?? 'Dockerfile';
  const problems = lintDockerfile(await readFile(file, 'utf8'));
  for (const p of problems) console.log(`${file}:${p.line}: ${p.message}`);
  process.exitCode = problems.length > 0 ? 1 : 0;
}
