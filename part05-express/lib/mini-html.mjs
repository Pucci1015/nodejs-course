// 値を自動でエスケープする html タグ（第21章 4節。練習問題と模範解答でも使う）
//
//   html`<p>${name}</p>`          name は自動でエスケープされる
//   html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`   配列はつなぐ。html`` の結果は、もうエスケープしない
//   raw('<b>自分で書いた HTML</b>')   中身を自分で確かめたものだけ

/** エスケープ済みの HTML であることの印 */
export class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML の文字と、引用符で囲んだ属性の値に入れてよい形にする */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

/** 自分で確かめた HTML を、エスケープせずに入れる印を付ける */
export const raw = (value) => new SafeHtml(String(value));

function render(value) {
  if (value === null || value === undefined || value === false) return ''; // 「何も出さない」ための値
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

/** タグ付きテンプレート。${} の中の値だけをエスケープし、テンプレートの文字はそのまま */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}
