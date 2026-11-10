// 練習問題5: HTML を組み立てるときの小さな道具
// テスト: node --test html-helpers.test.mjs
import { SafeHtml, escapeHtml } from '../samples/mini-html.mjs';

/**
 * 属性をまとめて書く。html`<input${attrs({ name: 'q', required: true })}>` のように使う
 *   true → 名前だけ（required）、false・null・undefined → 書かない
 *   class だけは、配列（['a', 'b']）や { active: true } も受け取る
 *   名前が属性名として使えない文字を含むときは TypeError
 */
export function attrs(obj) {
  // ここを書く（いまは、値をそのまま、引用符も付けずにつないでいる）
  return new SafeHtml(Object.entries(obj).map(([k, v]) => ` ${k}=${v}`).join(''));
}

/**
 * リンク先（href・src）に入れてよい URL だけを通す
 *   http:・https:・mailto: と、scheme の無い相対 URL（/a、./a、?q=1、#top）はそのまま返す
 *   それ以外の scheme は '#' にする
 */
export function safeUrl(url) {
  // ここを書く（いまは、何でも通す）
  return String(url);
}

/** <script> の中に入れる JSON。< > & と U+2028・U+2029 を \uXXXX にする */
export function jsonForScript(value) {
  // ここを書く（いまは、JSON.stringify だけ）
  return new SafeHtml(JSON.stringify(value));
}

/** { q: 'a b', page: 2 } → '?q=a+b&page=2'。null・undefined の値は入れない。何も無ければ '' */
export function queryString(params) {
  // ここを書く（いまは、そのままつないでいる）
  const s = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
  return s ? `?${s}` : '';
}

export { escapeHtml };
