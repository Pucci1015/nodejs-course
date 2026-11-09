import { getB } from './a.mjs';
console.log('b: 評価中。getB は', typeof getB);
export const b = 'B の値';
export function getA() {
  try {
    return a; // ← a はまだ…？
  } catch (err) {
    return `${err.constructor.name}: ${err.message}`;
  }
}
import { a } from './a.mjs'; // import はファイルのどこに書いても、先頭に書いたのと同じ
