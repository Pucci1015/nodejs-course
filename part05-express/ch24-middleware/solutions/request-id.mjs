// 練習問題1 の模範解答
import crypto from 'node:crypto';

const VALID = /^[A-Za-z0-9-]{1,64}$/;

export function requestId() {
  return (req, res, next) => {
    const sent = req.get('x-request-id');
    req.id = typeof sent === 'string' && VALID.test(sent) ? sent : crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    next();
  };
}
