// 第43章 3.1節: TanStack Query の QueryClient を作り、アプリ全体に渡す
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    // 読んでから 10 秒は「新しい」とみなし、同じキーを使う画面が増えても読み直さない
    queries: { staleTime: 10_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
