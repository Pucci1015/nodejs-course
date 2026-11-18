// 練習問題3 で使う、UserRepo の約束のテスト（書き換えなくてよい）
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictError, type UserRepo } from './users.ts';

export function usersContract(name: string, makeRepo: () => Promise<UserRepo>) {
  describe(`UserRepo の約束: ${name}`, () => {
    test('create すると、id 1 から順に付き、list で読める', async () => {
      const repo = await makeRepo();
      const alice = await repo.create({ email: 'alice@example.com', name: 'Alice' });
      const bob = await repo.create({ email: 'bob@example.com', name: 'Bob' });
      assert.deepEqual(alice, { id: 1, email: 'alice@example.com', name: 'Alice' });
      assert.equal(bob.id, 2);
      assert.deepEqual(await repo.list(), [alice, bob]);
    });

    test('email は小文字にして覚える', async () => {
      const repo = await makeRepo();
      const user = await repo.create({ email: 'Alice@Example.COM', name: 'Alice' });
      assert.equal(user.email, 'alice@example.com');
    });

    test('大文字・小文字だけが違う同じアドレスは ConflictError', async () => {
      const repo = await makeRepo();
      await repo.create({ email: 'alice@example.com', name: 'Alice' });
      await assert.rejects(repo.create({ email: 'ALICE@example.com', name: 'もう1人' }), ConflictError);
      assert.equal((await repo.list()).length, 1);
    });

    test('findByEmail は大文字・小文字を区別しない。無ければ undefined', async () => {
      const repo = await makeRepo();
      const user = await repo.create({ email: 'alice@example.com', name: 'Alice' });
      assert.deepEqual(await repo.findByEmail('ALICE@example.com'), user);
      assert.equal(await repo.findByEmail('bob@example.com'), undefined);
    });

    test('rename は名前だけ変える。無い id は undefined', async () => {
      const repo = await makeRepo();
      const user = await repo.create({ email: 'alice@example.com', name: 'Alice' });
      assert.deepEqual(await repo.rename(user.id, 'ありす'), { ...user, name: 'ありす' });
      assert.equal(await repo.rename(99, 'x'), undefined);
    });

    test('返したユーザーを書き換えても、中のデータは変わらない', async () => {
      const repo = await makeRepo();
      const user = await repo.create({ email: 'alice@example.com', name: 'Alice' });
      user.name = '書き換えた';
      (await repo.list())[0]!.name = 'これも書き換えた';
      assert.equal((await repo.findByEmail('alice@example.com'))?.name, 'Alice');
    });
  });
}
