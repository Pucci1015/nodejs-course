// 5節: ほかのサービスの応答も「外から来たデータ」。fetch の応答を Zod で確かめる
import http from 'node:http';
import { z } from 'zod';

z.config(z.locales.ja());

// ---- 練習のための「ほかのチームのサービス」（ポート 9481）。2人目の id が、なぜか文字列で返ってくる ----
const upstream = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/users') res.end('[{"id": 1, "name": "alice"}, {"id": "2", "name": "bob"}]');
  else if (req.url === '/users/1') res.end('{"id": 1, "name": "alice"}');
  else {
    res.statusCode = 404;
    res.end('{"error": "not found"}');
  }
});
await new Promise<void>((resolve) => upstream.listen(9481, '127.0.0.1', resolve));

// ---- ここから、呼ぶ側のコード ----
const User = z.object({ id: z.number().int(), name: z.string() });
type User = z.infer<typeof User>;

/** ほかのサービスが、思った応答を返さなかった */
class UpstreamError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UpstreamError';
  }
}

const BASE = 'http://127.0.0.1:9481';

async function getJson<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S>> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new UpstreamError(`${path} が ${res.status} を返しました`);
  const body: unknown = await res.json(); // res.json() は Promise<unknown>。確かめるまで使えない
  const result = schema.safeParse(body);
  if (!result.success) throw new UpstreamError(`${path} の応答の形が違います`, { cause: result.error });
  return result.data;
}

const alice: User = await getJson('/users/1', User);
console.log('1人:', alice.name);

for (const path of ['/users', '/users/9']) {
  try {
    await getJson(path, z.array(User));
  } catch (err) {
    if (!(err instanceof UpstreamError)) throw err;
    console.log(err.message);
    if (err.cause instanceof z.ZodError) console.log(z.prettifyError(err.cause));
  }
}

upstream.close();
