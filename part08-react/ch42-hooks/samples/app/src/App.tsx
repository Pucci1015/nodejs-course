// 第42章 1節: 実験を切り替える画面。描画のたびに Console に出す
import { useState } from 'react';
import { Board } from './Board.tsx';
import { Clock } from './Clock.tsx';
import { SearchBox } from './SearchBox.tsx';
import { Snapshot } from './Snapshot.tsx';

const DEMOS = { snapshot: 'スナップショット', clock: '時計', search: '検索', board: 'タスク' } as const;
type Demo = keyof typeof DEMOS;

export function App() {
  const [demo, setDemo] = useState<Demo>('snapshot');
  console.log('App を描画', demo);

  return (
    <main>
      <h1>Hooks の実験</h1>
      <nav>
        {(Object.keys(DEMOS) as Demo[]).map((d) => (
          <button key={d} type="button" aria-pressed={d === demo} onClick={() => setDemo(d)}>
            {DEMOS[d]}
          </button>
        ))}
      </nav>
      {demo === 'snapshot' && <Snapshot />}
      {demo === 'clock' && <Clock />}
      {demo === 'search' && <SearchBox />}
      {demo === 'board' && <Board />}
    </main>
  );
}
