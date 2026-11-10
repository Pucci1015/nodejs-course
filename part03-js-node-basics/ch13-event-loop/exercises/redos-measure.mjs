// 練習問題6 用: isValidSlug に「a を n 個並べて、最後に ! を付けた文字列」を渡し、かかる時間を測る
// 使い方: node redos-measure.mjs                       （slug.mjs を測る）
//         node redos-measure.mjs ../solutions/slug.mjs （模範解答を測る）
// 1回が 2秒を超えたら、そこで止めます。
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, 'slug.mjs'));
const { isValidSlug } = await import(pathToFileURL(file).href);

for (let n = 16; n <= 100; n += 2) {
  const input = 'a'.repeat(n) + '!';
  const start = performance.now();
  const result = isValidSlug(input);
  const ms = performance.now() - start;
  console.log(`長さ ${String(input.length).padStart(3)}: ${ms.toFixed(1).padStart(8)}ms（結果 ${result}）`);
  if (ms > 2000) {
    console.log('2秒を超えたので止めます。この間、サーバなら他のリクエストに一切応えられません');
    break;
  }
}
