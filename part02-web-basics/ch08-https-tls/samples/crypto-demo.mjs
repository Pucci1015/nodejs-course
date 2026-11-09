// HTTPS を支える暗号の部品を、node:crypto で1つずつ試す（第8章 2節）
// 使い方: node crypto-demo.mjs [hash|aes|hmac|sign|ecdh|all]   既定: all
import crypto from 'node:crypto';

const demos = {
  // 2.1 ハッシュ: どんな長さのデータからも、決まった長さの「指紋」を作る。元には戻せない
  hash() {
    console.log('== ハッシュ（SHA-256）==');
    for (const text of ['hello', 'hellp', 'hello'.repeat(10000)]) {
      const digest = crypto.createHash('sha256').update(text).digest('hex');
      console.log(`  ${JSON.stringify(text.length > 20 ? `${text.slice(0, 15)}…（${text.length}文字）` : text).padEnd(26)} → ${digest}`);
    }
    console.log('  → 1文字違うだけで全く違う値になる。入力が長くても、出力は常に 256 ビット（16進数で64文字）');
  },

  // 2.2 共通鍵暗号: 同じ鍵で暗号化と復号をする。AES-GCM は改ざんも検出できる
  aes() {
    console.log('== 共通鍵暗号（AES-256-GCM）==');
    const key = crypto.randomBytes(32); // 256 ビットの鍵。送る側と受け取る側が同じものを持つ
    const iv = crypto.randomBytes(12); // 毎回変える値（同じ鍵で同じ iv を使い回してはいけない）
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update('残高は 1,000 円です', 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag(); // 改ざんを検出するための値
    console.log(`  暗号文: ${encrypted.toString('hex')}`);

    const decrypt = (data) => {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    };
    console.log(`  復号: ${decrypt(encrypted)}`);

    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 0x01; // 最後のバイトを1ビットだけ変える
    try {
      console.log(`  改ざんしたものを復号: ${decrypt(tampered)}`);
    } catch (err) {
      console.log(`  改ざんしたものを復号: 失敗（${err.message}）→ 書き換えられたことが分かる`);
    }
  },

  // 2.3 HMAC: 共通の秘密の鍵を知っている人だけが作れる「署名のようなもの」
  hmac() {
    console.log('== HMAC（HMAC-SHA256）==');
    const secret = 'サーバだけが知っている秘密の文字列';
    const sign = (message) => crypto.createHmac('sha256', secret).update(message).digest('base64url');
    const message = 'user_id=42';
    const mac = sign(message);
    console.log(`  ${message} の HMAC: ${mac}`);
    // ここでは分かりやすさのために === で比べている。実際のコードでは crypto.timingSafeEqual を使う（練習問題2）
    console.log(`  受け取った「user_id=42」と HMAC を確かめる: ${sign('user_id=42') === mac ? '一致（本物）' : '不一致'}`);
    console.log(`  書き換えた「user_id=1」  と同じ HMAC     : ${sign('user_id=1') === mac ? '一致' : '不一致（偽物）'}`);
    console.log('  → 秘密の文字列を知らない人は、user_id=1 に合う HMAC を作れない');
  },

  // 2.4 公開鍵暗号の署名: 秘密鍵で署名し、公開鍵で誰でも確かめられる
  sign() {
    console.log('== 電子署名（Ed25519）==');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const message = Buffer.from('この公開鍵は example.com のものです');
    const signature = crypto.sign(null, message, privateKey);
    console.log(`  公開鍵: ${publicKey.export({ type: 'spki', format: 'der' }).toString('base64')}`);
    console.log(`  署名: ${signature.toString('base64')}`);
    console.log(`  公開鍵で確かめる（元の文）    : ${crypto.verify(null, message, publicKey, signature)}`);
    console.log(`  公開鍵で確かめる（書き換えた文）: ${crypto.verify(null, Buffer.from('この公開鍵は evil.example のものです'), publicKey, signature)}`);
    console.log('  → 秘密鍵を持つ人だけが署名でき、公開鍵があれば誰でも確かめられる（第3章の SSH 鍵と同じ仕組み）');
  },

  // 2.5 鍵交換: 公開の場でやり取りしても、2人だけが同じ秘密の値を得られる
  ecdh() {
    console.log('== 鍵交換（X25519）==');
    const alice = crypto.generateKeyPairSync('x25519');
    const bob = crypto.generateKeyPairSync('x25519');
    // 公開鍵だけを交換する（盗聴されてもよい）
    const aliceSecret = crypto.diffieHellman({ privateKey: alice.privateKey, publicKey: bob.publicKey });
    const bobSecret = crypto.diffieHellman({ privateKey: bob.privateKey, publicKey: alice.publicKey });
    console.log(`  クライアントが計算した秘密: ${aliceSecret.toString('hex')}`);
    console.log(`  サーバが計算した秘密      : ${bobSecret.toString('hex')}`);
    console.log(`  一致: ${aliceSecret.equals(bobSecret)} → これを元に、AES の鍵を作る（TLS 1.3 の中心）`);
  },
};

const which = process.argv[2] ?? 'all';
const selected = which === 'all' ? Object.keys(demos) : [which];
for (const name of selected) {
  if (!demos[name]) {
    console.error(`使い方: node crypto-demo.mjs [${Object.keys(demos).join('|')}|all]`);
    process.exit(2);
  }
  demos[name]();
  console.log();
}
