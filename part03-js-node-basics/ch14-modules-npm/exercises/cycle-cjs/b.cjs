const a = require('./a.cjs');
console.log('b: 評価中。a のキー', Object.keys(a), '/ a.getB は', typeof a.getB);
exports.b = 'B の値';
exports.getA = () => a.a;
