// 追加（第11部）: TaskRepo の「約束」のテスト（契約テスト。第57章 6節）
// メモリの偽物にも PostgreSQL にも、同じテストを動かす。偽物が本物と同じように動くことを確かめておくと、
// 偽物を使うサービスの単体テスト（test/unit/）を信じられる
// 名前が .test.ts で終わらないので、これ自体はテストとして動かない（task-repo.test.ts が呼ぶ）
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError } from '../../src/errors.ts';
import type { TaskFields, TaskRepo } from '../../src/types.ts';

const NOW = '2026-12-10T00:00:00.000Z';

/** insert に渡す項目（テストのデータを作る関数。第56章 6.1節） */
export function fields(overrides: Partial<TaskFields> = {}): TaskFields {
  return {
    title: 'タスク',
    status: 'todo',
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    version: 1,
    ...overrides,
  };
}

/** makeRepo は、テストごとに「空の」リポジトリを作る関数 */
export function taskRepoContract(name: string, makeRepo: () => Promise<TaskRepo>) {
  describe(`TaskRepo の約束: ${name}`, () => {
    test('insert すると id が付き、get で同じものが読める', async () => {
      const repo = await makeRepo();
      const task = await repo.insert(fields({ title: '牛乳を買う', dueDate: '2026-12-24' }));
      assert.equal(typeof task.id, 'number');
      assert.deepEqual(task, { id: task.id, ...fields({ title: '牛乳を買う', dueDate: '2026-12-24' }) });
      assert.deepEqual(await repo.get(task.id), task);
    });

    test('無い id: get は null、update は null、remove は false', async () => {
      const repo = await makeRepo();
      assert.equal(await repo.get(999_999), null);
      assert.equal(await repo.update(999_999, { title: 'x' }), null);
      assert.equal(await repo.remove(999_999), false);
    });

    test('終わっていない同じ題名は ConflictError。終わっていれば作れる', async () => {
      const repo = await makeRepo();
      const first = await repo.insert(fields({ title: '牛乳を買う' }));
      await assert.rejects(repo.insert(fields({ title: '牛乳を買う' })), ConflictError);

      await repo.update(first.id, { status: 'done' });
      await repo.insert(fields({ title: '牛乳を買う' }));
      assert.equal((await repo.listPage({ sort: 'createdAt', limit: 10 })).items.length, 2);
    });

    test('findOpenByTitle: 終わっていないものだけ。exceptId は除く', async () => {
      const repo = await makeRepo();
      const a = await repo.insert(fields({ title: 'a' }));
      await repo.insert(fields({ title: 'b', status: 'done' }));
      assert.equal((await repo.findOpenByTitle('a'))?.id, a.id);
      assert.equal(await repo.findOpenByTitle('a', a.id), null);
      assert.equal(await repo.findOpenByTitle('b'), null);
    });

    test('countByStatus', async () => {
      const repo = await makeRepo();
      await repo.insert(fields({ title: 'a', status: 'doing' }));
      await repo.insert(fields({ title: 'b' }));
      assert.equal(await repo.countByStatus('doing'), 1);
      assert.equal(await repo.countByStatus('todo'), 1);
      assert.equal(await repo.countByStatus('done'), 0);
    });

    test('expectedVersion が違えば、update は null、remove は false で、何も変わらない', async () => {
      const repo = await makeRepo();
      const task = await repo.insert(fields({ title: 'a' }));
      assert.equal(await repo.update(task.id, { title: 'b', version: 2 }, { expectedVersion: 5 }), null);
      assert.equal(await repo.remove(task.id, { expectedVersion: 5 }), false);
      assert.deepEqual(await repo.get(task.id), task);

      const updated = await repo.update(task.id, { title: 'b', version: 2 }, { expectedVersion: 1 });
      assert.deepEqual(updated, { ...task, title: 'b', version: 2 });
      assert.equal(await repo.remove(task.id, { expectedVersion: 2 }), true);
      assert.equal(await repo.get(task.id), null);
    });

    test('listPage: 期限の早い順で、期限の無いものは最後。limit と hasMore と after で次のページ', async () => {
      const repo = await makeRepo();
      const none = await repo.insert(fields({ title: '期限なし' }));
      const late = await repo.insert(fields({ title: '遅い', dueDate: '2026-12-31' }));
      await repo.insert(fields({ title: '早い', dueDate: '2026-12-11' }));

      const first = await repo.listPage({ sort: 'dueDate', limit: 2 });
      assert.deepEqual(
        first.items.map((t) => t.title),
        ['早い', '遅い'],
      );
      assert.equal(first.hasMore, true);

      const second = await repo.listPage({ sort: 'dueDate', limit: 2, after: { v: late.dueDate, id: late.id } });
      assert.deepEqual(
        second.items.map((t) => t.id),
        [none.id],
      );
      assert.equal(second.hasMore, false);
    });

    test('listPage: statuses と dueBefore で絞る', async () => {
      const repo = await makeRepo();
      await repo.insert(fields({ title: 'a', dueDate: '2026-12-11' }));
      await repo.insert(fields({ title: 'b', status: 'doing', dueDate: '2026-12-20' }));
      await repo.insert(fields({ title: 'c', status: 'done', dueDate: '2026-12-12' }));

      const doing = await repo.listPage({ sort: 'title', limit: 10, statuses: ['doing', 'done'] });
      assert.deepEqual(
        doing.items.map((t) => t.title),
        ['b', 'c'],
      );
      const soon = await repo.listPage({ sort: 'title', limit: 10, dueBefore: '2026-12-15' });
      assert.deepEqual(
        soon.items.map((t) => t.title),
        ['a', 'c'],
      );
    });

    test('返したタスクを書き換えても、覚えているものは変わらない', async () => {
      const repo = await makeRepo();
      const task = await repo.insert(fields({ title: 'a' }));
      task.title = '書き換えた';
      const got = await repo.get(task.id);
      assert.equal(got?.title, 'a');
      if (got) got.title = '書き換えた';
      const found = await repo.findOpenByTitle('a');
      assert.equal(found?.title, 'a');
      if (found) found.title = '書き換えた';
      assert.equal((await repo.get(task.id))?.title, 'a');
    });
  });
}
