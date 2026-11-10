// 第11章 5.2節で書く、クラスの完成形
// 使い方（~/dev/part03/ch11-js-refresher で）: node samples/account.mjs

class Account {
  #balance = 0; // # で始まるフィールドは、クラスの外から読めない

  constructor(owner) {
    this.owner = owner; // Python の self.owner = owner
  }

  deposit(amount) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new RangeError(`入金額は正の整数にしてください: ${amount}`);
    }
    this.#balance += amount;
    return this; // this を返すと、account.deposit(1).deposit(2) とつなげて呼べる
  }

  get balance() {
    return this.#balance; // account.balance と、() を付けずに読める
  }

  toString() {
    return `${this.owner} の口座（残高 ${this.#balance} 円）`;
  }
}

const account = new Account('alice');
account.deposit(1000).deposit(500);
console.log(String(account));
console.log(`account.balance = ${account.balance}`);
console.log(`account['#balance'] = ${account['#balance']}（別のプロパティ扱い）`);
try {
  account.deposit(-1);
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
