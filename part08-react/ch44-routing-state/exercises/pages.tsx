// 第44章 練習問題7で使うページ（書き換えなくてよい）
import { Link, Outlet, useParams } from 'react-router';

export function Layout() {
  return (
    <>
      <nav>
        <Link to="/">ホーム</Link> <Link to="/tasks">タスク</Link> <Link to="/tasks/new">新しいタスク</Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
export const Home = () => <h1>ホーム</h1>;
export const TaskIndex = () => <h1>タスクの一覧</h1>;
export const NewTask = () => <h1>新しいタスク</h1>;
export function TaskPage() {
  const { id } = useParams();
  return <h1>タスク {id}</h1>;
}
export const NotFound = () => <h1>ページが見つかりません</h1>;
