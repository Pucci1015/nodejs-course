// 練習問題6: 受け取った JSON を、安全に混ぜる・選ぶ
// 仕様は README の練習問題6を見てください。
// 確かめる: node --test merge.test.mjs
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

export function safeMerge(target, patch, { maxDepth = 10 } = {}) {
  // ここを書く（下は samples/proto-demo.mjs と同じ、よくある書き方です）
  for (const key of Object.keys(patch)) {
    if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key])) {
      target[key] ??= {};
      safeMerge(target[key], patch[key]);
    } else {
      target[key] = patch[key];
    }
  }
  return target;
}

export function pick(obj, keys) {
  // ここを書く
  return { ...obj };
}
