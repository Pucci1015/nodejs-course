// URL とページの対応表（第44章 2節）。テストが createMemoryRouter で使えるように、表だけを export する
// ログインが要るページは RequireLogin の中に入れる
import type { RouteObject } from 'react-router';
import { Layout } from './Layout.tsx';
import { RequireLogin } from './components/RequireLogin.tsx';
import { ErrorPage } from './pages/ErrorPage.tsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.tsx';
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
        children: [{ index: true, element: <HomePage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
