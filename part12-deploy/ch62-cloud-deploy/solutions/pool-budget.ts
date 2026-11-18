// 第62章 練習問題3: 接続の数の予算（本文4.2節）

export type Budget = {
  /** データベースが受け付ける接続の数（PostgreSQL の max_connections） */
  maxConnections: number;
  /** 管理のために残しておく数（PostgreSQL の superuser_reserved_connections など） */
  reserved: number;
  /** アプリのほかに使う数（マイグレーション、psql、ワーカーなど） */
  others: number;
  /** アプリのインスタンス（コンテナ）の数 */
  instances: number;
  /** 1つのインスタンスの中のプロセスの数 */
  processesPerInstance: number;
  /** デプロイの間、古い版と新しい版が同時に動くなら true */
  overlapDuringDeploy: boolean;
};

/** アプリが使ってよい接続の数 */
function available(b: Omit<Budget, 'instances'>): number {
  return b.maxConnections - b.reserved - b.others;
}

/** 同時に動くプロセスの数（1台あたり） */
function processesPer(b: Omit<Budget, 'instances'>): number {
  return b.processesPerInstance * (b.overlapDuringDeploy ? 2 : 1);
}

/** 1つのプロセスの Pool の max にしてよい数 */
export function poolMax(budget: Budget): number {
  const n = Math.floor(available(budget) / (budget.instances * processesPer(budget)));
  if (n < 1) throw new Error('接続が足りません（台数を減らすか、データベースを大きくします）');
  return n;
}

/** Pool の max を poolSize にしたとき、インスタンスをいくつまで増やせるか */
export function maxInstances(budget: Omit<Budget, 'instances'>, poolSize: number): number {
  return Math.max(0, Math.floor(available(budget) / (poolSize * processesPer(budget))));
}
