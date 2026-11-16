// 第42章 3.2節: setInterval を始める Effect と、止める後片付け。7節で useNow に取り出したもの
import { useState } from 'react';
import { useNow, useWindowWidth } from './hooks.ts';

function Ticker() {
  const now = useNow(1000);
  const width = useWindowWidth();
  return (
    <p>
      {now.toLocaleTimeString('ja-JP')}（ウィンドウの幅 {width}px）
    </p>
  );
}

export function Clock() {
  const [shown, setShown] = useState(true);
  return (
    <section>
      <h2>時計</h2>
      <label>
        <input type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} /> 時計を出す
      </label>
      {shown && <Ticker />}
    </section>
  );
}
