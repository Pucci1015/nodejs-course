// テストの部品: Dockerfile の文字列を、命令の行に分ける（書き換えなくてよいファイル）
// 「\」で続く行は1行につなぎ、# で始まる行と空の行は捨てる。練習問題5で、これより詳しいものを自分で書きます
export type Line = { keyword: string; args: string };

export function instructions(text: string): Line[] {
  const joined = text.replace(/\\\r?\n/g, ' ');
  return joined
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .map((l) => {
      const m = /^(\S+)\s*(.*)$/.exec(l);
      return { keyword: (m?.[1] ?? '').toUpperCase(), args: (m?.[2] ?? '').replace(/\s+/g, ' ').trim() };
    });
}
