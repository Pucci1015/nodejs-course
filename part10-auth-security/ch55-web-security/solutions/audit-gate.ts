// 第55章 練習問題8 の模範解答: npm audit --json の結果をまとめて、基準をこえたら終了コード 1（本文9節）
// 使い方: npm audit --json | node audit-gate.ts --level high
import { parseArgs } from 'node:util';
import { z } from 'zod';

export const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];
export type Counts = Record<Severity | 'total', number>;
export type Finding = {
  name: string;
  severity: Severity;
  isDirect: boolean;
  advisories: { title: string; url: string }[];
  via: string[];
  fix: string;
};

const SeveritySchema = z.enum(SEVERITIES);
const Advisory = z.looseObject({ title: z.string(), url: z.string() });
const Report = z.looseObject({
  auditReportVersion: z.literal(2),
  vulnerabilities: z.record(
    z.string(),
    z.looseObject({
      name: z.string(),
      severity: SeveritySchema,
      isDirect: z.boolean(),
      // via には、勧告そのもの（オブジェクト）か、「この依存のせい」というパッケージの名前（文字列）が入る
      via: z.array(z.union([z.string(), Advisory])),
      fixAvailable: z.union([z.boolean(), z.looseObject({ name: z.string(), version: z.string(), isSemVerMajor: z.boolean() })]),
    }),
  ),
  metadata: z.looseObject({
    vulnerabilities: z.object({ info: z.number(), low: z.number(), moderate: z.number(), high: z.number(), critical: z.number(), total: z.number() }),
  }),
});

const rank = (s: Severity) => SEVERITIES.indexOf(s);

export function summarize(report: unknown): { counts: Counts; findings: Finding[] } {
  const r = Report.parse(report);
  const findings = Object.values(r.vulnerabilities).map((v): Finding => {
    const fa = v.fixAvailable;
    const fix =
      fa === false
        ? '直す版なし'
        : fa === true
          ? 'npm audit fix'
          : `${fa.name}@${fa.version}${fa.isSemVerMajor ? '（メジャー版の更新）' : ''}`;
    return {
      name: v.name,
      severity: v.severity,
      isDirect: v.isDirect,
      advisories: v.via.filter((x) => typeof x !== 'string').map((x) => ({ title: x.title, url: x.url })),
      via: v.via.filter((x) => typeof x === 'string'),
      fix,
    };
  });
  // 重いものから。同じ重さなら名前の順
  findings.sort((a, b) => rank(b.severity) - rank(a.severity) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { counts: r.metadata.vulnerabilities, findings };
}

export function exceeds(counts: Counts, level: Severity): boolean {
  return SEVERITIES.slice(rank(level)).some((s) => counts[s] > 0);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks).toString('utf8');
}

if (import.meta.main) {
  try {
    const { values } = parseArgs({ options: { level: { type: 'string', default: 'high' } } });
    const level = SeveritySchema.safeParse(values.level);
    if (!level.success) throw new Error(`--level は ${SEVERITIES.join('・')} のどれかにしてください`);
    let report: unknown;
    try {
      report = JSON.parse(await readStdin());
    } catch {
      throw new Error('JSON ではありません');
    }
    const result = Report.safeParse(report);
    if (!result.success) throw new Error('npm audit --json の形ではありません');
    const { counts, findings } = summarize(result.data);
    for (const f of findings) {
      console.log(`${f.severity.padEnd(8)} ${f.name}${f.isDirect ? '（直接の依存）' : ''}  → ${f.fix}`);
      for (const a of f.advisories) console.log(`         ${a.title} ${a.url}`);
    }
    const listed = SEVERITIES.filter((s) => counts[s] > 0).map((s) => `${s} ${counts[s]}`);
    console.log(`合計 ${counts.total} 件${listed.length > 0 ? `（${listed.join('、')}）` : ''}。基準: ${level.data} 以上`);
    if (exceeds(counts, level.data)) {
      console.log('基準をこえています');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('エラー:', err instanceof Error ? err.message : err);
    process.exitCode = 2;
  }
}
