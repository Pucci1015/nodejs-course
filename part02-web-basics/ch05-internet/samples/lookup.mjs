// Node.js で名前解決する（第5章 5.6節で書くものの完成形）
// 使い方: node lookup.mjs [ホスト名]   既定: localhost
import dns from 'node:dns/promises';

const host = process.argv[2] ?? 'localhost';

try {
  const result = await dns.lookup(host); // OS に聞く（/etc/hosts も見る）
  console.log(`lookup:   ${result.address}`);
} catch (err) {
  console.log(`lookup:   失敗 ${err.code}`);
}

try {
  const addresses = await dns.resolve4(host); // DNS サーバに直接聞く（A レコード）
  console.log(`resolve4: ${addresses.join(', ')}`);
} catch (err) {
  console.log(`resolve4: 失敗 ${err.code}`);
}
