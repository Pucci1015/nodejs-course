// 練習問題6: 成績の集計（バグが3つあります）
// 使い方: node bug-grades.mjs
//
// 期待する出力:
//   1位 bob 94.3
//   2位 dave 91.7
//   3位 alice 82.3
//   4位 carol 70.0
//   5位 eve 57.7
//   合格者（平均70点以上）: bob, dave, alice, carol（4人）

const students = [
  { name: 'alice', scores: [80, 92, 75] },
  { name: 'bob', scores: [100, 88, 95] },
  { name: 'carol', scores: [65, 70, 75] },
  { name: 'dave', scores: [90, 85, 100] },
  { name: 'eve', scores: [55, 60, 58] },
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
