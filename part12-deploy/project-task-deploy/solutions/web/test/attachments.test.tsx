// @vitest-environment jsdom
// 追加（第12部）: タスクの画面の添付ファイル。偽の API（fake-api.ts）で、名前で探して操作する
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createQueryClient } from '../src/queryClient.ts';
import { routes } from '../src/routes.tsx';
import { createFakeApi } from './fake-api.ts';

class FakeEventSource {
  addEventListener() {}
  close() {}
}
beforeEach(() => {
  vi.stubGlobal('EventSource', FakeEventSource);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** タスク 1 の画面を開く。applyAccept: false なら、accept に合わないファイルも選べる（サーバが断るのを確かめるため） */
async function openTask({ applyAccept = true }: { applyAccept?: boolean } = {}) {
  const api = createFakeApi([{ title: '現場を見る' }]);
  vi.stubGlobal('fetch', vi.fn(api.fetch));
  const router = createMemoryRouter(routes, { initialEntries: ['/tasks/1'] });
  render(
    <QueryClientProvider client={createQueryClient({ retry: false })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 2, name: '添付ファイル' });
  return { api, user: userEvent.setup({ applyAccept }) };
}

const png = (name: string) =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], name, { type: 'image/png' });

describe('添付ファイル（/tasks/:id）', () => {
  test('無ければ「添付ファイルはありません」。選ぶとファイルのまま送り、画像と名前と大きさを出して、知らせる', async () => {
    const { api, user } = await openTask();
    expect(await screen.findByText('添付ファイルはありません')).toBeTruthy();
    await user.upload(screen.getByLabelText('画像を添付'), png('現場.png'));

    const img = await screen.findByRole<HTMLImageElement>('img', { name: '現場.png' });
    expect(img.getAttribute('src')).toBe('/api/tasks/1/attachments/00000000-0000-4000-8000-000000000001/content');
    expect(screen.getByRole('link', { name: '現場.png' }).getAttribute('href')).toMatch(/\/content\?download=1$/);
    expect(screen.getByText(/（7 B）/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('「現場.png」を添付しました');

    const sent = api.calls.find((c) => c.method === 'POST');
    expect(sent?.path).toBe(`/api/tasks/1/attachments?name=${encodeURIComponent('現場.png')}`);
    expect(sent?.headers.get('Content-Type')).toBe('image/png');
  });

  test('画像でないものはサーバが断り（415）、理由を出す', async () => {
    const { user } = await openTask({ applyAccept: false });
    await screen.findByText('添付ファイルはありません');
    await user.upload(screen.getByLabelText('画像を添付'), new File(['hello'], 'memo.txt', { type: 'text/plain' }));
    expect((await screen.findByRole('alert')).textContent).toBe('PNG・JPEG・GIF・WebP の画像だけを受け付けます');
  });

  test('「〇〇 を消す」で消え、知らせる', async () => {
    const { api, user } = await openTask();
    await user.upload(screen.getByLabelText('画像を添付'), png('a.png'));
    await user.upload(screen.getByLabelText('画像を添付'), png('b.png'));
    const list = await screen.findByRole('list');
    await within(list).findByRole('img', { name: 'b.png' });

    await user.click(screen.getByRole('button', { name: 'a.png を消す' }));
    expect(await screen.findByText('「a.png」を消しました')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'a.png' })).toBeNull();
    expect(api.attachments.map((a) => a.fileName)).toEqual(['b.png']);
  });
});
