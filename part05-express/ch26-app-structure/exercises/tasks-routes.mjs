// 練習問題5: ルートの層。HTTP を読んで確かめ、サービスを呼び、応答の形にする
// 要件は exercises/README.md の問題5です。確かめ方:
//   $ node --test tasks-routes.test.mjs
// 今は一覧だけを、確かめずに書いてあります。
import express from 'express';
import { z } from 'zod';
import { HttpProblem } from '../../lib/problem.mjs';
import { ConflictError, NotFoundError, ValidationError } from './errors.mjs';

z.config(z.locales.ja());

export function createTasksRouter({ service }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.json({ items: await service.list(req.query) }); // ここを書く: クエリを確かめる
  });

  // ここを書く: GET /:id、POST /、PATCH /:id、DELETE /:id

  return router;
}

export function mapDomainErrors() {
  // ここを書く: NotFoundError → 404、ConflictError → 409、ValidationError → 422
  return (err, req, res, next) => next(err);
}

export { HttpProblem, ConflictError, NotFoundError, ValidationError, z };
