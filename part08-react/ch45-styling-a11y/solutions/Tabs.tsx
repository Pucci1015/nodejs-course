// 第45章 練習問題8の模範解答
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type Tab = { label: string; content: ReactNode };

export function Tabs({ label, tabs }: { label: string; tabs: Tab[] }): ReactNode {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function select(i: number) {
    setSelected(i);
    refs.current[i]?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (selected === last ? 0 : selected + 1)
      : e.key === 'ArrowLeft' ? (selected === 0 ? last : selected - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(next);
  }

  return (
    <div>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === selected}
            aria-controls={`${id}-panel-${i}`}
            // 選ばれたタブだけを Tab キーで来られるようにする（ほかは矢印キーで移る）
            tabIndex={i === selected ? 0 : -1}
            onClick={() => select(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={i !== selected} tabIndex={0}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
