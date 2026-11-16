// 第42章 1節: 第41章と同じ入り口。StrictMode は、開発中だけ、描画や Effect をわざと2回動かす（3.4節）
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
