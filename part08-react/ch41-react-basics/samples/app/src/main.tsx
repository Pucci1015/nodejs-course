// 第41章 1節: 入り口。#root の中に、App を描く
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const root = document.querySelector('#root');
if (root === null) throw new Error('index.html に #root がありません');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
