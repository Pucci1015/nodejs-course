// 練習問題3の模範解答: テストが探せる（役割と名前のある）フィルタの部品
import { useId, type ReactNode } from 'react';

export type Filter = 'all' | 'open' | 'done';

export interface FilterTask {
  id: number;
  title: string;
  done: boolean;
}

interface Props {
  tasks: FilterTask[];
  filter: Filter;
  onChange: (filter: Filter) => void;
}

export function TaskFilter({ tasks, filter, onChange }: Props): ReactNode {
  // 追加: 同じ画面に2つ置いても、ラジオボタンの name がぶつからないように
  const name = useId();
  const doneCount = tasks.filter((t) => t.done).length;
  const options: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'すべて', count: tasks.length },
    { value: 'open', label: '未完了', count: tasks.length - doneCount },
    { value: 'done', label: '完了', count: doneCount },
  ];

  return (
    <div>
      {/* 追加: fieldset は role="group"、その名前は legend の文 */}
      <fieldset>
        <legend>表示するタスク</legend>
        {options.map((o) => (
          // 追加: label で包むと、ラジオボタンの名前が「すべて (3)」になる
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={filter === o.value} onChange={() => onChange(o.value)} />
            {o.label} ({o.count})
          </label>
        ))}
      </fieldset>
      {/* 追加: 中身が変わったことを読み上げてもらう */}
      <p role="status">{tasks.length === 0 ? 'タスクはありません' : `${tasks.length} 件中 ${doneCount} 件完了`}</p>
    </div>
  );
}
