// 2.1節: パスワードを SHA-256 にするだけでは足りないことを確かめる
import { createHash } from 'node:crypto';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

// 同じパスワードは、だれのものでも同じ値になる
console.log('alice:', sha256('neko-daisuki'));
console.log('bob:  ', sha256('neko-daisuki'));

// 1秒間に、何回計算できるか
let count = 0;
const end = Date.now() + 1000;
while (Date.now() < end) {
  sha256(`password${count}`);
  count++;
}
console.log(`1秒で ${count.toLocaleString()} 回`);
