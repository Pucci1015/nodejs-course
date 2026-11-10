// 練習問題2: 4つの関数を完成させてください。要件は README と tasks.test.mjs にあります。
// 確かめ方: node --test tasks.test.mjs

/** 未完了のタスクのタイトルの配列 */
export function undoneTitles(tasks) {
  // ここを書く
}

/** minutes の合計。onlyDone が true なら、完了したものだけを足す */
export function totalMinutes(tasks, onlyDone = false) {
  // ここを書く
}

/** タグごとの数のオブジェクト。例: { 買い物: 2, 勉強: 2, 'Node.js': 1 } */
export function countByTag(tasks) {
  // ここを書く
}

/** minutes の短い順に並べた新しい配列。同じなら id の小さい順。tasks は変えない */
export function sortByMinutes(tasks) {
  // ここを書く
}
