// 2.2節: ソルト（ユーザーごとのランダムな値）を混ぜる
import { createHash, randomBytes } from 'node:crypto';

function saltedSha256(password: string, salt: Buffer): string {
  return createHash('sha256').update(salt).update(password).digest('hex');
}

for (const user of ['alice', 'bob']) {
  const salt = randomBytes(16); // 16バイト（128ビット）のランダムな値。ユーザーごとに作り、ハッシュと一緒に保存する
  console.log(user, salt.toString('base64'), saltedSha256('neko-daisuki', salt));
}
