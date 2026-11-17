// 第26章 練習問題6の模範解答（ch26-app-structure/solutions/task-service.mjs）のコピー。一覧の絞り込み、版の確かめ、イベントを足した（「追加（成果物）」）
// タスクの決まりを、HTTP からもデータの置き場所からも切り離して書く
// 第6部: 一覧と、題名・作業中の数の確かめを、データの層の問い合わせに任せた（「変更（第6部）」）
// 変更（第7部）: TypeScript にした。データの層は TaskRepo（types.ts）の形のものなら何でもよい
import { ConflictError, NotFoundError, PreconditionFailedError, ValidationError } from '../errors.ts';
import { type ListPageQuery, type Publish, STATUSES, type Status, type Task, type TaskFields, type TaskRepo, type VersionCheck } from '../types.ts';

/** 追加（第7部）: 文字列が Status か（型ガード。第36章 3節） */
const isStatus = (s: unknown): s is Status => STATUSES.some((x) => x === s);

/** 作るときに受け取るもの。形（型）はルートが Zod で確かめてある。長さや締め切りなどの決まりは、ここで確かめる */
export type CreateInput = { title: string; dueDate?: string | null | undefined };
/** 変えるときに受け取るもの。status は文字列のまま来る（決まった値かは、ここで確かめる） */
export type UpdateInput = { title?: string | undefined; status?: string | undefined; dueDate?: string | null | undefined };

export type TaskServiceDeps = {
  repo: TaskRepo;
  clock: () => Date;
  maxDoing?: number;
  timeZone?: string;
  /** 追加（成果物）。変えた後に呼ぶ。サービスは SSE も hub も知らず、「何が起きたか」を知らせる関数だけを受け取る */
  publish?: Publish;
};

/** その時刻が、timeZone で何日か（'YYYY-MM-DD'） */
function dateIn(timeZone: string, date: Date): string {
  // 修正: toISOString().slice(0, 10) は UTC の日付。日本の朝 9 時より前は、前の日になってしまう
  // en-CA の書き方は YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function createTaskService({ repo, clock, maxDoing = 3, timeZone = 'Asia/Tokyo', publish = () => {} }: TaskServiceDeps) {
  const today = () => dateIn(timeZone, clock());

  function checkTitle(title: unknown): string {
    const t = typeof title === 'string' ? title.trim() : '';
    if (t.length < 1 || t.length > 100) throw new ValidationError('title は 1〜100 文字です', 'title');
    return t;
  }
  function checkDueDate(dueDate: string | null | undefined): string | null {
    if (dueDate === null || dueDate === undefined) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new ValidationError('dueDate は YYYY-MM-DD です', 'dueDate');
    if (dueDate < today()) throw new ValidationError('締め切りが過ぎています', 'dueDate');
    return dueDate;
  }
  async function checkUniqueTitle(title: string, exceptId?: number): Promise<void> {
    // 変更（第6部）: 全部を読んで探さず、データの層に1つの SQL で探させる
    if (await repo.findOpenByTitle(title, exceptId)) {
      throw new ConflictError('同じ題名の、終わっていないタスクがあります');
    }
  }
  async function mustGet(id: number): Promise<Task> {
    const task = await repo.get(id);
    if (!task) throw new NotFoundError(`タスク ${id} はありません`);
    return task;
  }

  return {
    /** 変更（第6部）: 絞り込み・並べ方・ページ分けを、まとめてデータの層（1つの SQL）に任せる */
    listPage(q: ListPageQuery) {
      return repo.listPage(q);
    },

    get: mustGet,

    async create({ title, dueDate }: CreateInput): Promise<Task> {
      const t = checkTitle(title);
      const d = checkDueDate(dueDate);
      await checkUniqueTitle(t);
      const now = clock().toISOString();
      const task = await repo.insert({ title: t, status: 'todo', dueDate: d, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
      publish('task.created', task); // 追加（成果物）: 覚え終わってから知らせる
      return task;
    },

    /**
     * options.expectedVersion: 追加（成果物）。客が見ていた版。違えば PreconditionFailedError
     */
    async update(id: number, changes: UpdateInput = {}, { expectedVersion }: VersionCheck = {}): Promise<Task> {
      const current = await mustGet(id);
      if (expectedVersion !== undefined && current.version !== expectedVersion) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      const next: Partial<TaskFields> = {};
      const has = (k: keyof UpdateInput) => Object.hasOwn(changes, k);

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
        // 変更（第7部）: 型ガードで確かめると、この後の changes.status は Status になる
        const status = changes.status;
        if (!isStatus(status)) throw new ValidationError(`status は ${STATUSES.join('・')} のどれかです`, 'status');
        // 追加: 「作業中」は同時に maxDoing 個まで（WIP 制限）
        if (status === 'doing') {
          const doing = await repo.countByStatus('doing'); // 変更（第6部）
          if (doing >= maxDoing) throw new ConflictError(`作業中のタスクは ${maxDoing} 個までです`);
        }
        // やり直したタスクの題名が、別の終わっていないタスクと重なることもある
        if (current.status === 'done') await checkUniqueTitle(next.title ?? current.title, id);
        next.status = status;
        next.completedAt = status === 'done' ? clock().toISOString() : null;
      }
      if (Object.keys(next).length === 0) return current; // 何も変わらないなら、version も上げない
      // 追加（成果物）: 確かめてから、ここまでの間に（await の間に）ほかの人が変えていたら、データの層が null を返す
      const updated = await repo.update(id, { ...next, updatedAt: clock().toISOString(), version: current.version + 1 }, { expectedVersion: current.version });
      if (!updated) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      publish('task.updated', updated);
      return updated;
    },

    async remove(id: number, { expectedVersion }: VersionCheck = {}): Promise<void> {
      const current = await mustGet(id);
      if (expectedVersion !== undefined && current.version !== expectedVersion) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      if (!(await repo.remove(id, { expectedVersion: current.version }))) throw new PreconditionFailedError('ほかの人が先に変えました。読み直してください');
      publish('task.deleted', current); // 追加（成果物）: 消す前の中身を知らせる（画面は id で一覧から外す）
    },
  };
}

/** 追加（第7部）: サービスの型。createTaskService の戻り値から作る */
export type TaskService = ReturnType<typeof createTaskService>;
