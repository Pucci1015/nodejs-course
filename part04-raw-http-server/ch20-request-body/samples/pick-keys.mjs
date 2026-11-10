// 第20章 7節で書く、受け取った値をそのまま広げる危なさと、決めたキーだけを取り出す書き方の完成形（サーバは起動しない）
// 使い方（~/dev/part04/ch20-request-body で）: node samples/pick-keys.mjs
const received = JSON.parse('{"name":"alice","text":"こんにちは","id":999,"isAdmin":true}');

// そのまま広げると、客が決めた id や isAdmin まで入ってしまう
const bad = { id: 1, isAdmin: false, ...received };
console.log('そのまま広げる :', bad);

// 使うキーを決めて、それだけを取り出す
const good = { id: 1, isAdmin: false, name: received.name, text: received.text };
console.log('決めたキーだけ :', good);
