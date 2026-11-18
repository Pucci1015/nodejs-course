// 練習問題で使う、本文の samples のコピー（書き換えなくてよい）。第57章 6節: リポジトリの「約束」のテスト（契約テスト）
// メモリの偽物にも PostgreSQL にも、同じテストを動かす。偽物が本物と同じように動くことを確かめるため
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, type TaskRepo } from './types.ts';

/** makeRepo は、テストごとに「空の」リポジトリを作る関数 */
export function repoContract(name: string, makeRepo: () => Promise<TaskRepo>) {
  describe(`TaskRepo の約束: ${name}`, () => {
    test('insert すると id が付き、get と list で読める', async () => {
      const repo = await makeRepo();
      const task = await repo.insert({ title: '牛乳を買う', dueDate: '2026-12-24' });

      assert.deepEqual(task, { id: task.id, title: '牛乳を買う', status: 'todo', dueDate: '2026-12-24' });
      assert.deepEqual(await repo.get(task.id), task);
      assert.deepEqual(await repo.list(), [task]);
    });

    test('無い id は undefined・false', async () => {
      const repo = await makeRepo();
      assert.equal(await repo.get(999), undefined);
      assert.equal(await repo.setStatus(999, 'done'), undefined);
      assert.equal(await repo.remove(999), false);
    });

    test('終わっていない同じ題名は ConflictError。終わっていれば作れる', async () => {
      const repo = await makeRepo();
      const first = await repo.insert({ title: '牛乳を買う', dueDate: null });
      await assert.rejects(repo.insert({ title: '牛乳を買う', dueDate: null }), ConflictError);

      await repo.setStatus(first.id, 'done');
      await repo.insert({ title: '牛乳を買う', dueDate: null });
      assert.equal((await repo.list()).length, 2);
    });

    test('countByStatus', async () => {
      const repo = await makeRepo();
      const a = await repo.insert({ title: 'a', dueDate: null });
      await repo.insert({ title: 'b', dueDate: null });
      await repo.setStatus(a.id, 'doing');
      assert.equal(await repo.countByStatus('doing'), 1);
      assert.equal(await repo.countByStatus('todo'), 1);
      assert.equal(await repo.countByStatus('done'), 0);
    });

    test('返したタスクを書き換えても、中のデータは変わらない', async () => {
      const repo = await makeRepo();
      const task = await repo.insert({ title: 'a', dueDate: null });
      task.title = '書き換えた';
      assert.equal((await repo.get(task.id))?.title, 'a');
    });
  });
}
