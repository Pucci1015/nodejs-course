// 第28章 5節で書く、フレームワークなしの Web 標準のハンドラを動かすプログラムの完成形
// 使い方（~/dev/part05/ch28-framework-map で）: node samples/web-serve.mjs
//   別のターミナルで curl -s 'http://127.0.0.1:9357/add?a=2&b=3'
import { serve } from '@hono/node-server';

// Request を受け取って Response を返す、ただの関数
async function handle(request) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/add') {
    const a = url.searchParams.get('a') ?? ''; // 無ければ null なので、空の文字列にする
    const b = url.searchParams.get('b') ?? '';
    if (!/^-?[0-9]{1,9}$/.test(a) || !/^-?[0-9]{1,9}$/.test(b)) {
      return Response.json({ error: 'a と b は整数です' }, { status: 400 });
    }
    return Response.json({ sum: Number(a) + Number(b) });
  }
  return new Response('Not Found\n', { status: 404 });
}

// 起動する前に、関数として呼んで試せる
const res = await handle(new Request('http://localhost/add?a=1&b=2'));
console.log(res.status, await res.json());

// Hono のアプリでなくても、fetch の形の関数なら、そのまま動かせる
serve({ fetch: handle, port: 9357, hostname: '127.0.0.1' }, () => console.log('http://127.0.0.1:9357/ で待っています'));
