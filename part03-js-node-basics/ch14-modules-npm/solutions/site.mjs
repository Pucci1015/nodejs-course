// 練習問題4 の解答: tldts（Public Suffix List を内蔵したパッケージ）でサイトを判定する
// 使い方: ~/dev/ch14/packages にコピーし、npm install tldts をしてから
// 確かめ方: cd <教材>/ch14-modules-npm/exercises && MODULE=~/dev/ch14/packages/site.mjs node --test site.test.mjs
import { getDomain } from 'tldts';

/** URL の登録できるドメイン（IP アドレスや localhost なら、ホスト名そのもの） */
export function registrableDomain(url) {
  const { hostname } = new URL(url); // 読めない URL なら TypeError
  const host = hostname.replace(/^\[|\]$/g, ''); // IPv6 の [ ] を外す
  // allowPrivateDomains: true で、github.io のような「会社が登録した公開の接尾辞」（PSL の PRIVATE の部）も使う。
  // ブラウザは PRIVATE の部も使って Cookie やサイトを判断するので、それに合わせる（tldts の既定は false）
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
}

/** 2つの URL が同じサイト（スキーム + 登録できるドメイン）なら true */
export function sameSite(a, b) {
  const [x, y] = [new URL(a), new URL(b)];
  return x.protocol === y.protocol && registrableDomain(a) === registrableDomain(b);
}
