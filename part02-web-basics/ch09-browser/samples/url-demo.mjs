// URL を部品に分けて表示する（第9章 1節）
// 使い方: node url-demo.mjs [URL] [基準の URL]
//   例: node url-demo.mjs 'https://user:pass@例え.jp:8443/a/b c/?q=日本語&x=1#top'
//       node url-demo.mjs '../img/logo.png' 'https://example.com/docs/guide/index.html'
const input = process.argv[2] ?? 'https://user:pass@例え.jp:8443/a/b c/?q=日本語&x=1&x=2#top';
const base = process.argv[3];

let url;
try {
  url = new URL(input, base); // base を渡すと、input を相対 URL として解決する
} catch (err) {
  console.error(`URL として解釈できません: ${err.message}`);
  process.exit(1);
}

console.log(`入力: ${input}${base ? `（基準: ${base}）` : ''}`);
console.log(`結果: ${url.href}\n`);
for (const key of ['protocol', 'username', 'password', 'host', 'hostname', 'port', 'pathname', 'search', 'hash', 'origin']) {
  console.log(`  ${key.padEnd(9)} ${JSON.stringify(url[key])}`);
}
console.log('  searchParams:');
for (const [k, v] of url.searchParams) console.log(`    ${JSON.stringify(k)} = ${JSON.stringify(v)}`);
