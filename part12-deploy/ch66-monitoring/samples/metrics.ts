// 第66章 3節: 数を数えて、Prometheus の文字の形で出す（カウンタとヒストグラム）
// app.ts が import する

/** 増えるだけの数。ラベル（method・status など）の組ごとに数える */
export class Counter {
  readonly name: string;
  readonly help: string;
  readonly #values = new Map<string, number>();
  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels: Record<string, string> = {}, by = 1): void {
    const key = labelText(labels);
    this.#values.set(key, (this.#values.get(key) ?? 0) + by);
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [key, v] of this.#values) lines.push(`${this.name}${key} ${v}`);
    return lines.join('\n');
  }
}

/** かかった時間などを、決めた区切り（バケツ）ごとに数える */
export class Histogram {
  readonly name: string;
  readonly help: string;
  readonly buckets: number[];
  readonly #counts: number[];
  #sum = 0;
  #count = 0;
  constructor(name: string, help: string, buckets: number[]) {
    this.name = name;
    this.help = help;
    this.buckets = buckets;
    this.#counts = buckets.map(() => 0);
  }

  observe(value: number): void {
    this.#sum += value;
    this.#count += 1;
    this.buckets.forEach((le, i) => {
      if (value <= le) this.#counts[i] = (this.#counts[i] ?? 0) + 1; // その区切り「以下」を全部数える（累積）
    });
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    this.buckets.forEach((le, i) => lines.push(`${this.name}_bucket{le="${le}"} ${this.#counts[i] ?? 0}`));
    lines.push(`${this.name}_bucket{le="+Inf"} ${this.#count}`, `${this.name}_sum ${this.#sum}`, `${this.name}_count ${this.#count}`);
    return lines.join('\n');
  }
}

/** 今の値を、聞かれたときに読む数（メモリ・イベントループの遅れなど） */
export class Gauge {
  readonly name: string;
  readonly help: string;
  readonly read: () => number;
  constructor(name: string, help: string, read: () => number) {
    this.name = name;
    this.help = help;
    this.read = read;
  }
  render(): string {
    return [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`, `${this.name} ${this.read()}`].join('\n');
  }
}

function labelText(labels: Record<string, string>): string {
  const parts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
  return parts.length === 0 ? '' : `{${parts.join(',')}}`;
}
