// 練習問題8 の模範解答

export type Listener<P> = (payload: P) => void;

export type Emitter<Events> = {
  on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void;
  once<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void;
  emit<K extends keyof Events>(name: K, payload: Events[K]): number;
  listenerCount(name: keyof Events): number;
};

export function createEmitter<Events>(): Emitter<Events> {
  // イベントの名前ごとの「登録」の一覧。同じ関数を2回 on しても別々に消せるよう、関数ではなく登録（{ listener }）を入れる
  // { [K in keyof Events]?: … } は、Events の項目ごとに型を作る書き方（マップ型。本文5.2節）
  const registry: { [K in keyof Events]?: { listener: Listener<Events[K]> }[] } = {};

  function on<K extends keyof Events>(name: K, listener: Listener<Events[K]>): () => void {
    const entry = { listener };
    const list = registry[name] ?? [];
    registry[name] = [...list, entry]; // 新しい配列にする（emit の途中で変えても、emit が見ている配列は変わらない）
    return () => {
      registry[name] = (registry[name] ?? []).filter((e) => e !== entry);
    };
  }

  return {
    on,
    once(name, listener) {
      const off = on(name, (payload) => {
        off();
        listener(payload);
      });
      return off;
    },
    emit(name, payload) {
      const list = registry[name] ?? [];
      for (const { listener } of list) listener(payload);
      return list.length;
    },
    listenerCount(name) {
      return registry[name]?.length ?? 0;
    },
  };
}
