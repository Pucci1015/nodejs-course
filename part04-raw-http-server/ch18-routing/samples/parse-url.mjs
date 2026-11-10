// 第18章 3節で書く、req.url を URL で分解するプログラムの完成形（サーバは起動しない）
// 使い方（~/dev/part04/ch18-routing で）: node samples/parse-url.mjs
const examples = ['/api/tasks?page=2&tag=js&tag=node', '/a/b/../c', '/search?q=a+b&page=', '//evil.example/admin'];

for (const reqUrl of examples) {
  const url = new URL(`http://localhost${reqUrl}`); // 文字列をつないでから読む（3.2節）
  console.log(reqUrl);
  console.log('  pathname:', url.pathname);
  console.log('  page    :', url.searchParams.get('page'));
  console.log('  tag     :', url.searchParams.getAll('tag'));
  console.log('  q       :', url.searchParams.get('q'));
}
