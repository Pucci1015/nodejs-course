// 第65章 2.2節: Cache-Control の値を、名前と値の組に分ける
// 動かし方（章のフォルダで）: node samples/cc.ts
function parse(value: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of value.split(',')) {
    const [name = '', arg = ''] = part.trim().split('=');
    out.set(name.toLowerCase(), arg);
  }
  return out;
}

for (const v of [
  'public, max-age=31536000, immutable',
  'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  'private, no-store',
]) {
  const cc = parse(v);
  const shared = cc.get('s-maxage') ?? cc.get('max-age');
  console.log(JSON.stringify(Object.fromEntries(cc)));
  console.log(`  → CDN が覚えてよい秒数: ${cc.has('private') || cc.has('no-store') ? 'なし' : shared}`);
}
