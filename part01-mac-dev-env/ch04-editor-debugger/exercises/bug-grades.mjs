// 練習問題6: 成績の集計（バグが3つあります）
// 使い方: node bug-grades.mjs
//
// 期待する出力:
//   1位 鈴木 94.3
//   2位 田中 91.7
//   3位 佐藤 82.3
//   4位 高橋 70.0
//   5位 伊藤 57.7
//   合格者（平均70点以上）: 鈴木, 田中, 佐藤, 高橋（4人）

const students = [
  { name: '佐藤', scores: [80, 92, 75] },
  { name: '鈴木', scores: [100, 88, 95] },
  { name: '高橋', scores: [65, 70, 75] },
  { name: '田中', scores: [90, 85, 100] },
  { name: '伊藤', scores: [55, 60, 58] },
];

function average(scores) {
  let sum = 0;
  for (let i = 1; i < scores.length; i++) {
    sum += scores[i];
  }
  return sum / scores.length;
}

function rank(results) {
  return [...results].sort((a, b) => a.avg < b.avg);
}

const results = students.map((s) => ({ name: s.name, avg: average(s.scores) }));
const ranked = rank(results);

ranked.forEach((r, i) => {
  console.log(`${i + 1}位 ${r.name} ${r.avg.toFixed(1)}`);
});

const passed = ranked.filter((r) => r.avg > 70);
console.log(`合格者（平均70点以上）: ${passed.map((r) => r.name).join(', ')}（${passed.length}人）`);
