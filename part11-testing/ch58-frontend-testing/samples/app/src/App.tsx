// 第58章: 画面の全体。QueryClient は、ここで1つ作る
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { TaskListPanel } from './TaskListPanel.tsx';
import './app.css';

export function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <h1>やること</h1>
        <TaskListPanel />
      </main>
    </QueryClientProvider>
  );
}
