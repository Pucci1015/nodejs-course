// 練習問題で使う、本文の samples のコピー（書き換えなくてよい）。第57章 2節: テストの中で、アプリを空いているポートで起動する部品
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';

export interface Started {
  base: string; // 'http://127.0.0.1:ポート'
  close(): Promise<void>;
}

export function startApp(app: Express): Promise<Started> {
  return new Promise((resolve, reject) => {
    // ポート 0 は「空いている番号を OS に選んでもらう」。テストを同時に動かしても、ぶつからない
    const server: Server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo; // listen の後なので、いつも AddressInfo
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
    server.once('error', reject);
  });
}
