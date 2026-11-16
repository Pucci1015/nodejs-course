// 練習問題6 の型の確かめ（書き換えない）
import pg from 'pg';
import { createPgTaskRepo, type Queryable } from './pg-repo.ts';
import type { TaskRepo } from './task-repo.ts';

// 本物の pg の Pool と、トランザクションの client を渡せる
declare const pool: pg.Pool;
declare const client: pg.PoolClient;
const r1: TaskRepo = createPgTaskRepo(pool);
const r2: TaskRepo = createPgTaskRepo(client);
const q: Queryable = pool;
console.log(r1, r2, q);
