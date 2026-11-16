// API の SSE を中継する（第49章 5節）。ブラウザは同じオリジンの /api/events につなぐ
import { openEvents } from '../../../lib/api.ts';

export async function GET(request: Request) {
  const upstream = await openEvents(request.signal).catch(() => null);
  if (upstream === null || !upstream.ok || upstream.body === null) return new Response('API の知らせにつなげませんでした', { status: 502 });
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}
