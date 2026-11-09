// 練習問題6 の模範解答: 同じオリジンか、同じサイトかを判定する
// 確かめ方（~/dev/ch09/exercises で）: MODULE=../solutions/origin.mjs node --test origin.test.mjs
import net from 'node:net';

// 本物の Public Suffix List（https://publicsuffix.org/）のごく一部。
// 実際に判定するときは、一覧全体を使うライブラリ（tldts など）を使う
export const PUBLIC_SUFFIXES = ['com', 'net', 'org', 'jp', 'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'github.io', 'vercel.app'];

// オリジン = スキーム + ホスト名 + ポート。URL の origin がちょうどそれを表している。
// origin は、ホスト名を小文字にし、既定のポート（http の 80、https の 443）を省いた形になっている。
// new URL は、URL として読めない文字列なら TypeError を投げる
export function sameOrigin(a, b) {
  return new URL(a).origin === new URL(b).origin;
}

// ホスト名から「登録できるドメイン」を求める（例: shop.example.co.jp → example.co.jp）
function registrableDomain(hostname) {
  let host = hostname;
  if (host.startsWith('[')) host = host.slice(1, -1); // IPv6 の [::1] の括弧を外す
  if (net.isIP(host) !== 0) return host; // IP アドレスはそれ自体がサイト

  // いちばん長く一致する公開の接尾辞を探す（co.jp と jp の両方が一致するなら co.jp）
  let best = '';
  for (const suffix of PUBLIC_SUFFIXES) {
    if (host.endsWith(`.${suffix}`) && suffix.length > best.length) best = suffix;
  }
  // 一致しなければ（localhost など）、ホスト名そのものをサイトとする
  if (best === '') return host;

  // 接尾辞の前の部分（shop.example）の、いちばん右のラベル（example）を足す
  const rest = host.slice(0, host.length - best.length - 1);
  const label = rest.split('.').pop();
  return `${label}.${best}`;
}

// サイト = スキーム + 登録できるドメイン（ポートとサブドメインは無視する）
export function sameSite(a, b) {
  const ua = new URL(a);
  const ub = new URL(b);
  return ua.protocol === ub.protocol && registrableDomain(ua.hostname) === registrableDomain(ub.hostname);
}
