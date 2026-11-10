// 練習問題5 解答例: パスのパターン（/users/:id など）と、実際のパスを照らし合わせる
//
// パターンの書き方:
//   /users        ふつうの文字（静的なセグメント）
//   /users/:id    ":名前" は 1つのセグメント（/ を含まない、空でない）にあてはまる
//   /files/*      "*" は最後にだけ書ける。残り全部（/ を含んでよい。空でもよい）にあてはまる

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** パターンを、セグメントの配列に分ける。書き方が間違っていたら TypeError */
export function parsePattern(pattern) {
  if (typeof pattern !== 'string' || !pattern.startsWith('/')) {
    throw new TypeError(`パターンは / で始めてください: ${pattern}`);
  }
  if (pattern === '/') return [];
  const segments = pattern.slice(1).split('/');
  return segments.map((s, i) => {
    if (s === '') throw new TypeError(`空のセグメントがあります（// や、最後の /）: ${pattern}`);
    if (s === '*') {
      if (i !== segments.length - 1) throw new TypeError(`* は最後にだけ書けます: ${pattern}`);
      return { type: 'rest' };
    }
    if (s.startsWith(':')) {
      const name = s.slice(1);
      if (!NAME_RE.test(name)) throw new TypeError(`パラメータの名前が正しくありません: ${s}`);
      return { type: 'param', name };
    }
    return { type: 'static', value: s };
  });
}

/**
 * pathname（URL の pathname。%xx のままのもの）がパターンにあてはまれば、パラメータのオブジェクトを返す。
 * あてはまらなければ null。%xx の形が壊れていたら URIError を投げる
 */
export function matchPath(pattern, pathname) {
  const segments = typeof pattern === 'string' ? parsePattern(pattern) : pattern;
  // 先に / で分けてから、セグメントごとに %xx を戻す。
  // 先に戻すと、%2F（/ そのもの）が区切りに見えてしまう
  const parts = pathname === '/' ? [] : pathname.slice(1).split('/');
  const params = Object.create(null); // __proto__ などの名前でも安全なように、プロトタイプの無いオブジェクト

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === 'rest') {
      if (parts.length <= i) return null; // /files/* は /files にはあてはまらない（/files/ にはあてはまる）
      params['*'] = parts.slice(i).map(decodeURIComponent).join('/');
      return params;
    }
    const part = parts[i];
    if (part === undefined || part === '') return null; // 足りない、または // のような空のセグメント
    const value = decodeURIComponent(part); // 壊れた %xx なら URIError
    if (seg.type === 'static') {
      if (value !== seg.value) return null;
    } else {
      params[seg.name] = value;
    }
  }
  return parts.length === segments.length ? params : null;
}

const RANK = { static: 0, param: 1, rest: 2 };

/**
 * どちらのパターンが「より具体的」か。sort に渡すと、具体的なものが先に並ぶ。
 * 前のセグメントから比べて、静的 → パラメータ → * の順。全部同じなら、長い方が先
 */
export function comparePatterns(a, b) {
  const sa = typeof a === 'string' ? parsePattern(a) : a;
  const sb = typeof b === 'string' ? parsePattern(b) : b;
  for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
    const d = RANK[sa[i].type] - RANK[sb[i].type];
    if (d !== 0) return d;
  }
  return sb.length - sa.length;
}
