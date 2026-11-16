'use client';
// 第48章 練習問題1の模範解答: 押すと増える「いいね」ボタン
import { useState } from 'react';

export function LikeButton() {
  const [likes, setLikes] = useState(0);
  return (
    <button type="button" onClick={() => setLikes((n) => n + 1)}>
      いいね {likes}
    </button>
  );
}
