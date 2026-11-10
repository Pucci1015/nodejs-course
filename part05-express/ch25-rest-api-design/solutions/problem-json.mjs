// 練習問題1 の模範解答
import http from 'node:http';

export function problem(status, { detail, instance } = {}) {
  const body = { type: 'about:blank', title: http.STATUS_CODES[status] ?? 'Error', status };
  if (detail !== undefined) body.detail = detail;
  if (instance !== undefined) body.instance = instance;
  return body;
}

export function toErrors(issues) {
  return issues.map((issue) => ({
    pointer: '#/' + issue.path.join('/'),
    detail: issue.message,
  }));
}
