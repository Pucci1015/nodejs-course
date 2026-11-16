// 第48章 2・3節: / のページ（Server Component）。Client Component（Counter・Collapsible）を中に置く
import { Collapsible } from '../components/Collapsible.tsx';
import { Counter } from '../components/Counter.tsx';

export default function HomePage() {
  console.log('HomePage を描きました'); // サーバのターミナルにだけ出る
  return (
    <>
      <h1>タスク管理</h1>
      <Counter />
      <Collapsible title="この画面のしくみ">
        {/* この <p> は、サーバで作られて、Collapsible の children として渡る */}
        <p>この文は、サーバで作りました。開け閉めのボタンだけが、ブラウザで動きます。</p>
      </Collapsible>
    </>
  );
}
