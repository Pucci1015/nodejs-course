// node:path でパスを組み立てる・分解する（第15章 2節）
// 使い方: node path-demo.mjs
import path from 'node:path';

const show = (label, value) => console.log(`${label.padEnd(44)} → ${JSON.stringify(value)}`);

console.log('--- 組み立てる');
show("path.join('data', 'memos', 'a.md')", path.join('data', 'memos', 'a.md'));
show("path.join('data/', '/memos/', '../a.md')", path.join('data/', '/memos/', '../a.md'));
show("path.resolve('data', 'a.md')（今のフォルダから）", path.resolve('data', 'a.md').replace(process.cwd(), '<cwd>'));
show("path.resolve('/srv', 'data', '/etc', 'x')", path.resolve('/srv', 'data', '/etc', 'x'));
show("path.normalize('/a//b/./c/../d')", path.normalize('/a//b/./c/../d'));

console.log('--- 分解する');
const file = '/Users/alice/dev/memo/2026-11-04 会議.md';
show('path.dirname(file)', path.dirname(file));
show('path.basename(file)', path.basename(file));
show("path.basename(file, '.md')", path.basename(file, '.md'));
show('path.extname(file)', path.extname(file));
show("path.extname('archive.tar.gz')", path.extname('archive.tar.gz'));
show("path.extname('.zshrc')", path.extname('.zshrc'));
show('path.parse(file)', path.parse(file));

console.log('--- 2つのパスの関係');
show("path.relative('/a/b/c', '/a/d')", path.relative('/a/b/c', '/a/d'));
show("path.isAbsolute('~/dev')", path.isAbsolute('~/dev'));
show('path.sep / path.delimiter', [path.sep, path.delimiter]);

console.log('--- Windows の形（path.win32）');
show("path.win32.join('C:\\\\Users', 'alice', 'a.md')", path.win32.join('C:\\Users', 'alice', 'a.md'));
show("path.posix.join('a', 'b')", path.posix.join('a', 'b'));
