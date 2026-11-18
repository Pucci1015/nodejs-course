// 第70章 練習問題6 の模範解答: compose のファイルどうしで、Mac のポートがぶつからないか調べる（本文 3.1節）
import { parse } from 'yaml';
import { z } from 'zod';

/** Mac（ホスト）に出しているポート1つ */
export interface Published {
  file: string; // ファイルの名前（引数でもらったもの）
  service: string; // サービスの名前
  host: string; // 待つ IP。書いていなければ '0.0.0.0'
  hostPort: number; // Mac の番号
  containerPort: number; // コンテナの中の番号
}

// compose のファイルのうち、この問題で使うところだけの形
export const ComposeFile = z.object({
  services: z.record(z.string(), z.object({ ports: z.array(z.union([z.string(), z.number()])).default([]) })),
});

/**
 * compose のファイル（YAML の文字）から、Mac に出しているポートを、書いてある順に
 * - 'IP:Mac:コンテナ'（'127.0.0.1:9913:9900'）と 'Mac:コンテナ'（'5434:5432'。IP は '0.0.0.0'）を読む
 * - コンテナの番号だけ（9229 や '9229'）は、Mac の番号が決まっていないので入れない
 * - ports が無いサービスは飛ばす
 */
export function publishedPorts(file: string, text: string): Published[] {
  const { services } = ComposeFile.parse(parse(text));
  const out: Published[] = [];
  // 追加: Object.entries は、YAML に書いた順（キーを入れた順）に回る
  for (const [service, { ports }] of Object.entries(services)) {
    for (const port of ports) {
      // 追加: 数（9229）は、コンテナの番号だけ
      if (typeof port === 'number') continue;
      const parts = port.split(':');
      if (parts.length === 3) {
        const [host = '', hostPort, containerPort] = parts;
        out.push({ file, service, host, hostPort: Number(hostPort), containerPort: Number(containerPort) });
      } else if (parts.length === 2) {
        const [hostPort, containerPort] = parts;
        out.push({ file, service, host: '0.0.0.0', hostPort: Number(hostPort), containerPort: Number(containerPort) });
      }
      // 1つ（'9229'）は、コンテナの番号だけ
    }
  }
  return out;
}

/** 2つが同じ Mac の番号を取り合うか */
const clash = (a: Published, b: Published) =>
  a.hostPort === b.hostPort && (a.host === b.host || a.host === '0.0.0.0' || b.host === '0.0.0.0');

/**
 * ぶつかるポート。Mac の番号が同じで、IP が同じか、どちらかが '0.0.0.0' のもの
 * - { hostPort, users } の配列。users は 'ファイル サービス'（'compose.prod.yaml mail'）を、list の順に
 * - hostPort の小さい順
 */
export function portConflicts(list: Published[]): { hostPort: number; users: string[] }[] {
  // 追加: Mac の番号ごとにまとめる（第69章 4.3節の Map.groupBy）
  const byPort = Map.groupBy(list, (p) => p.hostPort);
  const out: { hostPort: number; users: string[] }[] = [];
  for (const [hostPort, same] of byPort) {
    // 追加: ほかのどれかとぶつかるものだけを残す（127.0.0.1 と 127.0.0.2 は、ぶつからない）
    const users = same.filter((p) => same.some((q) => q !== p && clash(p, q))).map((p) => `${p.file} ${p.service}`);
    if (users.length > 0) out.push({ hostPort, users });
  }
  return out.toSorted((a, b) => a.hostPort - b.hostPort);
}
