// 組み込みの URLPattern（第18章 7節）
// 使い方: node urlpattern-demo.mjs
// URLPattern はブラウザと同じ決まりの、URL のパターン。Node.js でも import せずに使える（Node 26 で確かめた）
const user = new URLPattern({ pathname: '/users/:id' });
console.log("new URLPattern({ pathname: '/users/:id' })");
for (const p of ['/users/42', '/users/42/', '/users', '/users/a%2Fb']) {
  const m = user.exec({ pathname: p });
  console.log(`  ${p.padEnd(14)} → ${m ? JSON.stringify(m.pathname.groups) : 'null'}`);
}

// :名前(正規表現) で、あてはまる形を絞れる
const numeric = new URLPattern({ pathname: '/tasks/:id(\\d+)' });
console.log("new URLPattern({ pathname: '/tasks/:id(\\\\d+)' })");
for (const p of ['/tasks/7', '/tasks/abc']) {
  console.log(`  ${p.padEnd(14)} → ${numeric.test({ pathname: p })}`);
}

// * は残り全部。:名前? は、あっても無くてもよい
const files = new URLPattern({ pathname: '/files/*' });
console.log(`/files/* と /files/a/b.txt → ${JSON.stringify(files.exec({ pathname: '/files/a/b.txt' }).pathname.groups)}`);
const opt = new URLPattern({ pathname: '/posts/:page?' });
console.log(`/posts/:page? と /posts → ${JSON.stringify(opt.exec({ pathname: '/posts' }).pathname.groups)}`);

// 注意: グループの値は %xx のまま。自分で decodeURIComponent する
const tag = new URLPattern({ pathname: '/tags/:name' }).exec({ pathname: '/tags/%E6%97%A5%E6%9C%AC' });
console.log(`/tags/%E6%97%A5%E6%9C%AC → ${JSON.stringify(tag.pathname.groups)} → decodeURIComponent で ${decodeURIComponent(tag.pathname.groups.name)}`);
