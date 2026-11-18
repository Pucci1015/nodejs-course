// 第66章 練習問題5: ヒストグラム。バケツごとに数え、そこからパーセンタイルを推定する（本文 3節）

export type Snapshot = { buckets: { le: number; count: number }[]; sum: number; count: number };

export class Histogram {
  readonly #bounds: number[];
  readonly #counts: number[]; // バケツごとの数（累積でない）。最後は +Inf のぶん
  #sum = 0;
  #count = 0;

  constructor(buckets: number[]) {
    if (buckets.length === 0) throw new Error('buckets が空です');
    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i] ?? Number.NaN;
      if (!Number.isFinite(b) || (i > 0 && b <= (buckets[i - 1] ?? 0))) {
        throw new Error('buckets は、小さい順に並んだ、重ならない数です');
      }
    }
    this.#bounds = [...buckets];
    this.#counts = Array.from({ length: buckets.length + 1 }, () => 0);
  }

  observe(value: number): void {
    if (Number.isNaN(value)) return; // 数でないものは数えない
    let i = this.#bounds.findIndex((le) => value <= le);
    if (i === -1) i = this.#bounds.length; // どの区切りより大きい → +Inf
    this.#counts[i] = (this.#counts[i] ?? 0) + 1;
    this.#sum += value;
    this.#count += 1;
  }

  snapshot(): Snapshot {
    let running = 0;
    const les = [...this.#bounds, Infinity];
    const buckets = les.map((le, i) => {
      running += this.#counts[i] ?? 0;
      return { le, count: running };
    });
    return { buckets, sum: this.#sum, count: this.#count };
  }

  quantile(q: number): number {
    if (!(q >= 0 && q <= 1)) throw new Error(`q は 0〜1 です: ${q}`);
    if (this.#count === 0) return Number.NaN;
    const rank = q * this.#count; // 小さい方から何番目あたりか
    const { buckets } = this.snapshot();
    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i];
      if (!b || b.count < rank) continue;
      // +Inf のバケツに入ったら、いちばん大きい区切りを返す（それより先は分からない）
      if (b.le === Infinity) return this.#bounds.at(-1) ?? 0;
      const lower = i === 0 ? 0 : (this.#bounds[i - 1] ?? 0);
      const below = i === 0 ? 0 : (buckets[i - 1]?.count ?? 0);
      const inBucket = b.count - below;
      if (inBucket === 0) return lower;
      // バケツの中は、下の区切りから上の区切りまで一様に散らばっているとして、比で求める
      return lower + (b.le - lower) * ((rank - below) / inBucket);
    }
    return this.#bounds.at(-1) ?? 0;
  }
}
