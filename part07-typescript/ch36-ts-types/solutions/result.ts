// 練習問題7 の模範解答

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

export function parseLimit(text: string | undefined): Result<number> {
  if (text === undefined) return ok(20);
  // Number('') は 0 になってしまうので、空の文字列を先に除く
  const n = text.trim() === '' ? NaN : Number(text);
  if (!Number.isInteger(n)) return err('limit は整数です');
  if (n < 1 || n > 100) return err('limit は 1〜100 です');
  return ok(n);
}

export function parseDueDate(text: string): Result<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return err('締め切りは YYYY-MM-DD の形です');
  // Date は 2026-02-30 を 2026-03-02 に直してしまう。作った日付を文字列に戻して、同じかどうかで確かめる
  const d = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text) return err(`${text} という日はありません`);
  return ok(text);
}

export function parseNewTask(input: { title?: string; dueDate?: string }): Result<{ title: string; dueDate: string | null }, string[]> {
  const errors: string[] = [];
  const title = input.title?.trim() ?? '';
  if (title === '') errors.push('題名は必須です');
  else if (title.length > 100) errors.push('題名は100文字までです');

  let dueDate: string | null = null;
  if (input.dueDate !== undefined) {
    const r = parseDueDate(input.dueDate);
    if (r.ok) dueDate = r.value;
    else errors.push(r.error);
  }
  return errors.length > 0 ? err(errors) : ok({ title, dueDate });
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
