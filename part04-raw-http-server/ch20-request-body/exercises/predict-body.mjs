// 練習問題4: フォームと JSON の読み方の結果を予想する
// 実行する前に 15 個の結果を予想して書き出してから: node predict-body.mjs
const form = (s) => new URLSearchParams(s);

const items = [
  () => form('name=a+b').get('name'),
  () => form('name=a%2Bb').get('name'),
  () => form('q=1%3D1&x=').get('q'),
  () => form('q=1=1').get('q'),
  () => form('tags=a&tags=b').get('tags'),
  () => Object.fromEntries(form('tags=a&tags=b')),
  () => form('agree=on').get('agree'),
  () => form('name=').get('name') ?? '無い',
  () => JSON.parse('{"a":1,"a":2}'),
  () => JSON.parse('9007199254740993'),
  () => JSON.parse(' "文字" '),
  () => JSON.parse('null'),
  () => JSON.parse('{"__proto__":{"x":1}}').x,
  () => Object.keys(JSON.parse('{"__proto__":{"x":1}}')),
  () => JSON.parse(''),
];

items.forEach((f, i) => {
  let out;
  try {
    out = JSON.stringify(f());
  } catch (err) {
    out = `${err.name}: ${err.message}`;
  }
  console.log(`${String(i + 1).padStart(2)}: ${out}`);
});
