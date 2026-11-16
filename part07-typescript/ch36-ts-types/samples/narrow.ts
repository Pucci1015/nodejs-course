// 1節: 絞り込み。if で確かめると、その中では型が細かくなる
function show(value: string | number | string[] | null): string {
  if (value === null) return '（なし）'; // ここから下では、value は null ではない
  if (typeof value === 'string') return `文字列 ${value.toUpperCase()}`;
  if (typeof value === 'number') return `数 ${value.toFixed(1)}`;
  // 残りは string[] だけ
  return `配列 ${value.join('・')}`;
}

console.log(show('todo'));
console.log(show(3));
console.log(show(['家', '急ぎ']));
console.log(show(null));

// in: その項目があるかどうかで絞り込む
type Cat = { name: string; meow: () => string };
type Dog = { name: string; bark: () => string };

function speak(animal: Cat | Dog): string {
  if ('meow' in animal) return animal.meow(); // ここでは Cat
  return animal.bark(); // ここでは Dog
}
console.log(speak({ name: 'たま', meow: () => 'にゃー' }));

// instanceof: クラスで作ったものかどうか
function toText(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
console.log(toText(new Date('2026-11-11T00:00:00Z')), toText('2026-11-12'));
