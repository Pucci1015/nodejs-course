// テストの例のタスク。締め切りは、今日（日本の日付）から数えて決める
import type { FakeTask } from './fake-api.ts';

export const day = (n: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date(Date.now() + n * 86_400_000));

export const SEED: Partial<FakeTask>[] = [
  { title: '牛乳を買う', dueDate: day(0) }, // id 1
  { title: 'レポートを出す', dueDate: day(3), status: 'doing' }, // id 2
  { title: '本を返す', dueDate: day(-2) }, // id 3
  { title: 'Milk tea', dueDate: null, status: 'done', completedAt: new Date().toISOString() }, // id 4
  { title: '部屋の掃除', dueDate: null }, // id 5
];
