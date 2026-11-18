// 3.1節: hashPassword と verifyPassword を試す
import { hashPassword, verifyPassword } from './password.ts';

const stored = await hashPassword('neko-daisuki');
console.log(stored);
console.log(await hashPassword('neko-daisuki')); // もう1回。違う文字列になる
console.log('正しい:', await verifyPassword(stored, 'neko-daisuki'));
console.log('違う:  ', await verifyPassword(stored, 'neko-daisuki!'));
