// 第50章 6節: ヘルプのページの中身。ファイルに書いてあるので、ビルドのときに全部分かる
export type HelpTopic = { slug: string; title: string; body: string };

export const HELP_TOPICS: readonly HelpTopic[] = [
  { slug: 'start', title: 'はじめに', body: '「新しいタスク」から、題名と締め切りを入れて作ります。' },
  { slug: 'status', title: '状態', body: 'タスクは、未着手・作業中・完了のどれかです。タスクのページのボタンで変えます。' },
  { slug: 'conflict', title: 'ほかの人が先に変えたとき', body: '古い画面から変えようとすると断られます。最新の内容を見てから、もう一度変えます。' },
];

export const findTopic = (slug: string) => HELP_TOPICS.find((t) => t.slug === slug);
