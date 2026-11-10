// 標準入力: パイプでつながれているか、人が端末で打っているか（第16章 4節）
// 使い方:
//   echo "りんご\nみかん" | node stdin-demo.mjs   （パイプ: 全部読んでから処理する）
//   node stdin-demo.mjs < stdin-demo.mjs           （ファイルから）
//   node stdin-demo.mjs                            （端末: 質問して答えを待つ）
import { createInterface } from 'node:readline/promises';

if (!process.stdin.isTTY) {
  // パイプやファイル: 終わりまで読む。チャンクは Buffer で届くので、集めてからまとめて文字列にする（第15章 6節）
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const lines = Buffer.concat(chunks).toString('utf8').split('\n').filter(Boolean);
  console.log(`標準入力から ${lines.length} 行を読んだ。最初の行: ${JSON.stringify(lines[0])}`);
} else {
  // 端末: 人に聞く。質問は標準エラー出力に出すと、標準出力をファイルにリダイレクトしても質問が見える
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const name = (await rl.question('名前は？ ')).trim();
  const answer = (await rl.question(`${name || '名無し'}さん、続けますか？ [y/N] `)).trim().toLowerCase();
  rl.close();
  console.log(answer === 'y' || answer === 'yes' ? '続けます' : 'やめます');
}
console.error(`stdin.isTTY: ${process.stdin.isTTY}, stdout.isTTY: ${process.stdout.isTTY}`);
