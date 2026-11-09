// 練習問題9 の模範解答: 1つの名前を、lookup・resolve4・resolve6 で調べて比べる
// 使い方: node dns-check.mjs [ホスト名]   既定: localhost
import dns from 'node:dns/promises';

const host = process.argv[2] ?? 'localhost';
let lookupOk = false;
let resolve4Ok = false;

try {
  const result = await dns.lookup(host);
  console.log(`lookup:   ${result.address}`);
  lookupOk = true;
} catch (err) {
  console.log(`lookup:   失敗 ${err.code}`);
}

try {
  const addresses = await dns.resolve4(host);
  console.log(`resolve4: ${addresses.join(', ')}`);
  resolve4Ok = true;
} catch (err) {
  console.log(`resolve4: 失敗 ${err.code}`);
}

try {
  const addresses = await dns.resolve6(host);
  console.log(`resolve6: ${addresses.join(', ')}`);
} catch (err) {
  console.log(`resolve6: 失敗 ${err.code}`);
}

if (lookupOk && !resolve4Ok) {
  console.log('→ OS は知っているが DNS には無い名前（/etc/hosts に書かれているかもしれない）');
} else if (!lookupOk) {
  console.log('→ どこにも見つからない名前');
} else {
  console.log('→ DNS に登録されている名前');
}
