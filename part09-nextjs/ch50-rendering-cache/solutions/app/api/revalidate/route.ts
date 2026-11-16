// 第50章 練習問題6の模範解答: POST /api/revalidate。合言葉が合えば、名札 'tasks' のものを古いことにする
import { revalidateTag } from 'next/cache';

const SECRET = process.env.REVALIDATE_SECRET ?? 'dev-only-revalidate-secret';

export function POST(request: Request) {
  if (request.headers.get('Authorization') !== `Bearer ${SECRET}`) {
    return Response.json({ title: '合言葉が違います' }, { status: 401, headers: { 'Content-Type': 'application/problem+json' } });
  }
  revalidateTag('tasks', 'max');
  return Response.json({ revalidated: true });
}
