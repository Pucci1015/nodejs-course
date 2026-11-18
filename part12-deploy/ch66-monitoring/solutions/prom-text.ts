// 第66章 練習問題3: カウンタを、Prometheus の文字の形にする（ラベルの値のエスケープ）（本文 3.2節）

export type Sample = { labels: Record<string, string>; value: number };

const NAME = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
const LABEL = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** ラベルの値の中の \ と " と改行を、\\ と \" と \n にする（\ を最初に） */
function escapeValue(v: string): string {
  return v.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

export function formatCounter(name: string, help: string, samples: Sample[]): string {
  if (!NAME.test(name)) throw new Error(`name が正しくありません: ${name}`);
  const lines = [`# HELP ${name} ${help.replaceAll('\\', '\\\\').replaceAll('\n', '\\n')}`, `# TYPE ${name} counter`];
  for (const { labels, value } of samples) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(labels).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      if (!LABEL.test(k) || k.startsWith('__')) throw new Error(`ラベルの名前が正しくありません: ${k}`);
      parts.push(`${k}="${escapeValue(v)}"`);
    }
    if (!Number.isFinite(value) || value < 0) throw new Error(`value はカウンタなので 0 以上の数です: ${value}`);
    lines.push(`${name}${parts.length ? `{${parts.join(',')}}` : ''} ${value}`);
  }
  return lines.join('\n') + '\n';
}
