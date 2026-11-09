// サーバのデータを、ページの <script> に渡す（第21章 7節）
// 使い方: node json-script-demo.mjs
// サーバは使わない。JSON.stringify をそのまま <script> に入れたときと、< を \u003c にしたときを比べる
const data = { title: '</script> というタグの説明', note: 'a < b & c' };

const naive = `<script>const data = ${JSON.stringify(data)};</script>`;
console.log('--- JSON.stringify をそのまま入れる');
console.log(naive);
// ブラウザは <script> の中身を、JavaScript を読む前に「</script> が来たら終わり」として切る
const end = naive.indexOf('</script>');
console.log(`ブラウザが script の中身として読むのは、ここまで: ${JSON.stringify(naive.slice(8, end))}`);

const safeJson = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const safe = `<script>const data = ${safeJson};</script>`;
console.log('\n--- < を \\u003c にして入れる');
console.log(safe);
console.log(`JavaScript として読んだ値: ${JSON.stringify(JSON.parse(safeJson))}`);

console.log('\n--- もう1つの方法: data 属性に入れて、ページの JavaScript で読む');
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
console.log(`<div id="app" data-props="${esc(JSON.stringify(data))}"></div>`);
console.log("// ページの JavaScript: JSON.parse(document.getElementById('app').dataset.props)");
