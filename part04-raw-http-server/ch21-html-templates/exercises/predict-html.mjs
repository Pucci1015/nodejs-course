// 練習問題1: html タグとエスケープの結果を予想する
// 実行する前に 15 個の結果を予想して書き出してから: node predict-html.mjs
import { html, raw, escapeHtml } from '../samples/mini-html.mjs';

const name = 'Tom & Jerry';
const tags = ['<b>', 'a&b'];

const items = [
  () => escapeHtml('1 < 2 & 3 > 2'),
  () => escapeHtml(`"引用" と 'アポストロフィ'`),
  () => escapeHtml('&amp;'),
  () => escapeHtml(escapeHtml('<')),
  () => html`<p>${name}</p>`,
  () => html`<p title="${name}">${'"'}</p>`,
  () => html`<p>${null}${undefined}${false}${0}</p>`,
  () => html`<ul>${tags.map((t) => html`<li>${t}</li>`)}</ul>`,
  () => html`<ul>${tags.map((t) => `<li>${t}</li>`)}</ul>`,
  () => html`<p>${html`<b>${name}</b>`}</p>`,
  () => html`<p>${raw('<b>太字</b>')}</p>`,
  () => html`<p>${String(html`<b>${name}</b>`)}</p>`,
  () => html`<p>${[1, [2, [3]]]}</p>`,
  () => html`<p>${{ a: 1 }}</p>`,
  () => html`<a href="/search?q=${'a b&c'}">検索</a>`,
];

items.forEach((f, i) => {
  let out;
  try {
    out = String(f());
  } catch (err) {
    out = `${err.name}: ${err.message}`;
  }
  console.log(`${String(i + 1).padStart(2)}: ${out}`);
});
