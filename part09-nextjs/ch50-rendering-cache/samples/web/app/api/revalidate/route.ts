// 第50章 4.2節: ほかのシステム（API など）から「タスクが変わった」と知らせてもらう入り口（Webhook）
import { revalidateTag } from 'next/cache';

// 知らせてよい相手だけが知っている合言葉。dev-only- は開発用の仮の値の印。本番では環境変数で渡す
const SECRET = process.env.REVALIDATE_SECRET ?? 'dev-only-revalidate-secret';

export function POST(request: Request) {
  if (request.headers.get('Authorization') !== `Bearer ${SECRET}`) {
    return Response.json({ title: '合言葉が違います' }, { status: 401, headers: { 'Content-Type': 'application/problem+json' } });
  }
  // 'max': 古いものを、新しいものができるまで出し続けてよい（stale-while-revalidate）
  revalidateTag('tasks', 'max');
  return Response.json({ revalidated: true });
}
