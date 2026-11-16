// 第42章 7節: カスタムフック。名前は use で始め、中で他のフックを使う
import { useEffect, useState } from 'react';

// 今の時刻を返し、ms ごとに描き直させる
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// ウィンドウの幅を返し、幅が変わったら描き直させる
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}
