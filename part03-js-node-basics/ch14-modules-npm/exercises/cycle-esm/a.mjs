import { b, getA } from './b.mjs';
console.log('a: 評価中。b =', b, '/ getA() =', getA());
export const a = 'A の値';
export function getB() {
  return b;
}
