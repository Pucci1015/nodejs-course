// 第70章 練習問題3 の模範解答: render.yaml に、入れ忘れた環境変数が無いか調べる（本文 5.1節）
import { z } from 'zod';

/** 本番（NODE_ENV=production）で、アプリの loadConfig が「必須」と断るもの（src/config.ts） */
export const REQUIRED_IN_PRODUCTION = [
  'NODE_ENV',
  'SESSION_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'METRICS_TOKEN',
] as const;

// render.yaml のうち、この問題で使うところだけの形。value・generateValue・fromDatabase などは読まない
const EnvVar = z.union([z.object({ key: z.string() }), z.object({ fromGroup: z.string() })]);
export const Blueprint = z.object({
  envVarGroups: z.array(z.object({ name: z.string(), envVars: z.array(z.object({ key: z.string() })) })).default([]),
  services: z.array(z.object({ name: z.string(), envVars: z.array(EnvVar).default([]) })),
});

/**
 * サービス（serviceName）に渡る環境変数の名前を、重なりなしでアルファベット順に
 * - blueprint は render.yaml を yaml の parse で読んだもの。Blueprint で確かめてから使う
 * - サービスの envVars の key と、fromGroup で名前を挙げたグループの envVars の key
 * - サービスが無い・グループが無いときは Error を投げる（文に、その名前を入れる）
 */
export function envKeysOf(blueprint: unknown, serviceName: string): string[] {
  // 追加: 外から来たもの（YAML）は、Zod で形を確かめてから使う（第38章）。形が違えば ZodError が投げられる
  const { envVarGroups, services } = Blueprint.parse(blueprint);
  const service = services.find((s) => s.name === serviceName);
  if (service === undefined) throw new Error(`サービス ${serviceName} が render.yaml にありません`);
  const keys = new Set<string>();
  for (const v of service.envVars) {
    // 追加: 'key' in v で、どちらの形かを絞り込む（第36章 1節）
    if ('key' in v) {
      keys.add(v.key);
      continue;
    }
    const group = envVarGroups.find((g) => g.name === v.fromGroup);
    if (group === undefined) throw new Error(`グループ ${v.fromGroup} が render.yaml にありません`);
    for (const g of group.envVars) keys.add(g.key);
  }
  // 追加: Set で重なりを消し、配列にしてから並べる
  return [...keys].toSorted();
}

/** required のうち、サービスに渡らないものを、required の順に */
export function missingEnv(blueprint: unknown, serviceName: string, required: readonly string[]): string[] {
  const keys = new Set(envKeysOf(blueprint, serviceName));
  return required.filter((name) => !keys.has(name));
}
