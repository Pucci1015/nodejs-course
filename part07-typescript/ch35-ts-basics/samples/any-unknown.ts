// 6節: any・unknown・as
const text = '{"id": 1, "title": "牛乳を買う"}';

// JSON.parse の戻り値は any。any は「型を確かめない」なので、何をしてもエラーにならない
const a = JSON.parse(text);
console.log(a.title.toUpperCase()); // たまたま動く
// console.log(a.titel.toUpperCase()); // tsc は何も言わないが、動かすと壊れる

// unknown は「何か分からない」。確かめるまで、何もさせてもらえない
const u: unknown = JSON.parse(text);
if (typeof u === 'object' && u !== null && 'title' in u && typeof u.title === 'string') {
  console.log(u.title.length); // 確かめた後なら使える
}

// as は「この型だと思って」と tsc に言うだけ。中身は確かめないので、うそをつける
const n = JSON.parse('"十"') as number;
console.log(n, typeof n); // number のはずが string
