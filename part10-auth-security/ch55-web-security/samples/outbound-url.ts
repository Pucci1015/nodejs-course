// 8.1節: 利用者が書いた URL に、サーバから取りに行く前に確かめる（SSRF の対策）
// 動かし方: node samples/outbound-url.ts
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/** サーバから取りに行ってはいけない場所（自分・家や会社の中の網・クラウドの管理用の住所など） */
const blocked = new BlockList();
blocked.addSubnet('0.0.0.0', 8); // 「この網」
blocked.addSubnet('10.0.0.0', 8); // 中の網（プライベートアドレス）
blocked.addSubnet('100.64.0.0', 10); // 通信会社の中の網
blocked.addSubnet('127.0.0.0', 8); // 自分（ループバック）
blocked.addSubnet('169.254.0.0', 16); // リンクローカル（クラウドの管理用の住所もここ）
blocked.addSubnet('172.16.0.0', 12); // 中の網
blocked.addSubnet('192.168.0.0', 16); // 中の網
blocked.addAddress('::', 'ipv6'); // 「どこでもない」
blocked.addAddress('::1', 'ipv6'); // 自分
blocked.addSubnet('fc00::', 7, 'ipv6'); // 中の網
blocked.addSubnet('fe80::', 10, 'ipv6'); // リンクローカル

/** IPv6 の形で書いた IPv4（::ffff:127.0.0.1）も、BlockList は IPv4 の決まりで調べてくれる（Node.js 24 で確かめた） */
function isBlocked(address: string): boolean {
  return blocked.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');
}

export type OutboundCheck = { ok: true; url: URL; addresses: string[] } | { ok: false; reason: string };

export async function checkOutboundUrl(input: string): Promise<OutboundCheck> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: 'URL の形ではありません' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'https だけを使えます' };
  if (url.username !== '' || url.password !== '') return { ok: false, reason: 'ユーザー名・パスワードは書けません' };
  if (url.port !== '') return { ok: false, reason: 'ポートは書けません（443 だけ）' };
  // 名前を IP アドレスにして、すべてを調べる（1つでも中の網なら断る）。[::1] の [] は外す
  const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
  let addresses: string[];
  try {
    addresses = (await lookup(host, { all: true })).map((a) => a.address);
  } catch {
    return { ok: false, reason: '名前を引けません' };
  }
  const bad = addresses.find(isBlocked);
  if (bad !== undefined) return { ok: false, reason: `中の網のアドレスです（${bad}）` };
  return { ok: true, url, addresses };
}

if (import.meta.main) {
  for (const input of [
    'https://nodejs.org/',
    'http://nodejs.org/',
    'https://127.0.0.1/',
    'https://localhost/',
    'https://[::1]/',
    'https://[::ffff:127.0.0.1]/',
    'https://169.254.169.254/latest/',
    'https://192.168.1.1/',
    'https://user:pass@nodejs.org/',
    'https://nodejs.org:8443/',
  ]) {
    const r = await checkOutboundUrl(input);
    console.log(input.padEnd(34), r.ok ? `OK ${r.addresses.join(', ')}` : `NG ${r.reason}`);
  }
}
