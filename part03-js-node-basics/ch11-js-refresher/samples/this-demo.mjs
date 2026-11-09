// this は「どう呼んだか」で決まる（第11章 4節）
// 使い方: node this-demo.mjs

const timer = {
  name: 'タイマー',
  seconds: 0,
  tick() {
    this.seconds++;
    return `${this.name}: ${this.seconds}秒`;
  },
};

console.log('== 1. obj.method() と呼べば、this は obj ==');
console.log(timer.tick());

console.log('\n== 2. メソッドを取り出して呼ぶと、this が失われる ==');
const tick = timer.tick;
try {
  tick(); // ES Modules（.mjs）は strict モードなので、this は undefined
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}

console.log('\n== 3. コールバックに渡すときも同じ ==');
function callLater(fn) {
  return fn();
}
try {
  callLater(timer.tick);
} catch (err) {
  console.log(`${err.name}: ${err.message}`);
}
console.log('bind で this を固定する:', callLater(timer.tick.bind(timer)));
console.log('アロー関数で包む:     ', callLater(() => timer.tick()));

console.log('\n== 4. アロー関数は自分の this を持たない（外側の this を使う）==');
const team = {
  name: 'A チーム',
  members: ['ryota', 'hanako'],
  withFunction() {
    // function の中の this は、map が呼ぶときに undefined になる
    return this.members.map(function (m) {
      return `${m}（${this?.name}）`;
    });
  },
  withArrow() {
    return this.members.map((m) => `${m}（${this.name}）`);
  },
};
console.log('function:', team.withFunction());
console.log('arrow:   ', team.withArrow());

console.log('\n== 5. メソッドをアロー関数で書くと ==');
const wrong = {
  name: 'wrong',
  hello: () => `this.name は ${this?.name}`, // モジュールの一番外の this は undefined
};
console.log(wrong.hello());

console.log('\n== 6. クラスでも同じ ==');
class Button {
  constructor(label) {
    this.label = label;
    this.onClickArrow = () => `${this.label} が押された`; // インスタンスごとに作る（this が固定される）
  }
  onClick() {
    return `${this.label} が押された`;
  }
}
const button = new Button('保存');
// addEventListener('click', button.onClick) のように、関数だけを渡したときと同じ状況
const { onClick, onClickArrow } = button;
try {
  onClick();
} catch (err) {
  console.log(`メソッド:   ${err.name}: ${err.message}`);
}
console.log(`アロー関数: ${onClickArrow()}`);
console.log(`hasOwn: onClick ${Object.hasOwn(button, 'onClick')}、onClickArrow ${Object.hasOwn(button, 'onClickArrow')}（メソッドはプロトタイプに1つだけ）`);
