// zod で入力を確かめる（第25章 5節）
//   $ node zod-demo.mjs
import { z } from 'zod';

z.config(z.locales.ja()); // 既定の文を日本語にする（自分で書いた文は、そのまま）

// 1. ボディの形（知らない項目は断る strictObject）
const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100, 'title は100文字以内にしてください'),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  dueDate: z.iso.date().optional(), // 'YYYY-MM-DD'
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
});

console.log('--- 1. 正しい入力: 前後の空白を取り、足りないものに既定の値を入れた「新しい値」が返る');
console.log(CreateTask.parse({ title: '  牛乳を買う ' }));

console.log('\n--- 2. 間違った入力: safeParse は投げずに、すべての問題をまとめて返す');
const bad = CreateTask.safeParse({ title: '   ', status: 'later', dueDate: '2026-13-01', tags: ['a', ''], owner: 'x' });
for (const issue of bad.error.issues) console.log(`  [${issue.path.join('.') || '(全体)'}] ${issue.code}: ${issue.message}`);

console.log('\n--- 3. クエリは文字列で届く。z.coerce.number() は Number() と同じに変えるので、思わない値も通る');
const Limit = z.coerce.number().int().min(1).max(100);
for (const v of ['20', ' 20 ', '2e1', '', '0x14', 'abc', ['1', '2']]) {
  const r = Limit.safeParse(v);
  console.log(`  ${JSON.stringify(v).padEnd(12)} → ${r.success ? r.data : `失敗（${r.error.issues[0].message}）`}`);
}

console.log('\n--- 4. 文字列の形を決めてから、数に変えるほうが確か');
const StrictLimit = z
  .string()
  .regex(/^[1-9][0-9]{0,2}$/, '1〜100 の整数で指定してください')
  .transform(Number)
  .pipe(z.number().max(100, '1〜100 の整数で指定してください'));
for (const v of ['20', ' 20 ', '2e1', '', '100', '101']) {
  const r = StrictLimit.safeParse(v);
  console.log(`  ${JSON.stringify(v).padEnd(12)} → ${r.success ? r.data : `失敗（${r.error.issues[0].message}）`}`);
}

console.log('\n--- 5. 型を取り出す（第7部の TypeScript で使う）: z.infer<typeof CreateTask>');
console.log('  （JavaScript では型は見えないが、スキーマが「入力の決まり」の1か所の定義になる）');
