// 第21章 4節で書く、タグ付きテンプレートを確かめるプログラムの完成形
// 使い方（~/dev/part04/ch21-html-templates で）: node samples/tag-demo.mjs   （サーバは使わない）
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESC[c]);

// 1. タグ付きテンプレートの関数は、何を受け取るか
function show(strings, ...values) {
  console.log(strings, values);
}
show`<p>${'Tom & Jerry'}</p><p>${42}</p>`;

// 2. 値だけをエスケープする
function esc(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += escapeHtml(values[i]) + strings[i + 1];
  }
  return out;
}
const title = 'Tom & <Jerry>';
console.log(esc`<p>${title}</p>`);

// 3. esc の結果を、もう一度 esc の中に入れると
const items = ['a & b', 'c'].map((t) => esc`<li>${t}</li>`).join('');
console.log(esc`<ul>${items}</ul>`);
