// 練習問題2 の模範解答
import express from 'express';

export function createHealthRouter({ isReady }) {
  const router = express.Router();

  router.get('/healthz', (req, res) => {
    res.set('Cache-Control', 'no-store').json({ status: 'ok' });
  });

  router.get('/readyz', (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (isReady()) return res.json({ status: 'ready' });
    res.status(503).json({ status: 'not_ready' });
  });

  return router;
}
