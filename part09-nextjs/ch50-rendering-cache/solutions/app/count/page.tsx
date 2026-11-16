// 第50章 練習問題5の模範解答: /count。覚えておいた数を出す（ビルドのときに読んだ数から始まる）
import { getTaskCount } from '../../lib/count.ts';

export default async function CountPage() {
  const count = await getTaskCount();
  return (
    <>
      <h1>数</h1>
      <p>タスクは {count} 件</p>
    </>
  );
}
