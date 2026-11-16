// URL とページの対応表（第44章 2節）。テストが createMemoryRouter で使えるように、表だけを export する
import type { RouteObject } from 'react-router';
import { Layout } from './Layout.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { NewTaskPage } from './pages/NewTaskPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { TaskDetailPage } from './pages/TaskDetailPage.tsx';
import { TaskListPage } from './pages/TaskListPage.tsx';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <TaskListPage /> },
      { path: 'tasks/new', element: <NewTaskPage /> },
      { path: 'tasks/:id', element: <TaskDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
