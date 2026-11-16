// 1.3節: greet.ts を使う。最後の行は、わざとエラーを投げる（スタックトレースの行を見るため）
import { greet, type Lang } from './greet.ts';

const lang: Lang = 'en';
console.log(greet('alice'));
console.log(greet('bob', lang));
console.log(greet(''));
