// 第66章 2.3節: 1 行 1 つの JSON のログを、標準入力から読んで、条件に合うものだけを出す
// 動かし方（章のフォルダで）: node samples/log-query.ts --slow 100 < app.log
//                             node samples/log-query.ts --id 71af4da9-… < app.log
import readline from 'node:readline';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { slow: { type: 'string' }, id: { type: 'string' } } });
const slowMs = values.slow === undefined ? undefined : Number(values.slow);

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  let entry: unknown;
  try {
    entry = JSON.parse(line);
  } catch {
    continue; // JSON でない行は飛ばす
  }
  if (typeof entry !== 'object' || entry === null) continue;
  const ms = 'ms' in entry ? entry.ms : undefined;
  if (slowMs !== undefined && !(typeof ms === 'number' && ms >= slowMs)) continue;
  if (values.id !== undefined) {
    const ids = ['errorId' in entry ? entry.errorId : undefined, 'reqId' in entry ? entry.reqId : undefined];
    if (!ids.includes(values.id)) continue;
  }
  console.log(line);
}
