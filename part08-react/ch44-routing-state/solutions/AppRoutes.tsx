// 第44章 練習問題7の模範解答
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Home, Layout, NewTask, NotFound, TaskIndex, TaskPage } from '../exercises/pages.tsx';

export function AppRoutes(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="tasks">
          <Route index element={<TaskIndex />} />
          <Route path="new" element={<NewTask />} />
          <Route path=":id" element={<TaskPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
