// 練習問題3 の解答: バイトのチャンクを、1行ずつの文字列にする Transform
// 確かめ方: cd ../exercises && MODULE=../solutions/lines.mjs node --test lines.test.mjs
import { Transform } from 'node:stream';

export function createLineSplitter({ maxLineLength = 1024 * 1024 } = {}) {
  // TextDecoder の stream: true は、文字の途中で切れたバイトを、次のチャンクまで持っておいてくれる
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let rest = ''; // まだ改行が来ていない、行の途中

  return new Transform({
    readableObjectMode: true, // 出す側は「文字列1つ = 1行」。入れる側はバイトのまま
    transform(chunk, _encoding, callback) {
      let text;
      try {
        text = rest + decoder.decode(chunk, { stream: true });
      } catch (err) {
        return callback(new Error('UTF-8 として読めないバイトがあります', { cause: err }));
      }
      const lines = text.split('\n');
      rest = lines.pop(); // 最後の要素は、改行で終わっていない「行の途中」
      if (rest.length > maxLineLength) return callback(new RangeError(`1行が ${maxLineLength} 文字を超えました`));
      for (const line of lines) {
        if (line.length > maxLineLength) return callback(new RangeError(`1行が ${maxLineLength} 文字を超えました`));
        this.push(line.endsWith('\r') ? line.slice(0, -1) : line); // CRLF の \r も取る
      }
      callback();
    },
    flush(callback) {
      // 入力が終わった: 残りを出す。最後の行が改行で終わっていなくても、1行として出す
      try {
        rest += decoder.decode(); // 持っておいたバイトを吐き出す（途中で終わっていれば例外）
      } catch (err) {
        return callback(new Error('UTF-8 として読めないバイトがあります', { cause: err }));
      }
      if (rest !== '') this.push(rest.endsWith('\r') ? rest.slice(0, -1) : rest);
      callback();
    },
  });
}
