// 練習問題2: EventEmitter を継承して、イベントを出すカウンタを作ってください。
// 要件は README と step-counter.test.mjs にあります。確かめ方: node --test step-counter.test.mjs
import { EventEmitter } from 'node:events';

export class StepCounter extends EventEmitter {
  // ここを書く（constructor(limit)、increment()、reset()、value）
}
