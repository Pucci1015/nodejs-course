// 第49章 練習問題2の模範解答: POST /api/sum。JSON を Zod で確かめ、駄目なら 400 の problem+json
import { z } from 'zod';

const InputSchema = z.object({ numbers: z.array(z.number()).min(1).max(100) });

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { title: 'numbers は、1〜100 個の数の配列です' },
      { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
    );
  }
  const sum = parsed.data.numbers.reduce((a, b) => a + b, 0);
  return Response.json({ sum });
}
