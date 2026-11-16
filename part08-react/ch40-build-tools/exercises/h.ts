// 第40章 練習問題6: 型の付いた、要素を作る関数（第41章の JSX が、これを自動で書く）

type Child = Node | string | number | null | undefined | false;

export type Props = {
  className?: string;
  id?: string;
  dataset?: Record<string, string>;
  attrs?: Record<string, string>;
  onClick?: (event: MouseEvent) => void;
};

/** h('li', { className: 'done' }, '題名') → <li class="done">題名</li>。tag から戻り値の型が決まる */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  throw new Error('まだ書いていません');
}

/** 要素を探す。無ければ Error */
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  throw new Error('まだ書いていません');
}
