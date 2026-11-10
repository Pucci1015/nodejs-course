// 練習問題6 の解答: アクセスログ（Common Log Format）を配列のメソッドで集計する
// 使い方: node log-summary.mjs ログのファイル
//   例: node log-summary.mjs ../exercises/access.log
// 確かめ方: cd ../exercises && MODULE=../solutions/log-summary.mjs node --test log-summary.test.mjs
import { readFileSync } from 'node:fs';

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// 203.0.113.5 - - [04/Nov/2026:09:03:15 +0900] "GET /static/style.css HTTP/1.1" 200 911
// 名前付きのグループ（?<name>）を使うと、match.groups.name で取り出せる
const LINE = /^(?<ip>\S+) \S+ \S+ \[(?<day>\d{2})\/(?<mon>[A-Z][a-z]{2})\/(?<year>\d{4}):(?<hh>\d{2}):(?<mm>\d{2}):(?<ss>\d{2}) (?<tz>[+-]\d{4})\] "(?<method>[A-Z]+) (?<target>\S+) HTTP\/[\d.]+" (?<status>\d{3}) (?<bytes>\d+|-)$/;

/** 1行を解析する。形が違う行は null */
export function parseLine(line) {
  const m = LINE.exec(line.trim());
  if (!m || !(m.groups.mon in MONTHS)) return null;
  const g = m.groups;
  // +0900 → +09:00 にして、ISO 8601 の文字列から Date を作る（タイムゾーンを正しく扱うため）
  const iso = `${g.year}-${String(MONTHS[g.mon] + 1).padStart(2, '0')}-${g.day}T${g.hh}:${g.mm}:${g.ss}${g.tz.slice(0, 3)}:${g.tz.slice(3)}`;
  return {
    ip: g.ip,
    time: new Date(iso),
    hour: g.hh, // ログに書かれた時刻の「時」（ログのタイムゾーンのまま）
    method: g.method,
    path: g.target.split('?')[0],
    status: Number(g.status),
    bytes: g.bytes === '-' ? 0 : Number(g.bytes),
  };
}

/** 解析した行の配列を集計する */
export function summarize(entries, { top = 3 } = {}) {
  const total = entries.length;
  const countBy = (keyFn) =>
    entries.reduce((acc, e) => {
      const k = keyFn(e);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const pathCounts = countBy((e) => e.path);
  const topPaths = Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .toSorted((a, b) => b.count - a.count || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .slice(0, top);

  const serverErrors = entries.filter((e) => e.status >= 500).length;
  const times = entries.map((e) => e.time.getTime());

  return {
    total,
    byStatusClass: countBy((e) => `${Math.floor(e.status / 100)}xx`),
    byMethod: countBy((e) => e.method),
    byHour: countBy((e) => e.hour),
    topPaths,
    uniqueIps: new Set(entries.map((e) => e.ip)).size,
    bytesTotal: entries.reduce((sum, e) => sum + e.bytes, 0),
    serverErrorRate: total === 0 ? 0 : Math.round((serverErrors / total) * 1000) / 1000,
    first: total === 0 ? null : new Date(Math.min(...times)),
    last: total === 0 ? null : new Date(Math.max(...times)),
  };
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error('使い方: node log-summary.mjs ログのファイル');
    process.exit(2);
  }
  const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '');
  const entries = lines.map(parseLine);
  const bad = entries.filter((e) => e === null).length;
  console.log(summarize(entries.filter(Boolean)));
  if (bad > 0) console.error(`読めなかった行: ${bad}`);
}
