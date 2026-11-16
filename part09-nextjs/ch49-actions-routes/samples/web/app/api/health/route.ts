// 第49章 2.1節: Route Handler。GET /api/health に JSON を返す（Express の app.get と同じ役目）
export function GET() {
  return Response.json({ status: 'ok' });
}
