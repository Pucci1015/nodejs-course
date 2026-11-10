// 練習問題8 の解答: semver の parse・compare・satisfies を自分で作る
// 確かめ方: cd ../exercises && MODULE=../solutions/semver.mjs node --test semver.test.mjs
//
// 考え方: 範囲（"^1.2.3 || >=2.0.0-beta <3"）を、まず「比較の組（>=1.2.3 <2.0.0-0 など）」に直してから判定する。
//   範囲   = 組 || 組 || …        どれか1つの組を満たせばよい
//   組     = 比較 比較 …          組の中の比較を、すべて満たす必要がある
//   比較   = [演算子, バージョン]   （演算子は < <= > >= =）
//   "^1.2.3" は [['>=', '1.2.3'], ['<', '2.0.0-0', true]] になる。3つ目の true は「自分で足した境目」の印。
//   上の境目を 2.0.0 ではなく 2.0.0-0（2.0.0 のどのプレリリースよりも小さい）にするのは、2.0.0-beta を含めないため

const VERSION = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** "1.2.3-beta.1+build" → { major: 1, minor: 2, patch: 3, prerelease: ['beta', 1] }。正しくなければ null */
export function parse(version) {
  if (typeof version !== 'string') return null;
  const m = version.trim().match(VERSION);
  if (!m) return null;
  const prerelease = m[4] ? m[4].split('.').map((id) => (/^\d+$/.test(id) ? Number(id) : id)) : [];
  // 数字だけの識別子は、先頭に 0 を付けてはいけない（"01" はだめ）
  if (m[4] && m[4].split('.').some((id) => /^0\d+$/.test(id))) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease };
}

/** a < b なら -1、同じなら 0、a > b なら 1。正しくないバージョンには TypeError */
export function compare(a, b) {
  const x = typeof a === 'string' ? parse(a) : a;
  const y = typeof b === 'string' ? parse(b) : b;
  if (!x || !y) throw new TypeError(`正しいバージョンではありません: ${!x ? a : b}`);
  for (const key of ['major', 'minor', 'patch']) {
    if (x[key] !== y[key]) return x[key] < y[key] ? -1 : 1;
  }
  return comparePrerelease(x.prerelease, y.prerelease);
}

function comparePrerelease(a, b) {
  // プレリリースの無い方が大きい（1.0.0-beta < 1.0.0）
  if (a.length === 0 || b.length === 0) return a.length === b.length ? 0 : a.length === 0 ? 1 : -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1; // 短い方が小さい（alpha < alpha.1）
    if (b[i] === undefined) return 1;
    if (a[i] === b[i]) continue;
    const an = typeof a[i] === 'number';
    const bn = typeof b[i] === 'number';
    if (an && bn) return a[i] < b[i] ? -1 : 1; // 数字どうしは数として比べる（2 < 10）
    if (an !== bn) return an ? -1 : 1; // 数字は文字より小さい
    return a[i] < b[i] ? -1 : 1; // 文字どうしは ASCII の順
  }
  return 0;
}

// ---- 範囲を比較の組に直す ------------------------------------------------

const PARTIAL = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?$/;

/** "1.2" や "1.x" を { major: 1, minor: 2, patch: null, pre: '' } にする（null は「省略・ワイルドカード」） */
function partial(text) {
  const m = text.match(PARTIAL);
  if (!m) throw new TypeError(`範囲の書き方が正しくありません: ${text}`);
  const num = (s) => (s === undefined || /^[xX*]$/.test(s) ? null : Number(s));
  let [major, minor, patch] = [num(m[1]), num(m[2]), num(m[3])];
  // "1.x.3" のように、ワイルドカードの後ろの数字は意味が無いので、ワイルドカードとして扱う
  if (major === null) minor = patch = null;
  if (minor === null) patch = null;
  return { major, minor, patch, pre: m[4] ? `-${m[4]}` : '' };
}

const v = (major, minor, patch, pre = '') => `${major}.${minor}.${patch}${pre}`;

/** 1つの「比較のかたまり」（"^1.2"、">=1.0.0"、"1.x" など）を、比較の配列にする */
function desugar(token) {
  const m = token.match(/^(\^|~|>=|<=|>|<|=)?\s*(.+)$/);
  const op = m[1] ?? '';
  const p = partial(m[2]);
  const { major, minor, patch, pre } = p;

  if (major === null) return op === '<' || op === '>' ? [['<', '0.0.0-0', true]] : []; // "*" は何でもよい（< * と > * は何も満たさない）

  if (op === '^') {
    // 一番左の 0 でない数字を変えない範囲
    const lo = ['>=', v(major, minor ?? 0, patch ?? 0, pre)];
    if (major > 0 || minor === null) return [lo, ['<', v(major + 1, 0, 0, '-0'), true]];
    if (minor > 0 || patch === null) return [lo, ['<', v(0, minor + 1, 0, '-0'), true]];
    return [lo, ['<', v(0, 0, patch + 1, '-0'), true]];
  }
  if (op === '~') {
    const lo = ['>=', v(major, minor ?? 0, patch ?? 0, pre)];
    if (minor === null) return [lo, ['<', v(major + 1, 0, 0, '-0'), true]];
    return [lo, ['<', v(major, minor + 1, 0, '-0'), true]];
  }

  // 省略のある比較（"1.2"、">1"、"<=1.x"）
  if (minor === null || patch === null) {
    const lo = minor === null ? v(major, 0, 0) : v(major, minor, 0);
    const next = minor === null ? v(major + 1, 0, 0, '-0') : v(major, minor + 1, 0, '-0');
    switch (op) {
      case '':
      case '=':
        return [['>=', lo], ['<', next, true]];
      case '>':
        return [['>=', next, true]];
      case '>=':
        return [['>=', lo]];
      case '<':
        return [['<', `${lo}-0`, true]];
      case '<=':
        return [['<', next, true]];
    }
  }
  return [[op || '=', v(major, minor, patch, pre)]];
}

/** "1.2.3 - 2.3" の形（ハイフンの範囲）を、普通の比較に直す */
function desugarHyphen(from, to) {
  const lo = partial(from);
  const hi = partial(to);
  const result = [['>=', v(lo.major ?? 0, lo.minor ?? 0, lo.patch ?? 0, lo.pre)]];
  if (hi.major === null) return result;
  if (hi.minor === null) result.push(['<', v(hi.major + 1, 0, 0, '-0'), true]);
  else if (hi.patch === null) result.push(['<', v(hi.major, hi.minor + 1, 0, '-0'), true]);
  else result.push(['<=', v(hi.major, hi.minor, hi.patch, hi.pre)]);
  return result;
}

/** 範囲の文字列を、組の配列（組 = 比較の配列）にする */
export function parseRange(range) {
  if (typeof range !== 'string') throw new TypeError('範囲は文字列で渡してください');
  return range.split('||').map((set) => {
    const text = set.trim().replace(/(\^|~|>=|<=|>|<|=)\s+/g, '$1'); // ">= 1.2.3" を ">=1.2.3" にする
    const hyphen = text.match(/^(\S+)\s+-\s+(\S+)$/);
    if (hyphen) return desugarHyphen(hyphen[1], hyphen[2]);
    return text === '' ? [] : text.split(/\s+/).flatMap(desugar);
  });
}

function test(version, [op, target]) {
  const c = compare(version, target);
  return { '<': c < 0, '<=': c <= 0, '>': c > 0, '>=': c >= 0, '=': c === 0 }[op];
}

/** version が range を満たすか */
export function satisfies(version, range) {
  const ver = parse(version);
  if (!ver) return false;
  return parseRange(range).some((set) => {
    if (!set.every((comparator) => test(ver, comparator))) return false;
    if (ver.prerelease.length === 0) return true;
    // プレリリースのバージョンは、同じ組の中に「同じ major.minor.patch のプレリリース」が書かれているときだけ満たす。
    // ^1.2.3 を書いた人が、勝手に 1.9.0-beta（不安定かもしれない）を入れられないようにするための決まり
    return set.some(([, target, generated]) => {
      if (generated) return false; // 範囲を直すときに自分で足した "-0" は数えない
      const t = parse(target);
      return (
        t.prerelease.length > 0 &&
        t.major === ver.major &&
        t.minor === ver.minor &&
        t.patch === ver.patch
      );
    });
  });
}

/** versions のうち、range を満たす一番新しいもの（無ければ null）。npm install が選ぶバージョン */
export function maxSatisfying(versions, range) {
  return versions.filter((ver) => satisfies(ver, range)).sort(compare).at(-1) ?? null;
}
