// 練習問題2 の模範解答

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AppEnv = 'development' | 'test' | 'production';

export type Config = {
  port: number;
  host: string;
  logLevel: LogLevel;
  env: AppEnv;
  databaseUrl: string | null;
};

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`設定が正しくありません: ${problems.join(' / ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

function isLogLevel(text: string): text is LogLevel {
  return text === 'debug' || text === 'info' || text === 'warn' || text === 'error';
}

function isAppEnv(text: string): text is AppEnv {
  return text === 'development' || text === 'test' || text === 'production';
}

/** 環境変数を読む。無いか空なら undefined */
function read(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]; // NodeJS.ProcessEnv の値は string | undefined
  return value === undefined || value === '' ? undefined : value;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const problems: string[] = [];

  const portText = read(env, 'PORT');
  let port = 9470;
  if (portText !== undefined) {
    const n = Number(portText);
    if (Number.isInteger(n) && n >= 1 && n <= 65535) port = n;
    else problems.push(`PORT は 1〜65535 の整数です（${portText}）`);
  }

  const levelText = read(env, 'LOG_LEVEL') ?? 'info';
  let logLevel: LogLevel = 'info';
  if (isLogLevel(levelText)) logLevel = levelText;
  else problems.push(`LOG_LEVEL は debug・info・warn・error のどれかです（${levelText}）`);

  const envText = read(env, 'NODE_ENV') ?? 'development';
  let appEnv: AppEnv = 'development';
  if (isAppEnv(envText)) appEnv = envText;
  else problems.push(`NODE_ENV は development・test・production のどれかです（${envText}）`);

  const databaseUrl = read(env, 'DATABASE_URL') ?? null;
  if (appEnv === 'production' && databaseUrl === null) problems.push('production では DATABASE_URL が必須です');

  if (problems.length > 0) throw new ConfigError(problems);
  return { port, host: read(env, 'HOST') ?? '127.0.0.1', logLevel, env: appEnv, databaseUrl };
}
