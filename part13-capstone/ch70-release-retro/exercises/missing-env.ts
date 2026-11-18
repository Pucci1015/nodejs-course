// 第70章 練習問題3: render.yaml に、入れ忘れた環境変数が無いか調べる（本文 5.1節）
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
  // ここを書く
  void Blueprint;
  throw new Error(`まだ書いていません（${typeof blueprint} ${serviceName}）`);
}

/** required のうち、サービスに渡らないものを、required の順に */
export function missingEnv(blueprint: unknown, serviceName: string, required: readonly string[]): string[] {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof blueprint} ${serviceName} ${required.length}）`);
}
