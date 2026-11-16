// 練習問題2 の型の確かめ（書き換えない）
import { eventText } from './events.ts';

// @ts-expect-error 知らない type は渡せない
eventText({ type: 'archived', id: 1 });
// @ts-expect-error renamed には title が要る
eventText({ type: 'renamed', id: 1 });
eventText({ type: 'completed', id: 1 });
