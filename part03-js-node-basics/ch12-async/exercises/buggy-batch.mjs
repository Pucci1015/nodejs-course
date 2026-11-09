// 練習問題5: このファイルの3つの関数には、非同期の書き方のバグがあります。
// テスト（batch.test.mjs）が通るように直してください。関数の名前と引数は変えないでください。
// 確かめ方: node --test batch.test.mjs
//
// db と api は、テストが用意する「遅い」偽物です（本物なら、データベースや HTTP の API）。
//   db.exists(email)  → Promise<boolean>  そのメールアドレスのユーザーがいるか
//   db.save(user)     → Promise<void>     ユーザーを保存する（失敗することもある）
//   db.saveMany(list) → Promise<number>   まとめて保存し、保存した数を返す
//   api.getUser(id) / api.getPosts(id) / api.getNotices() → Promise<...>

/**
 * CSV から読んだ行を、ユーザーとして登録する。
 * すでにいるメールアドレス（rows の中で重複しているものも含む）は飛ばす。
 * @returns {Promise<{ created: number, skipped: number }>}
 */
export async function importUsers(rows, db) {
  const result = { created: 0, skipped: 0 };
  rows.forEach(async (row) => {
    const email = row.email.trim().toLowerCase();
    if (db.exists(email)) {
      result.skipped++;
      return;
    }
    db.save({ name: row.name.trim(), email });
    result.created++;
  });
  return result;
}

/**
 * ダッシュボードに表示するものを、まとめて取ってくる。
 * 3つの API は互いに関係がない。
 */
export async function loadDashboard(api, userId) {
  const user = await api.getUser(userId);
  const posts = await api.getPosts(userId);
  const notices = await api.getNotices();
  return { user, posts, notices };
}

/**
 * まとめて保存する。失敗したら「保存に失敗しました」というメッセージのエラーにして投げ直す
 * （元のエラーは cause に入れる）。
 */
export async function saveAll(items, db) {
  try {
    return db.saveMany(items);
  } catch (err) {
    throw new Error('保存に失敗しました', { cause: err });
  }
}
