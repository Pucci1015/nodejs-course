// 色を付けるのは、端末に出すときだけ（第16章 5節）
// 使い方:
//   node color-demo.mjs                 （端末: 色が付く）
//   node color-demo.mjs | cat           （パイプ: 色が付かない）
//   NO_COLOR=1 node color-demo.mjs      （NO_COLOR: 色が付かない）
//   FORCE_COLOR=1 node color-demo.mjs | cat   （FORCE_COLOR: パイプでも色を付ける）
import { styleText } from 'node:util';

// styleText は、既定で「出力先が端末か」と NO_COLOR・FORCE_COLOR を見て、色を付けるか決める
console.log(styleText('green', '✔ 成功'), styleText(['bold', 'red'], '✘ 失敗'), styleText('dim', '（補足）'));

// 自分で判断するなら
const useColor = process.stdout.hasColors?.() ?? false; // 端末で、色が使えるか
console.log('stdout.isTTY   :', process.stdout.isTTY ?? false);
console.log('hasColors()    :', useColor);
console.log('NO_COLOR       :', process.env.NO_COLOR ?? '（未設定）');
console.log('端末の幅（columns）:', process.stdout.columns ?? '（端末ではない）');

// 色の付いた文字列には、目に見えない制御文字が入っている
const red = styleText('red', 'abc', { validateStream: false }); // validateStream: false で、いつも色を付ける
console.log('色付きの "abc" の length:', red.length, JSON.stringify(red));
