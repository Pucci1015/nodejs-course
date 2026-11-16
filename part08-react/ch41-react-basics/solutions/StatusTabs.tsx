// 第41章 練習問題3の模範解答: 状態で絞り込むボタン。選ばれているものに aria-pressed="true"
import type { Status } from './types.ts';

export type Filter = 'all' | Status;

const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'todo', label: '未着手' },
  { value: 'doing', label: '作業中' },
  { value: 'done', label: '完了' },
];

export function StatusTabs({ value, onChange }: { value: Filter; onChange: (next: Filter) => void }) {
  return (
    <div>
      {TABS.map((tab) => (
        <button key={tab.value} type="button" aria-pressed={tab.value === value} onClick={() => onChange(tab.value)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
