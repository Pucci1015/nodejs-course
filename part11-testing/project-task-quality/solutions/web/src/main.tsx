// 画面の入り口。キャッシュ・ルーター・StrictMode をつなぐ
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from './queryClient.ts';
import { routes } from './routes.tsx';
import './index.css';

// 変更（第10部）: キャッシュの作り方を queryClient.ts に移した（401 のときに「ログインしていない」にする。テストも同じものを使う）
const queryClient = createQueryClient();

const router = createBrowserRouter(routes);

const root = document.getElementById('root');
if (!root) throw new Error('#root がありません');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
