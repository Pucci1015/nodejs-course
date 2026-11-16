// 第42章 8節: useReducer で、タスクの配列の変え方を1か所にまとめる。4節: 残りの数は state にしない
import { useReducer, useState } from 'react';
import { tasksReducer, type Task } from './tasksReducer.ts';

const initialTasks: Task[] = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '本を返す', done: true },
];

export function Board() {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
  const [title, setTitle] = useState('');
  // 4節: tasks から計算できる値は、state にせず、描画のたびに計算する
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <section>
      <h2>タスク（残り {remaining} 件）</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim() === '') return;
          dispatch({ type: 'added', title: title.trim() });
          setTitle('');
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="題名" />
        <button>追加</button>
      </form>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'toggled', id: t.id })} /> {t.title}
            </label>{' '}
            <button type="button" onClick={() => dispatch({ type: 'deleted', id: t.id })}>削除</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
