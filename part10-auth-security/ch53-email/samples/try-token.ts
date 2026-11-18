// 4.1節: token.ts を試す。時計は自分で進める
import { createTokenStore, hashToken } from './token.ts';

let t = 0;
const store = createTokenStore({ now: () => t });

const token = store.issue(1, 'verify', 24 * 60 * 60 * 1000); // 24時間
console.log('メールに入れる値:', token);
console.log('保存する値:     ', hashToken(token));

console.log('reset として使う:', store.consume(token, 'reset'));
console.log('verify として使う:', store.consume(token, 'verify'));
console.log('もう1回使う:     ', store.consume(token, 'verify'));

const later = store.issue(2, 'reset', 30 * 60 * 1000); // 30分
t += 31 * 60 * 1000;
console.log('31分後に使う:    ', store.consume(later, 'reset'));
