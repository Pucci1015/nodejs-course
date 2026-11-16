// 第45章 練習問題1の模範解答
export type ClassValue = string | false | null | undefined | Record<string, boolean | null | undefined>;

export function classNames(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue; // false・null・undefined・''
    if (typeof v === 'string') {
      out.push(...v.split(/\s+/).filter((s) => s !== ''));
    } else {
      for (const [name, on] of Object.entries(v)) if (on) out.push(name);
    }
  }
  // 同じ名前は1つにする（最初に出た順）
  return [...new Set(out)].join(' ');
}
