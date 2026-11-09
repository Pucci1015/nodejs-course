// トップレベル await を使う ES Modules の例（第14章 4節）
// 読み込むのに「待つ」必要があるので、CommonJS の require（同期）では読み込めない
const config = await Promise.resolve({ debug: true });
export const debug = config.debug;
