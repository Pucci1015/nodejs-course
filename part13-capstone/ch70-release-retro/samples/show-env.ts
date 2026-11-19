// 第70章 5.1節: render.yaml を読んで、サービスごとの環境変数の書き方を並べる
// 使い方: node show-env.ts ~/dev/room-booking/render.yaml
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';

// 使うところだけの形。envVars の1つ1つの形はいろいろなので、ここでは確かめない（unknown のまま）
const Blueprint = z.object({
  services: z.array(z.object({ type: z.string(), name: z.string(), envVars: z.array(z.unknown()).default([]) })),
});

const file = process.argv[2] ?? 'render.yaml';
const { services } = Blueprint.parse(parse(await readFile(file, 'utf8')));
for (const s of services) {
  console.log(`${s.name}（${s.type}）`);
  for (const v of s.envVars) console.log(`  ${JSON.stringify(v)}`);
}
