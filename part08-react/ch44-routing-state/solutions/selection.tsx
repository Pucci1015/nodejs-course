// 第44章 練習問題8の模範解答
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

type Action = { type: 'toggled'; id: number } | { type: 'all-selected'; ids: number[] } | { type: 'cleared' };

export function selectionReducer(selected: number[], action: Action): number[] {
  switch (action.type) {
    case 'toggled':
      return selected.includes(action.id) ? selected.filter((x) => x !== action.id) : [...selected, action.id];
    case 'all-selected':
      return [...new Set([...selected, ...action.ids])];
    case 'cleared':
      return selected.length === 0 ? selected : [];
  }
}

// 値と dispatch を別の Context にする。dispatch しか使わない部品は、選択が変わっても描き直されない
const SelectedContext = createContext<number[] | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }): ReactNode {
  const [selected, dispatch] = useReducer(selectionReducer, []);
  return (
    <SelectedContext value={selected}>
      <DispatchContext value={dispatch}>{children}</DispatchContext>
    </SelectedContext>
  );
}

export function useSelection() {
  const selected = useContext(SelectedContext);
  const dispatch = useContext(DispatchContext);
  if (selected === null || dispatch === null) throw new Error('useSelection は <SelectionProvider> の中で使ってください');
  return {
    selected,
    isSelected: (id: number) => selected.includes(id),
    toggle: (id: number) => dispatch({ type: 'toggled', id }),
    selectAll: (ids: number[]) => dispatch({ type: 'all-selected', ids }),
    clear: () => dispatch({ type: 'cleared' }),
  };
}

export function SelectableItem({ id, title }: { id: number; title: string }): ReactNode {
  const { isSelected, toggle } = useSelection();
  return (
    <li>
      <label>
        <input type="checkbox" checked={isSelected(id)} onChange={() => toggle(id)} />
        {title}
      </label>
    </li>
  );
}

export function SelectionBar({ allIds }: { allIds: number[] }): ReactNode {
  const { selected, selectAll, clear } = useSelection();
  return (
    <div>
      <button type="button" onClick={() => selectAll(allIds)}>すべて選ぶ</button>
      {selected.length > 0 && (
        <>
          <span role="status">{selected.length} 件選択中</span>
          <button type="button" onClick={clear}>選択を解除</button>
        </>
      )}
    </div>
  );
}
