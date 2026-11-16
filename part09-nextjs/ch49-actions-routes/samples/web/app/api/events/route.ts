// 第49章 5節: API の SSE を、そのまま中継する。ブラウザは同じオリジンの /api/events につなぐので、CORS が要らない
import { openEvents } from '../../../lib/api.ts';

export async function GET(request: Request) {
  // request.signal: ブラウザが接続を切ると中断される。渡しておくと、API へのつながりも一緒に切れる
  const upstream = await openEvents(request.signal);
  if (!upstream.ok || upstream.body === null) return new Response('API の知らせにつなげませんでした', { status: 502 });
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
