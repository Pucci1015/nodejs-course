// @vitest-environment jsdom
// 第41章 練習問題1のテスト: npx vitest run TaskCard.test.tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import type { Task } from './types.ts';
// 確かめるファイル。MODULE=../solutions/TaskCard.tsx で模範解答に替えられる
const mod: typeof import('./TaskCard.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './TaskCard.tsx', import.meta.url).pathname);
afterEach(cleanup);
const t = (id: number, title: string, status: Task['status'] = 'todo', dueDate: string | null = null): Task => ({ id, title, status, dueDate });
void within; void userEvent; void screen;
const { TaskCard } = mod;
const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>);

test('<li> に題名（span.title）と状態のバッジ', () => {
  const { container } = inList(<TaskCard task={t(1, '牛乳を買う', 'doing')} />);
  const li = container.querySelector('li');
  expect(li?.querySelector('span.title')?.textContent).toBe('牛乳を買う');
  expect(li?.querySelector('span.badge')?.textContent).toBe('作業中');
  expect(li?.dataset.status).toBe('doing');
});

test('バッジの文: todo は未着手、done は完了', () => {
  const { container } = inList(
    <>
      <TaskCard task={t(1, 'A', 'todo')} />
      <TaskCard task={t(2, 'B', 'done')} />
    </>,
  );
  expect([...container.querySelectorAll('.badge')].map((b) => b.textContent)).toEqual(['未着手', '完了']);
});

test('締め切りがあれば <small> に「締め切り: 日付」、無ければ <small> は無い', () => {
  const { container } = inList(
    <>
      <TaskCard task={t(1, 'A', 'todo', '2026-11-20')} />
      <TaskCard task={t(2, 'B')} />
    </>,
  );
  const [a, b] = container.querySelectorAll('li');
  expect(a?.querySelector('small')?.textContent?.trim()).toBe('締め切り: 2026-11-20');
  expect(b?.querySelector('small')).toBeNull();
});

test('class は task。done なら task done', () => {
  const { container } = inList(
    <>
      <TaskCard task={t(1, 'A')} />
      <TaskCard task={t(2, 'B', 'done')} />
    </>,
  );
  expect([...container.querySelectorAll('li')].map((li) => li.className)).toEqual(['task', 'task done']);
});

test('題名は文字として出る（HTML として読まれない）', () => {
  const { container } = inList(<TaskCard task={t(1, '<b>太字</b>')} />);
  expect(container.querySelector('b')).toBeNull();
  expect(container.querySelector('.title')?.textContent).toBe('<b>太字</b>');
});
