// 第66章 5節: node --cpu-prof が書いた .cpuprofile を読み、時間を使った関数の上位を出す（中身は読まなくてよい）
// 動かし方（章のフォルダで）: node samples/cpu-top.ts prof/CPU.….cpuprofile
// Chrome の DevTools の Performance パネルに読み込んでも、同じものを図で見られる
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const Profile = z.object({
  nodes: z.array(
    z.object({
      id: z.number(),
      callFrame: z.object({ functionName: z.string(), url: z.string(), lineNumber: z.number() }),
    }),
  ),
  samples: z.array(z.number()),
  timeDeltas: z.array(z.number()),
});

const file = process.argv[2];
if (!file) {
  console.error('使い方: node samples/cpu-top.ts ファイル.cpuprofile');
  process.exit(2);
}
const profile = Profile.parse(JSON.parse(await fs.readFile(file, 'utf8')));

// 1 回の「見本」（サンプル）ごとに、そのとき動いていた関数に、次の見本までの時間を足す（自分の時間、self time）
const byNode = new Map(profile.nodes.map((n) => [n.id, n]));
const selfMs = new Map<string, number>();
let total = 0;
profile.samples.forEach((id, i) => {
  const ms = (profile.timeDeltas[i + 1] ?? 0) / 1000;
  const f = byNode.get(id)?.callFrame;
  if (!f) return;
  const name = `${f.functionName || '(無名)'} ${f.url ? `${path.basename(f.url)}:${f.lineNumber + 1}` : ''}`.trim();
  selfMs.set(name, (selfMs.get(name) ?? 0) + ms);
  total += ms;
});

console.log(`合わせて ${total.toFixed(0)}ms`);
for (const [name, ms] of [...selfMs].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`${ms.toFixed(0).padStart(7)}ms ${((ms / total) * 100).toFixed(1).padStart(5)}%  ${name}`);
}
