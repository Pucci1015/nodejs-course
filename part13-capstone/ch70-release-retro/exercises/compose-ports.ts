// 第70章 練習問題6: compose のファイルどうしで、Mac のポートがぶつからないか調べる（本文 3.1節）
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
  // ここを書く（YAML は import { parse } from 'yaml' で読み、ComposeFile で確かめる）
  void ComposeFile;
  throw new Error(`まだ書いていません（${file} ${text.length}）`);
}

/**
 * ぶつかるポート。Mac の番号が同じで、IP が同じか、どちらかが '0.0.0.0' のもの
 * - { hostPort, users } の配列。users は 'ファイル サービス'（'compose.prod.yaml mail'）を、list の順に
 * - hostPort の小さい順
 */
export function portConflicts(list: Published[]): { hostPort: number; users: string[] }[] {
  // ここを書く
  throw new Error(`まだ書いていません（${list.length}）`);
}
