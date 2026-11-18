// 第63章 練習問題7: ファイルを受け取って BlobStore に置き、アプリが中継して返すルーター（本文 5・6節）
import express, { type Router } from 'express';
import type { BlobStore } from '../samples/blob-store.ts';
import { sniff } from '../samples/sniff.ts';

export type UploadRouterOptions = {
  store: BlobStore;
  /** 受け付ける大きさの上限（バイト） */
  maxBytes: number;
  /** 新しい ID を作る（本番は randomUUID） */
  newId: () => string;
};

export function createUploadRouter(options: UploadRouterOptions): Router {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof options} ${typeof express} ${typeof sniff}）`);
}
