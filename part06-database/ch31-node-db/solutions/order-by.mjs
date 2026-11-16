// 練習問題2 の模範解答

// 外から来る名前 → 列の名前。ここに無いものは、SQL に入れない
const SORTABLE = {
  id: 'id',
  title: 'title',
  dueDate: 'due_date',
  createdAt: 'created_at',
};

export function orderByClause(sort = 'id') {
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  if (!Object.hasOwn(SORTABLE, key)) throw new RangeError(`並べ替えに使えない項目です: ${key}`);
  const dir = desc ? 'DESC' : 'ASC';
  if (key === 'id') return `id ${dir}`;
  return `${SORTABLE[key]} ${dir}, id ASC`; // 同じ値のときの順を、id で決める
}

export function listIds(db, sort) {
  return db
    .prepare(`SELECT id FROM tasks ORDER BY ${orderByClause(sort)}`)
    .all()
    .map((r) => r.id);
}
