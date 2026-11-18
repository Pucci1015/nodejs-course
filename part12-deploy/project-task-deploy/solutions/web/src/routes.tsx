// URL とページの対応表（第44章 2節）。テストが createMemoryRouter で使えるように、表だけを export する
// 変更（第10部）: ログイン・登録などのページを足し、タスクのページは RequireLogin（ログインが要る）の中に入れた
import type { RouteObject } from 'react-router';
import { Layout } from './Layout.tsx';
import { RequireLogin } from './components/RequireLogin.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { NewTaskPage } from './pages/NewTaskPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.tsx';
import { TaskDetailPage } from './pages/TaskDetailPage.tsx';
import { TaskListPage } from './pages/TaskListPage.tsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.tsx';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      // 追加（第10部）: ログインしていなくても開けるページ
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      // 変更（第10部）: ログインが要るページ。path の無いルートは、URL を変えずに枠（element）だけを足す
      {
        element: <RequireLogin />,
        children: [
          { index: true, element: <TaskListPage /> },
          { path: 'tasks/new', element: <NewTaskPage /> },
          { path: 'tasks/:id', element: <TaskDetailPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
