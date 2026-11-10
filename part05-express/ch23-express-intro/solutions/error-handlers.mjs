// 練習問題3 の模範解答
export function notFound(req, res) {
  res.status(404).json({ error: 'not_found', message: `${req.method} ${req.path} はありません` });
}

export function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) console.error(err);
  if (res.headersSent) return next(err);
  res.status(status).json({
    error: status >= 500 ? 'internal' : 'error',
    message: status >= 500 ? 'サーバのエラーです' : err.message,
  });
}
