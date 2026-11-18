// 第60章 練習問題3の模範解答: プロキシの後ろで、客の IP アドレスを決める（本文7節）

export type ClientIpInput = {
  /** TCP でつながってきた相手（req.socket.remoteAddress） */
  remoteAddress: string;
  /** X-Forwarded-For ヘッダの値（無ければ undefined） */
  forwardedFor: string | undefined;
  /** 前に何段のプロキシがあるか（信じてよい段の数） */
  trustedHops: number;
};

/** '::ffff:192.0.2.1' → '192.0.2.1'（IPv6 の待ち受けで、IPv4 の相手がこう見える） */
function normalize(ip: string): string {
  return ip.startsWith('::ffff:') && ip.includes('.') ? ip.slice('::ffff:'.length) : ip;
}

export function clientIp(input: ClientIpInput): string {
  const { remoteAddress, forwardedFor, trustedHops } = input;
  const forwarded = (forwardedFor ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  // 近い順に並べる: [つながってきた相手, X-Forwarded-For の右端, その左, …]
  const chain = [remoteAddress, ...forwarded.reverse()].map(normalize);
  // 信じてよい段の数だけ、近い側からさかのぼる。ヘッダが足りなければ、いちばん遠い（左端）
  const index = Math.min(trustedHops, chain.length - 1);
  return chain[index] ?? normalize(remoteAddress);
}
