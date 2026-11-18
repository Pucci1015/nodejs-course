// URL とページの対応表（第44章 2節）。テストが createMemoryRouter で使えるように、表だけを export する
// ログインが要るページは RequireLogin の中に入れる
import type { RouteObject } from 'react-router';
import { Layout } from './Layout.tsx';
import { RequireAdmin } from './components/RequireAdmin.tsx';
import { RequireLogin } from './components/RequireLogin.tsx';
import { DayPage } from './pages/DayPage.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { MyBookingsPage } from './pages/MyBookingsPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.tsx';
import { RoomsAdminPage } from './pages/RoomsAdminPage.tsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.tsx';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      // ログインしていなくても開けるページ
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      // ログインが要るページ。path の無いルートは、URL を変えずに枠（element）だけを足す
      {
        element: <RequireLogin />,
        children: [
          { index: true, element: <DayPage /> },
          { path: 'mine', element: <MyBookingsPage /> },
          // 管理者だけのページ（第69章 6節）
          { element: <RequireAdmin />, children: [{ path: 'admin/rooms', element: <RoomsAdminPage /> }] },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
