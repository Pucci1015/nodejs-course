// 練習問題8（発展）: イベントの名前と、渡す値の型を結び付けた「型の付いたイベントエミッタ」を書いてください。
// 要件は README にあります。as と any は使いません。
// 確かめ方: node --test emitter.test.ts

export type Listener<P> = (payload: P) => void;

export type Emitter<Events> = {
  // ここに on・once・emit・listenerCount の型を書く
};

export function createEmitter<Events>(): Emitter<Events> {
  throw new Error('まだ書いていません');
}
