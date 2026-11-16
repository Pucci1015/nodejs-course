// 練習問題6 の模範解答: 成績の集計（3つのバグを修正済み。修正箇所に「修正」とコメント）
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
  // 修正1: i を 0 から始める（1 からだと最初の点数が足されない）
  for (let i = 0; i < scores.length; i++) {
    sum += scores[i];
  }
  return sum / scores.length;
}

function rank(results) {
  // 修正2: 比較関数は true/false ではなく「負の数・0・正の数」を返す。
  // b.avg - a.avg なら、b の方が大きいとき正の数になり、b が前に来る（降順）
  return [...results].sort((a, b) => b.avg - a.avg);
}

const results = students.map((s) => ({ name: s.name, avg: average(s.scores) }));
const ranked = rank(results);

ranked.forEach((r, i) => {
  console.log(`${i + 1}位 ${r.name} ${r.avg.toFixed(1)}`);
});

// 修正3: 「70点以上」は >= 70（> 70 だと、ちょうど 70 点の人が外れる）
const passed = ranked.filter((r) => r.avg >= 70);
console.log(`合格者（平均70点以上）: ${passed.map((r) => r.name).join(', ')}（${passed.length}人）`);
