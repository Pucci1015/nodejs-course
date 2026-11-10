// オブジェクト・プロトタイプ・クラス（第11章 5節）
// 使い方: node class-demo.mjs

console.log('== 1. オブジェクトは「キーと値」の集まり。プロトタイプをたどってプロパティを探す ==');
const animal = {
  speak() {
    return `${this.name}が鳴いた`;
  },
};
const dog = Object.create(animal); // dog のプロトタイプを animal にする
dog.name = 'ポチ';
console.log(dog.speak()); // dog 自身に speak は無いので、プロトタイプの animal で見つかる
console.log(`Object.hasOwn(dog, 'speak') = ${Object.hasOwn(dog, 'speak')}`);
console.log(`Object.getPrototypeOf(dog) === animal → ${Object.getPrototypeOf(dog) === animal}`);

console.log('\n== 2. class は、プロトタイプを使った書き方の「書きやすい形」 ==');
class Account {
  // # で始まるフィールドは、クラスの外から読めない（Python の _name は「約束」だが、こちらは本当に読めない）
  #balance = 0;
  static #count = 0; // クラス全体で1つ

  constructor(owner) {
    this.owner = owner;
    Account.#count++;
  }

  deposit(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new RangeError(`入金額は正の整数にしてください: ${amount}`);
    }
    this.#balance += amount;
    return this; // this を返すと、メソッドをつなげて呼べる
  }

  get balance() {
    // ゲッター: account.balance と、() を付けずに読める（Python の @property）
    return this.#balance;
  }

  toString() {
    return `${this.owner} の口座（残高 ${this.#balance} 円）`;
  }

  static get count() {
    return Account.#count;
  }
}

const account = new Account('alice').deposit(1000).deposit(500);
console.log(String(account));
console.log(`account.balance = ${account.balance}`);
console.log(`account['#balance'] = ${account['#balance']}（別のプロパティ扱い）`);
try {
  account.deposit(-1);
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
console.log(`typeof Account = ${typeof Account}（クラスの正体は関数）`);
console.log(`メソッドはプロトタイプにある: ${Object.getOwnPropertyNames(Account.prototype).join(', ')}`);

console.log('\n== 3. 継承と super ==');
class SavingsAccount extends Account {
  constructor(owner, rate) {
    super(owner); // 親の constructor を先に呼ぶ（呼ぶ前に this は使えない）
    this.rate = rate;
  }
  addInterest() {
    return this.deposit(Math.floor(this.balance * this.rate)); // 親の #balance は直接は見えないので、ゲッターを使う
  }
  toString() {
    return `${super.toString()}、利率 ${this.rate * 100}%`;
  }
}
const savings = new SavingsAccount('bob', 0.02).deposit(10000).addInterest();
console.log(String(savings));
console.log(`savings instanceof Account = ${savings instanceof Account}`);
console.log(`作った口座の数: ${Account.count}`);

console.log('\n== 4. 独自のエラーのクラス ==');
class NotFoundError extends Error {
  constructor(what, options) {
    super(`${what} が見つかりません`, options); // options.cause で、元のエラーをつなげられる
    this.name = 'NotFoundError';
  }
}
try {
  try {
    JSON.parse('{ 壊れた JSON');
  } catch (cause) {
    throw new NotFoundError('設定ファイル', { cause });
  }
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
  console.log(`  原因: ${err.cause.name}: ${err.cause.message}`);
  console.log(`  err instanceof NotFoundError = ${err instanceof NotFoundError}、instanceof Error = ${err instanceof Error}`);
}
