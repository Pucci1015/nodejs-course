// 第53章 練習問題2 の模範解答: DATA の後に送る文字列を作る（本文2節）

export function toSmtpData(message: string): string {
  // 改行を、すべて CRLF にそろえる（\r\n・\r・\n のどれで来ても）
  const lines = message.split(/\r\n|\r|\n/);
  // 最後が改行で終わっていると、split の最後に空の要素ができるので除く
  if (lines.at(-1) === '') lines.pop();
  // . で始まる行は、. をもう1つ足す（ドットの詰め物）。受け取る側が1つ取る
  const stuffed = lines.map((line) => (line.startsWith('.') ? `.${line}` : line));
  return `${stuffed.map((line) => `${line}\r\n`).join('')}.\r\n`;
}
