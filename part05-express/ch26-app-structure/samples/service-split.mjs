// 第26章 3・4節で書く、サービスの層と、使うものを外から渡す形の完成形
// 使い方（~/dev/part05/ch26-app-structure で）: node samples/service-split.mjs   （サーバは使わない）

// データの層: 保存だけをする。ここではメモリの Map
function createMemoryRepo() {
  const rows = new Map();
  let nextId = 1;
  return {
    insert(task) {
      const row = { id: nextId++, ...task };
      rows.set(row.id, row);
      return row;
    },
    findById(id) {
      return rows.get(id) ?? null;
    },
  };
}

// サービスの層: 決まり（題名の長さ、作った時刻）を書く。HTTP も Express も知らない
function createTaskService({ repo, now }) {
  return {
    create(title) {
      const t = title.trim();
      if (t === '' || t.length > 100) throw new Error('title は 1〜100 文字です');
      return repo.insert({ title: t, createdAt: now().toISOString() });
    },
    get(id) {
      return repo.findById(id);
    },
  };
}

// 使うもの（repo と now）を外から渡す
const service = createTaskService({
  repo: createMemoryRepo(),
  now: () => new Date('2026-11-09T09:00:00Z'), // 決まった時刻にすると、結果がいつも同じ
});

console.log(service.create('  牛乳を買う '));
console.log(service.get(1));
try {
  service.create('   ');
} catch (err) {
  console.log('間違い:', err.message);
}
