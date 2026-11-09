// 練習問題6 の模範解答: 成績の集計（3つのバグを修正済み。修正箇所に「修正」とコメント）
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
