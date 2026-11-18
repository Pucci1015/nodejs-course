// 第55章 練習問題6 の模範解答: 利用者が書いた URL を、安全に取りに行く（本文8.1節の checkOutboundUrl を広げる）
import { BlockList, isIP } from 'node:net';

export type LookupFn = (hostname: string) => Promise<string[]>;
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type SafeFetchOptions = { lookup: LookupFn; fetchFn?: FetchLike; maxRedirects?: number; maxBytes?: number };

/** 取りに行かなかった・取れなかった理由 */
export class OutboundError extends Error {
  readonly reason: 'url' | 'blocked' | 'dns' | 'too_many_redirects' | 'too_large';
  constructor(reason: OutboundError['reason'], message: string) {
    super(message);
    this.name = 'OutboundError';
    this.reason = reason;
  }
}

const blocked = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
] as const) {
  blocked.addSubnet(net, prefix);
}
blocked.addAddress('::', 'ipv6');
blocked.addAddress('::1', 'ipv6');
blocked.addSubnet('fc00::', 7, 'ipv6');
blocked.addSubnet('fe80::', 10, 'ipv6');

export const isBlocked = (address: string) => blocked.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');

/** 本文8.1節の checkOutboundUrl と同じ決まり。名前を引く関数を、引数で受け取る */
async function check(url: URL, lookup: LookupFn): Promise<void> {
  if (url.protocol !== 'https:') throw new OutboundError('url', 'https だけを使えます');
  if (url.username !== '' || url.password !== '') throw new OutboundError('url', 'ユーザー名・パスワードは書けません');
  if (url.port !== '') throw new OutboundError('url', 'ポートは書けません');
  let addresses: string[];
  try {
    addresses = await lookup(url.hostname.replace(/^\[(.*)\]$/, '$1'));
  } catch {
    throw new OutboundError('dns', '名前を引けません');
  }
  if (addresses.length === 0) throw new OutboundError('dns', '名前を引けません');
  const bad = addresses.find(isBlocked);
  if (bad !== undefined) throw new OutboundError('blocked', `中の網のアドレスです（${bad}）`);
}

export async function safeFetch(input: string, options: SafeFetchOptions): Promise<{ url: string; status: number; body: string }> {
  const { lookup, fetchFn = fetch, maxRedirects = 3, maxBytes = 1_000_000 } = options;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new OutboundError('url', 'URL の形ではありません');
  }
  // リダイレクトは自分でたどる。行き先ごとに、もう一度確かめるため（fetch に任せると、中の網へ送られても気付けない）
  for (let hops = 0; ; hops++) {
    await check(url, lookup);
    const res = await fetchFn(url.href, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location !== null) {
      if (hops >= maxRedirects) throw new OutboundError('too_many_redirects', 'リダイレクトが多すぎます');
      url = new URL(location, url); // 相対の URL は、今の URL から解決する
      continue;
    }
    // 大きさ: 先に Content-Length で断り、読んだ後の長さでも確かめる（Content-Length は無いこともある）
    const length = Number(res.headers.get('content-length') ?? '0');
    if (length > maxBytes) throw new OutboundError('too_large', '大きすぎます');
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > maxBytes) throw new OutboundError('too_large', '大きすぎます');
    return { url: url.href, status: res.status, body: bytes.toString('utf8') };
  }
}
