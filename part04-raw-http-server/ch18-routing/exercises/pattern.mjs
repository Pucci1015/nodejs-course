// 練習問題2: パスのパターン（/users/:id など）と、実際のパスを照らし合わせる
// 仕様は README の練習問題2を見てください。
// 確かめる: node --test pattern.test.mjs

/** パターンを、セグメントの配列に分ける。書き方が間違っていたら TypeError */
export function parsePattern(pattern) {
  // ここを書く
}

/**
 * pathname（%xx のままのもの）がパターンにあてはまれば、パラメータのオブジェクトを返す。
 * あてはまらなければ null。%xx の形が壊れていたら URIError を投げる
 */
export function matchPath(pattern, pathname) {
  // 下は、よくある書き方です。いくつかのテストは通りますが、まちがいがあります。直すか、書き直してください
  const names = [];
  const source = pattern.replace(/:(\w+)/g, (_, name) => {
    names.push(name);
    return '(.+)';
  });
  const m = new RegExp(`^${source}$`).exec(decodeURIComponent(pathname));
  if (!m) return null;
  const params = {};
  names.forEach((name, i) => (params[name] = m[i + 1]));
  return params;
}

/** どちらのパターンが「より具体的」か。sort に渡すと、具体的なものが先に並ぶ */
export function comparePatterns(a, b) {
  // ここを書く
  return 0;
}
