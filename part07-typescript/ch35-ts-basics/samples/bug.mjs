// 0節: JavaScript のままだと、間違いに動かすまで気づけない
const task = { id: 1, title: '牛乳を買う', done: false };

function label(t) {
  return `${t.id}: ${t.titel}`; // titel は title の打ち間違い
}

function addDays(dateText, days) {
  const d = new Date(dateText);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

console.log(label(task));
console.log(addDays('2026-11-11', '3')); // 3 ではなく '3'（文字列）を渡した
