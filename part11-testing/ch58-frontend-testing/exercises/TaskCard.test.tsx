// @vitest-environment jsdom
// 練習問題1: TaskCard のテストを書く
// 使い方: npx vitest run TaskCard.test.tsx
//         node ../../tools/check-tests.ts TaskCard.test.tsx --vitest
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { CardTask } from './TaskCard.tsx';

// 確かめるファイル。MODULE=… で、ミュータントに替えられる（check-tests.ts が使う）
const { TaskCard }: typeof import('./TaskCard.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? './TaskCard.tsx', import.meta.url).pathname
);

afterEach(cleanup);

const TODAY = '2026-12-10';
/** テストのタスクを作る。変えたい所だけ渡す */
function card(overrides: Partial<CardTask> = {}): CardTask {
  return { id: 1, title: '牛乳を買う', done: false, dueDate: null, ...overrides };
}

describe('TaskCard', () => {
  test('題名がチェックボックスの名前になり、未完了ならチェックが無い', () => {
    render(<TaskCard task={card()} today={TODAY} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' });
    expect(checkbox.checked).toBe(false);
  });

  // ここを書く
});
