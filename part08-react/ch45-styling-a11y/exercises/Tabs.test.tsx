// @vitest-environment jsdom
// 第45章 練習問題8のテスト: npx vitest run Tabs.test.tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
// 確かめるファイル。MODULE=../solutions/Tabs.tsx で模範解答に替えられる
const mod: typeof import('./Tabs.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './Tabs.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { Tabs } = mod;
const tabs = [
  { label: '未着手', content: <p>牛乳を買う</p> },
  { label: '作業中', content: <p>第8部を読む</p> },
  { label: '完了', content: <p>本を返す</p> },
];
const show = () =>
  render(
    <>
      <button type="button">前のボタン</button>
      <Tabs label="状態" tabs={tabs} />
      <button type="button">後ろのボタン</button>
    </>,
  );
const tab = (name: string) => screen.getByRole('tab', { name });
const selected = () => screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true').map((t) => t.textContent);
const visiblePanel = () => screen.getByRole('tabpanel');

test('名前の付いた tablist に tab が並び、最初のタブが選ばれている', () => {
  show();
  expect(screen.getByRole('tablist', { name: '状態' })).toBeTruthy();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['未着手', '作業中', '完了']);
  expect(selected()).toEqual(['未着手']);
  // 隠れたパネルは getByRole で見つからない（hidden）ので、見えているのは1つ
  expect(visiblePanel().textContent).toBe('牛乳を買う');
});

test('タブとパネルは、aria-controls と aria-labelledby で互いを指す', () => {
  show();
  const t = tab('未着手');
  const panel = visiblePanel();
  expect(t.getAttribute('aria-controls')).toBe(panel.id);
  expect(panel.getAttribute('aria-labelledby')).toBe(t.id);
  expect(screen.getByRole('tabpanel', { name: '未着手' })).toBe(panel);
});

test('押したタブが選ばれ、そのパネルだけが出る', async () => {
  show();
  await userEvent.click(tab('完了'));
  expect(selected()).toEqual(['完了']);
  expect(visiblePanel().textContent).toBe('本を返す');
});

test('Tab キーでは、選ばれたタブにだけ止まる', async () => {
  show();
  await userEvent.click(tab('作業中'));
  screen.getByRole('button', { name: '前のボタン' }).focus();
  await userEvent.tab();
  expect(document.activeElement).toBe(tab('作業中'));
  await userEvent.tab();
  // 次はタブではなく、パネル（中身を読めるように、パネルにも止まる）
  expect(document.activeElement).toBe(visiblePanel());
});

test('矢印キー・Home・End で、選ぶタブとフォーカスが移る（端では反対側へ回る）', async () => {
  show();
  tab('未着手').focus();
  await userEvent.keyboard('{ArrowRight}');
  expect(selected()).toEqual(['作業中']);
  expect(document.activeElement).toBe(tab('作業中'));
  await userEvent.keyboard('{End}');
  expect(selected()).toEqual(['完了']);
  await userEvent.keyboard('{ArrowRight}');
  expect(selected()).toEqual(['未着手']);
  await userEvent.keyboard('{ArrowLeft}');
  expect(selected()).toEqual(['完了']);
  await userEvent.keyboard('{Home}');
  expect(selected()).toEqual(['未着手']);
  expect(document.activeElement).toBe(tab('未着手'));
});
