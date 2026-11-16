// 1節: 型は実行時には無い。as で言い切った型は、だれも確かめない
type Task = { id: number; title: string; tags: string[] };

// 外から来た JSON（ファイル・リクエストのボディ・ほかの API の応答）だと思ってください
const text = '{"id": "7", "title": "牛乳を買う"}';

const task = JSON.parse(text) as Task; // tsc は信じる。Node.js は型を消すだけ

console.log(task.id + 1); // number のつもりが、文字列の "7" + 1
console.log(task.title.toUpperCase());
console.log(task.tags.length); // tags は無い。ここで TypeError
