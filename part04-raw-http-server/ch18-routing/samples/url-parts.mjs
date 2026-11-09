// req.url を、URL で分解する（第18章 3節）
// 使い方: node url-parts.mjs
// サーバに届く req.url の例を並べて、new URL の2つの書き方の結果を比べる
const base = 'http://localhost';

const targets = [
  '/users/42?tab=posts#top',
  '/search?q=a+b&q=%E3%81%82&page=',
  '/a/b/../c/./d',
  '/%2e%2e/%2e%2e/etc/passwd',
  '/files/a%2Fb.txt',
  '/tags/%E0%A4%A',
  '/Users/',
  '//evil.example/admin',
];

console.log('--- new URL(req.url, base) と new URL(base + req.url)');
for (const t of targets) {
  const a = new URL(t, base);
  const b = new URL(base + t);
  console.log(JSON.stringify(t));
  console.log(`  URL(req.url, base): host=${a.host} pathname=${a.pathname} search=${a.search}`);
  if (a.href !== b.href) console.log(`  URL(base + req.url): host=${b.host} pathname=${b.pathname} search=${b.search}   ← 違う`);
}

console.log('\n--- searchParams');
const sp = new URL('/search?q=a+b&q=%E3%81%82&page=&empty', base).searchParams;
console.log(`get('q')       → ${JSON.stringify(sp.get('q'))}（最初の1つ）`);
console.log(`getAll('q')    → ${JSON.stringify(sp.getAll('q'))}`);
console.log(`get('page')    → ${JSON.stringify(sp.get('page'))}（= はあるが値が空）`);
console.log(`get('empty')   → ${JSON.stringify(sp.get('empty'))}（= も無い）`);
console.log(`get('nothing') → ${JSON.stringify(sp.get('nothing'))}（そもそも無い）`);
console.log(`Number('')     → ${Number('')}（空の文字列は 0 になってしまう）`);
console.log(`Object.fromEntries → ${JSON.stringify(Object.fromEntries(sp))}（同じキーは最後の1つだけ残る）`);

console.log('\n--- パスの %xx を戻す');
for (const s of ['caf%C3%A9', 'a%2Fb', 'a+b', '%E0%A4%A']) {
  try {
    console.log(`decodeURIComponent(${JSON.stringify(s)}) → ${JSON.stringify(decodeURIComponent(s))}`);
  } catch (err) {
    console.log(`decodeURIComponent(${JSON.stringify(s)}) → ${err.name}: ${err.message}`);
  }
}
