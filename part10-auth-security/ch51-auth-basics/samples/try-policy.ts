// 4.1節: checkPassword を試す
import { checkPassword } from './policy.ts';

console.log(checkPassword('password1234', 'alice@example.com'));
console.log(checkPassword('ＰＡＳＳＷＯＲＤ１２３４', 'alice@example.com'));
console.log(checkPassword('alice-no-pass', 'alice@example.com'));
console.log(checkPassword('neko-to-inu-to-tori', 'alice@example.com'));
