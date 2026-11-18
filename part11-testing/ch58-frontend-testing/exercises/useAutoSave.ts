// 練習問題8で確かめるフック: 打つのが止まったら、自動で保存する（書き換えなくてよい）
import { useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface SaveRecord<T> {
  status: 'idle' | 'saving' | 'saved' | 'error';
  value: T;
}

/**
 * value が変わってから delayMs ミリ秒、次の変更が無ければ save(value) を呼ぶ
 * - 保存してある値（最初は、最初の値）と同じなら保存しない
 * - 待っている間にアンマウントされたら、待たずにすぐ保存する（打った分を失わない）
 */
export function useAutoSave<T>(value: T, save: (value: T) => Promise<void>, delayMs = 1000): SaveStatus {
  const [record, setRecord] = useState<SaveRecord<T>>({ status: 'idle', value });
  const saveRef = useRef(save);
  // 待っている保存（アンマウントのときに、すぐ動かす）
  const flushRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    saveRef.current = save;
  });

  // アンマウントのとき、待っている保存があれば、すぐ保存する（下の useEffect の片付けより先に動くよう、先に書く）
  useEffect(() => () => flushRef.current?.(), []);

  useEffect(() => {
    if (Object.is(value, record.value)) {
      flushRef.current = null;
      return;
    }
    flushRef.current = () => void saveRef.current(value);
    const id = setTimeout(() => {
      flushRef.current = null;
      setRecord({ status: 'saving', value });
      saveRef.current(value).then(
        () => setRecord((r) => (Object.is(r.value, value) ? { status: 'saved', value } : r)),
        () => setRecord((r) => (Object.is(r.value, value) ? { status: 'error', value } : r)),
      );
    }, delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs, record.value]);

  // 保存してある値と違えば「待っている」
  return Object.is(value, record.value) ? record.status : 'pending';
}
