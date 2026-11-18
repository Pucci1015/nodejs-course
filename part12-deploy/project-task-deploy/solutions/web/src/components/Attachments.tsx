// 追加（第12部）: タスクの添付ファイル（画像）。一覧・置く・消す（第63章）
// 画像は <img src="/api/tasks/…/content">。サーバが署名付き URL へ送り直し（302）、ブラウザはストレージから直接読む
import { useId, useRef, type ReactNode } from 'react';
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '../api/queries.ts';
import { errorMessage } from '../lib/errors.ts';
import { useAnnounce } from './Announcer.tsx';
import styles from './Attachments.module.css';

/** 1234567 → '1.2 MB' */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ taskId }: { taskId: number }): ReactNode {
  const list = useAttachments(taskId);
  const upload = useUploadAttachment(taskId);
  const remove = useDeleteAttachment(taskId);
  const announce = useAnnounce();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const error = upload.error ?? remove.error;

  return (
    <section aria-labelledby={`${inputId}-h`}>
      <h2 id={`${inputId}-h`}>添付ファイル</h2>
      {error && (
        <p role="alert" className="error">
          {errorMessage(error)}
        </p>
      )}
      {list.isPending && <p>読み込んでいます…</p>}
      {list.isError && <p className="error">{errorMessage(list.error)}</p>}
      {list.data?.length === 0 && <p>添付ファイルはありません</p>}
      {list.data !== undefined && list.data.length > 0 && (
        <ul className={styles.list}>
          {list.data.map((a) => (
            <li key={a.id} className={styles.item}>
              {/* alt はファイルの名前。画像の中身を説明できないので、何の画像かが分かる名前を付けてもらう */}
              <img src={a.url} alt={a.fileName} className={styles.thumb} loading="lazy" />
              <span className={styles.name}>
                <a href={`${a.url}?download=1`}>{a.fileName}</a>（{formatSize(a.size)}）
              </span>
              <button
                type="button"
                className="danger"
                aria-label={`${a.fileName} を消す`}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(a, {
                    onSuccess: () => announce(`「${a.fileName}」を消しました`),
                  })
                }
              >
                消す
              </button>
            </li>
          ))}
        </ul>
      )}
      <p>
        <label htmlFor={inputId}>画像を添付</label>{' '}
        <input
          id={inputId}
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          disabled={upload.isPending}
          aria-describedby={`${inputId}-hint`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file === undefined) return;
            upload.mutate(file, {
              onSuccess: (a) => announce(`「${a.fileName}」を添付しました`),
              // 同じファイルをもう一度選べるように、選んだものを消す
              onSettled: () => {
                if (input.current !== null) input.current.value = '';
              },
            });
          }}
        />
        <br />
        <small id={`${inputId}-hint`}>PNG・JPEG・GIF・WebP の画像を、1つ 5 MB まで</small>
      </p>
    </section>
  );
}
