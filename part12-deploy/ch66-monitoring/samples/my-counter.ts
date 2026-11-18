// 第66章 3.2節: ラベルの組ごとに数えるカウンタ（完成形は metrics.ts の Counter）
// 動かし方（章のフォルダで）: node samples/my-counter.ts
class Counter {
  readonly name: string;
  readonly #values = new Map<string, number>();
  constructor(name: string) {
    this.name = name;
  }

  inc(labels: Record<string, string>): void {
    const key = '{' + Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}';
    this.#values.set(key, (this.#values.get(key) ?? 0) + 1);
  }

  render(): string {
    return [...this.#values].map(([key, v]) => `${this.name}${key} ${v}`).join('\n');
  }
}

const c = new Counter('http_requests_total');
c.inc({ method: 'GET', status: '200' });
c.inc({ method: 'GET', status: '200' });
c.inc({ method: 'GET', status: '500' });
console.log(c.render());
