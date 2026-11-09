// 問題6 解答例: Accept-Encoding を読んで、どの圧縮で返すかを決める
//
// negotiateEncoding('gzip, br;q=0.9', ['br', 'gzip']) → 'gzip'
// 返すもの: available のどれか / 'identity'（圧縮しない）/ null（どれも受け付けてもらえない → 406 にしてよい）

function parse(header) {
  const prefs = new Map();
  for (const part of header.split(',')) {
    const [rawName, ...params] = part.trim().split(';');
    const name = rawName.trim().toLowerCase();
    if (name === '') continue;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split('=');
      if (k.trim().toLowerCase() === 'q') {
        // q は 0〜1、小数点以下3桁まで（RFC 9110 12.4.2）。形が違えば、その項目は無視する
        if (!/^(0(\.\d{0,3})?|1(\.0{0,3})?)$/.test((v ?? '').trim())) q = NaN;
        else q = Number(v);
      }
    }
    if (Number.isNaN(q)) continue;
    prefs.set(name, q);
  }
  return prefs;
}

export function negotiateEncoding(header, available = ['br', 'gzip']) {
  if (header === undefined || header.trim() === '') return 'identity';
  const prefs = parse(header);
  const star = prefs.get('*');
  const qOf = (enc) => prefs.get(enc) ?? star ?? 0;

  let best = null;
  let bestQ = 0;
  for (const enc of available) {
    const q = qOf(enc);
    if (q > bestQ) { // 同じ q なら、available で前にあるもの（サーバが好きな方）
      best = enc;
      bestQ = q;
    }
  }
  if (best) return best;
  // identity は、はっきり断られない限り受け付けてもらえる
  const identityQ = prefs.get('identity') ?? (star !== undefined ? star : 1);
  return identityQ > 0 ? 'identity' : null;
}
