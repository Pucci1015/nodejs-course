// 練習問題4 用（ES Modules 版）: 表示される行を、実行する前に予想してください
// 使い方: node cycle-esm/main.mjs   （exercises フォルダで）
console.log('main: 始まり');
import { a, getB } from './a.mjs';
console.log('main:', a, getB());
