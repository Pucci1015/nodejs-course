const b = require('./b.cjs');
console.log('a: 評価中。b.b =', b.b, '/ b.getA() =', b.getA());
exports.a = 'A の値';
exports.getB = () => b.b;
