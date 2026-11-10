// 練習問題2 の模範解答
const WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

export function requireJson(req, res, next) {
  if (WITH_BODY.has(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'unsupported_media_type', message: 'JSON で送ってください' });
  }
  next();
}
