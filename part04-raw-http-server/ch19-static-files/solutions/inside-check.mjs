// 練習問題2 の模範解答
import path from 'node:path';

export function isInside(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return !(rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel));
}

export function isHidden(pathname) {
  return pathname.split('/').some((seg) => seg.startsWith('.'));
}
