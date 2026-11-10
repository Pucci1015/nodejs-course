// 練習問題1 の模範解答
import http from 'node:http';

export async function readJson(request) {
  const type = request.headers.get('content-type') ?? '';
  if (type.split(';')[0].trim().toLowerCase() !== 'application/json') return { ok: false, status: 415 };
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, status: 400 };
  }
}

export function problemResponse(status, instance) {
  const body = { type: 'about:blank', title: http.STATUS_CODES[status] ?? 'Error', status, instance };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}
