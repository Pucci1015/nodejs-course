// @vitest-environment jsdom
// 第44章 練習問題6のテスト: npx vitest run theme.test.tsx
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
// 確かめるファイル。MODULE=../solutions/theme.tsx で模範解答に替えられる
const mod: typeof import('./theme.tsx') = await import(/* @vite-ignore */ new URL(process.env.MODULE ?? './theme.tsx', import.meta.url).pathname);
afterEach(cleanup);
const { ThemeProvider, useTheme, ThemeToggle } = mod;

function Shown() {
  return <p>今は {useTheme().theme}</p>;
}

test('決まりは light。initial で変えられる', () => {
  render(
    <ThemeProvider>
      <Shown />
    </ThemeProvider>,
  );
  expect(screen.getByText(/今は/).textContent).toBe('今は light');
  cleanup();
  render(
    <ThemeProvider initial="dark">
      <Shown />
    </ThemeProvider>,
  );
  expect(screen.getByText(/今は/).textContent).toBe('今は dark');
});

test('ThemeToggle で切り替わり、同じ Provider の中の部品が全部変わる', async () => {
  render(
    <ThemeProvider>
      <header>
        <ThemeToggle />
      </header>
      <section>
        <div>
          <Shown />
        </div>
      </section>
    </ThemeProvider>,
  );
  const button = screen.getByRole('button', { name: '暗い色' });
  expect(button.getAttribute('aria-pressed')).toBe('false');
  await userEvent.click(button);
  expect(screen.getByText(/今は/).textContent).toBe('今は dark');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  await userEvent.click(button);
  expect(screen.getByText(/今は/).textContent).toBe('今は light');
});

test('Provider が2つあれば、それぞれ別の値', async () => {
  render(
    <>
      <ThemeProvider>
        <ThemeToggle />
        <Shown />
      </ThemeProvider>
      <ThemeProvider>
        <Shown />
      </ThemeProvider>
    </>,
  );
  await userEvent.click(screen.getByRole('button', { name: '暗い色' }));
  expect(screen.getAllByText(/今は/).map((p) => p.textContent)).toEqual(['今は dark', '今は light']);
});

test('Provider の外で useTheme を使うと、分かりやすい文の例外', () => {
  // React が Console に出すエラーを、テストの間だけ黙らせる
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useTheme())).toThrow('useTheme は <ThemeProvider> の中で使ってください');
  spy.mockRestore();
});
