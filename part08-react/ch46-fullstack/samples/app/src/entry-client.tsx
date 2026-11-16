// 第46章 3節: ブラウザの入り口。サーバが作った HTML に、イベントと state をつなぐ（ハイドレーション）
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App.tsx';
import type { PageData } from './data.ts';

// サーバが <script id="page-data" type="application/json"> に入れたデータを読む
const data = JSON.parse(document.getElementById('page-data')!.textContent) as PageData;

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App data={data} />
  </StrictMode>,
  {
    // サーバの HTML とブラウザの描画が食い違ったとき（4節）
    onRecoverableError: (error) => console.error('ハイドレーションの食い違い:', error),
  },
);
