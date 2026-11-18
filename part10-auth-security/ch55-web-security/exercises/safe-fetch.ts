// 第55章 練習問題6: 利用者が書いた URL を、安全に取りに行く（本文8.1節の checkOutboundUrl を広げる）
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

export async function safeFetch(input: string, options: SafeFetchOptions): Promise<{ url: string; status: number; body: string }> {
  // ここを書く
  void options;
  throw new Error(`まだ書いていません: ${input}`);
}
