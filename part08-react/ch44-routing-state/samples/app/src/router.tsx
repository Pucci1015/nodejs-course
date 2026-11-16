// 第44章 2節: URL とページの対応表
import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { NewTaskPage } from './pages/NewTaskPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { TaskDetailPage } from './pages/TaskDetailPage.tsx';
import { TaskListPage } from './pages/TaskListPage.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    // 子のルートのページは、Layout の <Outlet /> の場所に出る
    children: [
      { index: true, element: <TaskListPage /> }, // / そのもの
      { path: 'tasks/new', element: <NewTaskPage /> },
      { path: 'tasks/:id', element: <TaskDetailPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> }, // どれにも合わなかったとき
    ],
  },
]);
