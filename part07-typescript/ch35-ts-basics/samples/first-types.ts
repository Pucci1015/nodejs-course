// 2節: 基本の型と推論。型を書かなくても、最初の値から型が決まる
const title = '牛乳を買う'; // string
let done = false; // boolean
const tags = ['買い物', '急ぎ']; // string[]（string の配列）
const scores: number[] = []; // 空の配列は、中身の型が分からないので書く
const task = { id: 1, title, done }; // { id: number; title: string; done: boolean }

done = true; // boolean に boolean を入れるのは OK
tags.push('家');
scores.push(80);

console.log(title, done, tags, scores, task);
console.log(typeof title, typeof done, Array.isArray(tags));
