// URL を部品に分けて表示する（第9章 1.1節で書くものの完成形）
// 使い方: node url-parts.mjs 'https://example.com:8443/a/b?q=1&x=2#top'
const url = new URL(process.argv[2]);

console.log(`スキーム    : ${url.protocol}`);
console.log(`ホスト名    : ${url.hostname}`);
console.log(`ポート      : ${url.port}`);
console.log(`パス        : ${url.pathname}`);
console.log(`クエリ      : ${url.search}`);
console.log(`フラグメント: ${url.hash}`);
console.log(`オリジン    : ${url.origin}`);
for (const [name, value] of url.searchParams) {
  console.log(`  クエリの ${name} = ${value}`);
}
