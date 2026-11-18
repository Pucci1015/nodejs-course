// @vitest-environment jsdom
// 練習問題2: EditTitleForm のテストを書く（user-event で、人と同じように打って押す）
// 使い方: npx vitest run EditTitleForm.test.tsx
//         node ../../tools/check-tests.ts EditTitleForm.test.tsx --vitest
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

const { EditTitleForm }: typeof import('./EditTitleForm.tsx') = await import(
  /* @vite-ignore */ new URL(process.env.MODULE ?? './EditTitleForm.tsx', import.meta.url).pathname
);

afterEach(cleanup);

/** 後で解決する・失敗させる Promise（保存している途中の様子を見るため。本文4.3節） */
function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('EditTitleForm', () => {
  test('最初は、今の題名が入っている', () => {
    render(<EditTitleForm initialTitle="牛乳を買う" onSave={vi.fn(async () => {})} onCancel={vi.fn()} />);

    expect(screen.getByRole<HTMLInputElement>('textbox', { name: '題名' }).value).toBe('牛乳を買う');
  });

  // ここを書く
});
