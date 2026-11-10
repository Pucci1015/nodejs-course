// 練習問題3 の模範解答
import { html } from '../samples/mini-html.mjs';

export function selectBox(name, options, selected) {
  const items = options.map((o) => (o.value === selected
    ? html`<option value="${o.value}" selected>${o.label}</option>`
    : html`<option value="${o.value}">${o.label}</option>`));
  return html`<select name="${name}">${items}</select>`;
}
