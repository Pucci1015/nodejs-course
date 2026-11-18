// 第53章 練習問題7: メールを後ろで1通ずつ送る列（本文7節）
import type { Mail } from './mailer.ts';

export function createMailQueue(send: (mail: Mail) => Promise<void>, { onError = (_mail: Mail, _err: unknown) => {} } = {}) {
  // ここを書く
  void [send, onError];
  return {
    /** 列に足すだけで、すぐ戻る（送り終わるのを待たない） */
    enqueue(mail: Mail): void {
      throw new Error(`まだ書いていません: ${mail.to}`);
    },
    /** まだ送っていない数（送っている途中の1通は含めない） */
    pending(): number {
      throw new Error('まだ書いていません');
    },
    /** 列が空になり、送っている途中のものも終わったら解決する Promise */
    idle(): Promise<void> {
      throw new Error('まだ書いていません');
    },
  };
}
