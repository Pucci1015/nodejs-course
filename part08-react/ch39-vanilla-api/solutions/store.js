// 第39章 練習問題7の模範解答: 状態を1か所に置き、変わったら知らせる

/**
 * @template S
 * @param {S} initial
 */
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    /** patch はオブジェクトか、(今の状態) => オブジェクト の関数。足し合わせた新しい状態にする */
    setState(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      const changed = Object.keys(p).some((k) => !Object.is(state[k], p[k]));
      if (!changed) return; // 何も変わらないなら、知らせない
      state = { ...state, ...p };
      for (const fn of [...listeners]) fn(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
