// 第64章 5.4節: 列から取り出したデータを、Zod で確かめる
// 動かし方（章のフォルダで）: node samples/job-data.ts
import { z } from 'zod';

// name の値で、どの形かを見分けるユニオン
const JobData = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('welcome'), to: z.email() }),
  z.strictObject({ name: z.literal('cleanup'), olderThanDays: z.number().int().min(1) }),
]);

const inputs: unknown[] = [
  { name: 'welcome', to: 'alice@example.com' },
  { name: 'welcome', to: 'alice' },
  { name: 'cleanup', olderThanDays: 30, dryRun: true },
  { name: 'unknown' },
];
for (const input of inputs) {
  const r = JobData.safeParse(input);
  if (r.success) {
    console.log('OK  ', r.data);
  } else {
    const issue = r.error.issues[0];
    console.log('だめ', issue?.path.join('.') || '(全体)', issue?.code, issue?.message);
  }
}
