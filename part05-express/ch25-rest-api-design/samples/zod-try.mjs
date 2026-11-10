// 第25章 5節で書く、zod で入力を確かめるプログラムの完成形
// 使い方（~/dev/part05/ch25-rest-api-design で）: node samples/zod-try.mjs   （サーバは使わない）
import { z } from 'zod';

z.config(z.locales.ja()); // 既定の文を日本語にする

const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
});

const inputs = [
  { title: '  牛乳を買う ' },
  { title: '', status: 'later' },
  { title: 'x', owner: 'alice' },
];
for (const input of inputs) {
  const r = CreateTask.safeParse(input);
  if (r.success) {
    console.log('OK  ', JSON.stringify(input), '→', JSON.stringify(r.data));
  } else {
    console.log('NG  ', JSON.stringify(input));
    for (const issue of r.error.issues) console.log('     ', issue.path.join('.') || '(全体)', issue.message);
  }
}

// クエリは文字列で届く。形を決めてから数にする
const Limit = z.string().regex(/^[1-9][0-9]{0,2}$/, '1〜100 の整数').transform(Number).pipe(z.number().max(100));
for (const text of ['20', '2e1', '500']) {
  const r = Limit.safeParse(text);
  console.log('limit', JSON.stringify(text), '→', r.success ? r.data : r.error.issues[0].message);
}
