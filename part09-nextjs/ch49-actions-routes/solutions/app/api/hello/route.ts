// 第49章 練習問題1の模範解答: GET /api/hello と GET /api/hello?name=alice
export function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name')?.trim() ?? '';
  return Response.json({ message: name === '' ? 'こんにちは' : `こんにちは、${name} さん` });
}
