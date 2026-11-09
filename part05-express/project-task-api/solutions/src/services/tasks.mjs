// 第26章 練習問題3の模範解答（ch26-app-structure/solutions/task-service.mjs）のコピー。一覧の絞り込み、版の確かめ、イベントを足した（「追加（成果物）」）
// タスクの決まりを、HTTP からもデータの置き場所からも切り離して書く
import { ConflictError, NotFoundError, PreconditionFailedError, ValidationError } from '../errors.mjs';

const STATUSES = ['todo', 'doing', 'done'];

/** その時刻が、timeZone で何日か（'YYYY-MM-DD'） */
function dateIn(timeZone, date) {
  // 修正: toISOString().slice(0, 10) は UTC の日付。日本の朝 9 時より前は、前の日になってしまう
  // en-CA の書き方は YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/**
 * @param {{ repo: object, clock: () => Date, maxDoing?: number, timeZone?: string, publish?: (type: string, task: object) => void }} deps
 *   publish: 追加（成果物）。変えた後に呼ぶ。サービスは SSE も hub も知らず、「何が起きたか」を知らせる関数だけを受け取る
 */
export function createTaskService({ repo, clock, maxDoing = 3, timeZone = 'Asia/Tokyo', publish = () => {} }) {
  const today = () => dateIn(timeZone, clock());

  function checkTitle(title) {
    const t = typeof title === 'string' ? title.trim() : '';
    if (t.length < 1 || t.length > 100) throw new ValidationError('title は 1〜100 文字です', 'title');
    return t;
  }
  function checkDueDate(dueDate) {
    if (dueDate === null || dueDate === undefined) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new ValidationError('dueDate は YYYY-MM-DD です', 'dueDate');
    if (dueDate < today()) throw new ValidationError('締め切りが過ぎています', 'dueDate');
    return dueDate;
  }
  async function checkUniqueTitle(title, exceptId) {
    const all = await repo.list();
    if (all.some((x) => x.id !== exceptId && x.status !== 'done' && x.title === title)) {
      throw new ConflictError('同じ題名の、終わっていないタスクがあります');
    }
  }
  async function mustGet(id) {
    const task = await repo.get(id);
    if (!task) throw new NotFoundError(`タスク ${id} はありません`);
    return task;
  }

  return {
    // 変更（成果物）: status は複数（['todo', 'doing']）、締め切りでも絞る。並べ方とページ分けは、ルートがする
    //   （第6部では、絞り込み・並べ方・ページ分けを、まとめて1つの SQL にする）
    async list({ statuses, dueBefore } = {}) {
      let items = await repo.list();
      if (statuses && statuses.length > 0) items = items.filter((t) => statuses.includes(t.status));
      if (dueBefore) items = items.filter((t) => t.dueDate !== null && t.dueDate < dueBefore);
      return items.sort((a, b) => a.id - b.id);
    },

    get: mustGet,

    async create({ title, dueDate } = {}) {
      const t = checkTitle(title);
      const d = checkDueDate(dueDate);
      await checkUniqueTitle(t);
      const now = clock().toISOString();
      const task = await repo.insert({ title: t, status: 'todo', dueDate: d, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
      publish('task.created', task); // 追加（成果物）: 覚え終わってから知らせる
      return task;
    },

    /**
     * @param {{ expectedVersion?: number }} [options] 追加（成果物）: 客が見ていた版。違えば PreconditionFailedError
     */
    async update(id, changes = {}, { expectedVersion } = {}) {
      const current = await mustGet(id);
      if (expectedVersion !== undefined && current.version !== expectedVersion) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      const next = {};
      const has = (k) => Object.hasOwn(changes, k);

      // 追加: 終わったタスクは、status を戻す（やり直す）こと以外は変えられない
      if (current.status === 'done' && (has('title') || has('dueDate')) && !(has('status') && changes.status !== 'done')) {
        throw new ConflictError('完了したタスクは変えられません。先に status を戻してください');
      }
      if (has('title')) {
        const t = checkTitle(changes.title);
        if (t !== current.title) {
          await checkUniqueTitle(t, id);
          next.title = t;
        }
      }
      if (has('dueDate') && changes.dueDate !== current.dueDate) next.dueDate = checkDueDate(changes.dueDate); // 同じ値なら確かめない（昨日の締め切りのまま、題名だけ変えられるように）
      if (has('status') && changes.status !== current.status) {
        if (!STATUSES.includes(changes.status)) throw new ValidationError(`status は ${STATUSES.join('・')} のどれかです`, 'status');
        // 追加: 「作業中」は同時に maxDoing 個まで（WIP 制限）
        if (changes.status === 'doing') {
          const doing = (await repo.list()).filter((t) => t.status === 'doing').length;
          if (doing >= maxDoing) throw new ConflictError(`作業中のタスクは ${maxDoing} 個までです`);
        }
        // やり直したタスクの題名が、別の終わっていないタスクと重なることもある
        if (current.status === 'done') await checkUniqueTitle(next.title ?? current.title, id);
        next.status = changes.status;
        next.completedAt = changes.status === 'done' ? clock().toISOString() : null;
      }
      if (Object.keys(next).length === 0) return current; // 何も変わらないなら、version も上げない
      // 追加（成果物）: 確かめてから、ここまでの間に（await の間に）ほかの人が変えていたら、データの層が null を返す
      const updated = await repo.update(id, { ...next, updatedAt: clock().toISOString(), version: current.version + 1 }, { expectedVersion: current.version });
      if (!updated) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      publish('task.updated', updated);
      return updated;
    },

    async remove(id, { expectedVersion } = {}) {
      const current = await mustGet(id);
      if (expectedVersion !== undefined && current.version !== expectedVersion) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      if (!(await repo.remove(id, { expectedVersion: current.version }))) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      publish('task.deleted', current); // 追加（成果物）: 消す前の中身を知らせる（画面は id で一覧から外す）
    },
  };
}
