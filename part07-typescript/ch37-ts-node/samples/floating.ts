// 6節: ESLint が見つける間違いの例。tsc はエラーにしないが、どれもバグになりやすい（このファイルは、わざと直していない）
async function save(n: number): Promise<void> {
  if (n < 0) throw new Error(`負の数は保存できません: ${n}`);
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log('保存しました', n);
}

export function main(): void {
  save(1); // await も catch も無い（失敗しても誰も気づかない）
  [2, -3].forEach(async (n) => {
    await save(n); // forEach は Promise を待たない
  });
  const data: any = JSON.parse('{"n": 4}');
  console.log(data.m.toFixed());
}
