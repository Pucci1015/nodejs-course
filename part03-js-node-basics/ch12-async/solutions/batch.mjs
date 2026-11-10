// 練習問題6 の解答: buggy-batch.mjs の非同期のバグを直したもの
// 確かめ方: cd ../exercises && MODULE=../solutions/batch.mjs node --test batch.test.mjs

export async function importUsers(rows, db) {
  const result = { created: 0, skipped: 0 };
  // 修正: forEach は async 関数が返す Promise を捨てる。for...of と await で1件ずつ待つ。
  //       1件ずつにすると、rows の中の重複も「前の行を保存した後」に確かめるので飛ばせる
  //       （同時に動かすと、2つの行が両方「まだいない」と判断して、両方保存してしまう）
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    // 修正: db.exists は Promise を返す。Promise はいつでも truthy なので、await して中身を見る
    if (await db.exists(email)) {
      result.skipped++;
      continue;
    }
    // 修正: await しないと、保存の失敗が unhandled rejection になり、件数も保存前に数えてしまう
    await db.save({ name: row.name.trim(), email });
    result.created++;
  }
  return result;
}

export async function loadDashboard(api, userId) {
  // 修正: 互いに関係のない3つを1つずつ await すると、時間が足し算になる。Promise.all で同時に待つ
  const [user, posts, notices] = await Promise.all([
    api.getUser(userId),
    api.getPosts(userId),
    api.getNotices(),
  ]);
  return { user, posts, notices };
}

export async function saveAll(items, db) {
  try {
    // 修正: await せずに return すると、Promise が rejected になるのは try を抜けた後なので、
    //       catch に届かない。try の中では return await と書く
    return await db.saveMany(items);
  } catch (err) {
    throw new Error('保存に失敗しました', { cause: err });
  }
}
