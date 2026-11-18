// 第65章 練習問題2: Cache-Control を分ける（"…" の中のカンマにも対応）と、CDN が覚えてよい秒数（本文 2節）

/** "…" の外にあるカンマで分ける */
function splitOutsideQuotes(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  for (const ch of value) {
    if (ch === '"') inQuote = !inQuote;
    if (ch === ',' && !inQuote) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/** Cache-Control の値を、名前（小文字）→ 値（無ければ ''）の Map にする */
export function parseCacheControl(value: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of splitOutsideQuotes(value ?? '')) {
    const eq = part.indexOf('='); // 値の中の = で切らないように、最初の = だけで分ける
    const name = (eq === -1 ? part : part.slice(0, eq)).trim().toLowerCase();
    let arg = eq === -1 ? '' : part.slice(eq + 1).trim();
    if (arg.length >= 2 && arg.startsWith('"') && arg.endsWith('"')) arg = arg.slice(1, -1);
    if (name === '' || out.has(name)) continue; // 空と、2 回目は使わない
    out.set(name, arg);
  }
  return out;
}

function seconds(cc: Map<string, string>, name: string): number | undefined {
  const v = cc.get(name);
  return v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined;
}

/** 共有キャッシュ（CDN）が新鮮とみなしてよい秒数。覚えてはいけないなら undefined */
export function sharedLifetime(value: string | undefined): number | undefined {
  const cc = parseCacheControl(value);
  if (cc.has('no-store') || cc.has('private')) return undefined;
  if (cc.has('no-cache')) return 0;
  return seconds(cc, 's-maxage') ?? seconds(cc, 'max-age');
}
