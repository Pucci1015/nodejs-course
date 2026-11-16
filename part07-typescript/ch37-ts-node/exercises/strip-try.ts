// 練習問題4: Node.js の型の除去では動かない書き方を3つ使ったファイル（README）
namespace Util {
  export const twice = (n: number): number => n * 2;
}

enum Size {
  S,
  M,
  L,
}

class Point {
  constructor(public x: number, public y: number) {}
}

const p = new Point(1, 2);
console.log(Util.twice(21), Size.M, Size[2], p.x + p.y);
