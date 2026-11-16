// 第40章 練習問題6の模範解答: 型の付いた、要素を作る関数（第41章の JSX が、これを自動で書く）

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
  const el = document.createElement(tag);
  if (props?.className !== undefined) el.className = props.className;
  if (props?.id !== undefined) el.id = props.id;
  for (const [k, v] of Object.entries(props?.dataset ?? {})) el.dataset[k] = v;
  for (const [k, v] of Object.entries(props?.attrs ?? {})) el.setAttribute(k, v);
  if (props?.onClick) {
    const base: HTMLElement = el; // K のままだと addEventListener の型が決まらないので、HTMLElement として扱う
    base.addEventListener('click', props.onClick);
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c); // 文字は、文字として入る（textContent と同じ）
  }
  return el;
}

/** 要素を探す。無ければ Error */
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (el === null) throw new Error(`${selector} がありません`);
  return el;
}
