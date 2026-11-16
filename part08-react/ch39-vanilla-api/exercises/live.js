// 第39章 練習問題8: SSE のイベントを、タスクの一覧に当てる（本文7節）

/** 新しい配列を返す。元の配列は変えない */
export function applyEvent(tasks, type, task) {
  throw new Error('まだ書いていません');
}

/**
 * url の SSE につなぎ、イベントが来たら store の tasks に当てる。reset が来たら reload を呼ぶ
 * @returns {() => void} やめる関数
 */
export function connectLive(url, store, { reload, EventSourceImpl = EventSource }) {
  throw new Error('まだ書いていません');
}
