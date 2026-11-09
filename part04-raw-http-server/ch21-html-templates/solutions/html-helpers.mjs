// 練習問題2の模範解答
import { SafeHtml, escapeHtml } from '../samples/mini-html.mjs';

// 修正: 属性名に使ってよい文字を決める（空白・引用符・> ・= ・/ などは不可）
const ATTR_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/;

// 追加: class の値を、配列・オブジェクトから文字列にする
function classValue(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(' ');
  if (v && typeof v === 'object') return Object.keys(v).filter((k) => v[k]).join(' ');
  return v;
}

export function attrs(obj) {
  let out = '';
  for (const [name, value] of Object.entries(obj)) {
    if (!ATTR_NAME.test(name)) throw new TypeError(`属性名に使えない文字があります: ${JSON.stringify(name)}`);
    const v = name === 'class' ? classValue(value) : value;
    if (v === false || v === null || v === undefined) continue;
    if (name === 'class' && v === '') continue; // 追加: 空の class は書かない
    if (v === true) out += ` ${name}`; // 追加: 真偽の属性は名前だけ
    else out += ` ${name}="${escapeHtml(v)}"`; // 修正: 引用符で囲んで、エスケープする
  }
  return new SafeHtml(out);
}

const ALLOWED = new Set(['http:', 'https:', 'mailto:']);

export function safeUrl(url) {
  const s = String(url);
  // 追加: ブラウザは URL の前後の空白と、途中のタブ・改行を取り除いてから読む。同じようにしてから scheme を見る
  const cleaned = s.replace(/^[\u0000-\u0020]+/, '').replace(/[\t\n\r]/g, '');
  // scheme は「英字で始まり、英数字と + - . が続き、: で終わる」もの。/ ? # より前にあるときだけ
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
  if (!m) return s; // scheme が無い = 相対 URL
  return ALLOWED.has(`${m[1].toLowerCase()}:`) ? s : '#';
}

export function jsonForScript(value) {
  const json = JSON.stringify(value) ?? 'null'; // 追加: undefined は JSON にならない
  // 修正: </script> や <!-- で script が終わらないように、< > & を \uXXXX にする
  //       U+2028・U+2029 は、古い JavaScript では文字列の中に書けなかった文字
  const safe = json.replace(/[<>&\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return new SafeHtml(safe);
}

export function queryString(params) {
  // 修正: URLSearchParams にエンコードを任せる（空白は +、& や = は %26・%3D）
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export { escapeHtml };
