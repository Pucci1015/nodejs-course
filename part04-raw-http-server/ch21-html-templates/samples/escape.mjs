// 第21章 3節で書く、5つの文字をエスケープする関数の完成形
// 使い方（~/dev/part04/ch21-html-templates で）: node samples/escape.mjs   （サーバは使わない）
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

const titles = ['HTML の <p> と <div> の違い', 'Tom & Jerry の作り方', '"段落" と \'まとまり\''];
for (const t of titles) {
  console.log(escapeHtml(t));
}

console.log('1回 :', escapeHtml('a & b'));
console.log('2回 :', escapeHtml(escapeHtml('a & b')));
