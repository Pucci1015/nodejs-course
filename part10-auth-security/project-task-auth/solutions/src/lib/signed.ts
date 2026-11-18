// 第22章 練習問題6の模範解答（part05-express/lib/signed.mjs）のコピー。そのまま使う
// 変更（第7部）: TypeScript にした
// HMAC の署名。ここでは、ページのカーソルを作り変えられないようにするために使う
import crypto from 'node:crypto';

const MIN_SECRET = 32; // 追加: 短い鍵は、総当たりで見つけられやすい

/** 鍵1つか、鍵の配列（最初がいまの鍵、残りは前の鍵） */
export type Secrets = string | readonly string[];

function checkSecret(secret: unknown): asserts secret is string {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET) throw new TypeError(`鍵は ${MIN_SECRET} 文字以上の文字列にしてください`);
}

// 修正: 「値 + 鍵」の SHA-256 ではなく、HMAC を使う（鍵付きのハッシュのための、決まった作り方）
const mac = (value: string, secret: string) => crypto.createHmac('sha256', secret).update(value).digest('base64url');

const listOf = (secrets: Secrets): readonly string[] => (typeof secrets === 'string' ? [secrets] : secrets);

export function sign(value: string, secrets: Secrets): string {
  const [current] = listOf(secrets); // 追加: 鍵の配列なら、最初（いまの鍵）で署名する
  checkSecret(current);
  return `${value}.${mac(value, current)}`;
}

export function unsign(signed: unknown, secrets: Secrets): string | null {
  const list = listOf(secrets);
  list.forEach((s) => checkSecret(s));
  if (typeof signed !== 'string') return null;
  const i = signed.lastIndexOf('.'); // 修正: 値の中に . があってもよいように、最後の . で分ける
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const given = Buffer.from(signed.slice(i + 1));
  // 追加: 前の鍵でも確かめる（鍵を取り替えた直後に、前の鍵で署名した Cookie を持っている人のため）
  for (const secret of list) {
    const expected = Buffer.from(mac(value, secret));
    // 修正: === ではなく timingSafeEqual。長さが違うと例外なので、先に比べる
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return value;
  }
  return null;
}

export function signJson(data: unknown, secrets: Secrets, { now = Date.now }: { now?: () => number } = {}): string {
  // 追加: 作った時刻（iat）を入れておき、確かめるときに古すぎないかを見る
  const payload = Buffer.from(JSON.stringify({ d: data, iat: now() })).toString('base64url');
  return sign(payload, secrets);
}

/** 署名を確かめて、中のデータを返す。だめなら null。中のデータは、作った人しか作れないが、形は呼んだ側が確かめる（unknown） */
export function unsignJson(token: unknown, secrets: Secrets, { maxAgeMs, now = Date.now }: { maxAgeMs?: number; now?: () => number } = {}): unknown {
  const payload = unsign(token, secrets);
  if (payload === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  // 変更（第7部）: parsed は unknown。形を確かめてから読む（第36章 1節）
  if (typeof parsed !== 'object' || parsed === null || !('iat' in parsed) || typeof parsed.iat !== 'number') return null;
  if (maxAgeMs !== undefined && now() - parsed.iat > maxAgeMs) return null; // 追加: 古すぎる
  return 'd' in parsed ? parsed.d : null;
}
