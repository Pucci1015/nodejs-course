// 練習問題4: 1〜6 の行のうち、tsc がエラーにするのはどれでしょう。予想してから確かめます（README）
type User = { name: string; age?: number };
const users: User[] = [{ name: 'alice', age: 20 }, { name: 'bob' }];

const a = users[0].name; // 1
const b: number = users[1]?.age ?? 0; // 2
const c = users.map((u) => u.age * 2); // 3
const d: string[] = users.map((u) => u.name); // 4
let e = 'alice'; // 5
e = 20;
const f = JSON.parse('{"name": 1}').name.toUpperCase(); // 6

console.log(a, b, c, d, e, f);
