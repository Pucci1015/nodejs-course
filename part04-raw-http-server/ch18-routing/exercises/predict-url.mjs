// 練習問題1: URL と URLSearchParams の結果を予想する
// 実行する前に、15 個の結果を予想して書き出してから: node predict-url.mjs
const base = 'http://localhost';
const u = (target) => new URL(target, base);

const items = [
  () => u('/users/42?tab=posts').pathname,
  () => u('/users/42?tab=posts').search,
  () => u('/search?q=a+b').searchParams.get('q'),
  () => u('/search?q=a%2Bb').searchParams.get('q'),
  () => u('/search?tag=js&tag=node').searchParams.get('tag'),
  () => u('/search?tag=js&tag=node').searchParams.getAll('tag'),
  () => u('/search?page=').searchParams.get('page'),
  () => u('/search').searchParams.get('page'),
  () => u('/a/b/../c/./d').pathname,
  () => u('/%2e%2e/%2e%2e/etc/passwd').pathname,
  () => u('/files/a%2Fb').pathname,
  () => u('/日本語').pathname,
  () => u('//evil.example/admin').pathname,
  () => u('//evil.example/admin').host,
  () => new URL(base + '//evil.example/admin').pathname,
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
