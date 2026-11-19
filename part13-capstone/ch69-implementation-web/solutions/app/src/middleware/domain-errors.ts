// サービスの層のエラー（errors.ts）を、HTTP の problem+json に読み替える（第26章 3節）
// サービスは HTTP を知らない。ステータスを決めるのは、ここだけ
import type { ErrorRequestHandler } from 'express';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../errors.ts';
import { HttpProblem } from './problem.ts';

export function mapDomainErrors(): ErrorRequestHandler {
  return (err: unknown, _req, _res, next) => {
    if (err instanceof NotFoundError) return next(new HttpProblem(404, { detail: err.message }));
    if (err instanceof ForbiddenError) return next(new HttpProblem(403, { detail: err.message }));
    if (err instanceof ConflictError) return next(new HttpProblem(409, { detail: err.message }));
    if (err instanceof ValidationError) {
      const errors = err.issues.map((i) => ({ ...(i.field ? { pointer: `#/${i.field}` } : {}), detail: i.message }));
      return next(new HttpProblem(422, { errors }));
    }
    next(err);
  };
}
