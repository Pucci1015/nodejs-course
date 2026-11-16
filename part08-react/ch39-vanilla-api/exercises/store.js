// 第39章 練習問題7: 状態を1か所に置き、変わったら知らせる（本文4・8節）

/**
 * @template S
 * @param {S} initial
 */
export function createStore(initial) {
  return {
    getState() {
      throw new Error('まだ書いていません');
    },
    /** patch はオブジェクトか、(今の状態) => オブジェクト の関数。足し合わせた新しい状態にする */
    setState(patch) {
      throw new Error('まだ書いていません');
    },
    /** 変わったら listener(新しい状態) を呼ぶ。やめる関数を返す */
    subscribe(listener) {
      throw new Error('まだ書いていません');
    },
  };
}
