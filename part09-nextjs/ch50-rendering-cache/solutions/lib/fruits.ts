// 第50章 練習問題3で使う、くだものの一覧（このファイルは変えません）
export type Fruit = { name: string; label: string; color: string };

export const FRUITS: readonly Fruit[] = [
  { name: 'apple', label: 'りんご', color: '赤' },
  { name: 'banana', label: 'バナナ', color: '黄' },
  { name: 'cherry', label: 'さくらんぼ', color: '赤' },
];

export const findFruit = (name: string) => FRUITS.find((f) => f.name === name);
