// 練習問題3 の模範解答
import express from 'express';

export function createTasksRouter(tasks) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const done = req.query.done;
    if (done === undefined) return res.json(tasks);
    if (done !== 'true' && done !== 'false') {
      return res.status(400).json({ error: 'bad_request', message: 'done は true か false です' });
    }
    res.json(tasks.filter((t) => t.done === (done === 'true')));
  });

  router.get('/:id', (req, res) => {
    const task = tasks.find((t) => String(t.id) === req.params.id);
    if (!task) return res.status(404).json({ error: 'not_found', message: 'タスクがありません' });
    res.json(task);
  });

  return router;
}
