// 第70章 4.2節: ワークフローの YAML を読んで、ジョブと「何を待つか」を並べる
// 使い方: node show-jobs.ts ~/dev/room-booking/.github/workflows/ci.yml
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { z } from 'zod';

// 使うところだけの形。needs は1つなら文字、複数なら配列
const Workflow = z.object({
  jobs: z.record(
    z.string(),
    z.object({ needs: z.union([z.string(), z.array(z.string())]).optional(), steps: z.array(z.unknown()) }),
  ),
});

const file = process.argv[2] ?? '.github/workflows/ci.yml';
const { jobs } = Workflow.parse(parse(await readFile(file, 'utf8')));
for (const [name, job] of Object.entries(jobs)) {
  const needs = typeof job.needs === 'string' ? [job.needs] : (job.needs ?? []);
  console.log(`${name}: 手順 ${job.steps.length} 個、待つもの [${needs.join(', ')}]`);
}
