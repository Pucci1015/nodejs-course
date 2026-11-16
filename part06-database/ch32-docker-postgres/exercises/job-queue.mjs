// 練習問題6: 何人もの作業者が、同じ仕事を2回しないように、仕事を1つずつ取る関数を書いてください。
// 要件は README にあります。テストは JOBS_SQL（書いてあります）でテーブルを作ってから呼びます。
// 確かめ方: node --test job-queue.test.mjs
import { withTransaction } from './with-transaction.mjs';

export const JOBS_SQL = `
  CREATE TABLE jobs (
    id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind        text        NOT NULL,
    status      text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'running', 'done')),
    worker      text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
  );
`;

// 仕事を1つ足し、id を返す
export async function enqueue(pool, kind) {
  // ここを書く
}

// waiting の仕事のうち、いちばん古い（id の小さい）ものを1つ取り、running にして worker を書き込み、{ id, kind } を返す。
// 無ければ null。同時に何人が呼んでも、同じ仕事を2人に渡さない
export async function claimNext(pool, worker) {
  // ここを書く
}

// running の仕事を done にし、finished_at を今にする。running でなければ（無い・終わっている）false
export async function finish(pool, id) {
  // ここを書く
}
