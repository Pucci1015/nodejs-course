// パスワードの決まり（src/auth/policy.ts）の単体テスト。境目の値を表にして並べる（第56章 3節）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPassword } from '../../src/auth/policy.ts';

const EMAIL = 'alice@example.com';

const cases = [
  { name: '11 文字は短い', password: 'x'.repeat(11), errors: 1 },
  { name: '12 文字なら合格', password: 'purple-otter', errors: 0 },
  { name: '128 文字までは合格', password: 'ab'.repeat(64), errors: 0 },
  { name: '129 文字は長い', password: 'ab'.repeat(64) + 'c', errors: 1 },
  { name: '絵文字は1文字として数える（11 文字）', password: '🐧'.repeat(11), errors: 1 },
  { name: '全角の英数字は半角にしてから数える', password: 'ｐｕｒｐｌｅ－ｏｔｔｅｒ', errors: 0 },
  { name: 'メールアドレスの @ の前を含む', password: 'my-name-is-alice', errors: 1 },
  { name: '大文字でもメールアドレスの @ の前を含む', password: 'my-name-is-ALICE', errors: 1 },
];
for (const { name, password, errors } of cases) {
  test(name, () => {
    assert.equal(checkPassword(password, EMAIL).length, errors);
  });
}

test('守れていない決まりを、すべて返す', () => {
  assert.deepEqual(checkPassword('alice', EMAIL), [
    'パスワードは 12 文字以上にしてください',
    'メールアドレスを含まないパスワードにしてください',
  ]);
});
