// 第42章 練習問題7の模範解答
import { useReducer, useState, type ReactNode } from 'react';

export type Task = { id: number; title: string; done: boolean };
export type Filter = 'all' | 'active' | 'done';
export type State = { tasks: Task[]; filter: Filter };
export type Action =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'renamed'; id: number; title: string }
  | { type: 'deleted'; id: number }
  | { type: 'cleared-done' }
  | { type: 'filter-changed'; filter: Filter };

export const initialState: State = { tasks: [], filter: 'all' };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'added': {
      const title = action.title.trim();
      if (title === '') return state;
      const id = Math.max(0, ...state.tasks.map((t) => t.id)) + 1;
      return { ...state, tasks: [...state.tasks, { id, title, done: false }] };
    }
    case 'toggled':
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    case 'renamed': {
      const title = action.title.trim();
      if (title === '') return state;
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, title } : t)) };
    }
    case 'deleted':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'cleared-done':
      return { ...state, tasks: state.tasks.filter((t) => !t.done) };
    case 'filter-changed':
      return { ...state, filter: action.filter };
  }
}

const FILTERS: Record<Filter, string> = { all: 'すべて', active: '未完了', done: '完了' };

export function TaskApp(): ReactNode {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [title, setTitle] = useState('');
  const shown = state.tasks.filter((t) => (state.filter === 'all' ? true : state.filter === 'done' ? t.done : !t.done));

  return (
    <section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: 'added', title });
          setTitle('');
        }}
      >
        <input aria-label="題名" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button>追加</button>
      </form>
      <div>
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={state.filter === f} onClick={() => dispatch({ type: 'filter-changed', filter: f })}>
            {FILTERS[f]}
          </button>
        ))}
      </div>
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'toggled', id: t.id })} />
              {t.title}
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => dispatch({ type: 'cleared-done' })}>完了を消す</button>
    </section>
  );
}
