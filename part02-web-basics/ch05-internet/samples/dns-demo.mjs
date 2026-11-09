// Node.js の2種類の名前解決を比べる（第5章 5.5節）
// 使い方: node dns-demo.mjs [ホスト名]   既定: localhost
//   例: node dns-demo.mjs example.com
import dns from 'node:dns/promises';

const host = process.argv[2] ?? 'localhost';
console.log(`ホスト名: ${host}\n`);

// (1) dns.lookup: OS の名前解決の仕組みを使う（/etc/hosts も見る）。
//     http.get や fetch など、普段の通信はこちらを使っている
try {
  const results = await dns.lookup(host, { all: true });
  console.log('dns.lookup（OS に問い合わせる）:');
  for (const r of results) console.log(`  IPv${r.family} ${r.address}`);
} catch (err) {
  console.log(`dns.lookup: 失敗 ${err.code}`);
}

// (2) dns.resolve4 / resolve6: DNS サーバに直接問い合わせる（/etc/hosts は見ない）
for (const [label, fn] of [
  ['resolve4（A レコード）', dns.resolve4],
  ['resolve6（AAAA レコード）', dns.resolve6],
]) {
  try {
    const addrs = await fn.call(dns, host, { ttl: true });
    console.log(`dns.${label}:`);
    for (const a of addrs) console.log(`  ${a.address}（TTL ${a.ttl} 秒）`);
  } catch (err) {
    console.log(`dns.${label}: 失敗 ${err.code}`);
  }
}
