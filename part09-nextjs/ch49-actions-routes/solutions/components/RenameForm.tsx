'use client';
// 第49章 練習問題6の模範解答: 題名を変えるフォーム。useActionState で結果を持ち、useFormStatus で送っている間を出す
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { RenameState } from '../app/tasks/[id]/actions.ts';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '変えています…' : '変える'}
    </button>
  );
}

export function RenameForm({ title, action }: { title: string; action: (prev: RenameState, formData: FormData) => Promise<RenameState> }) {
  const [state, formAction] = useActionState(action, { error: null, title });
  return (
    // 送った後、React は入力欄を空にする。返ってきた題名で作り直すために key を変える
    <form action={formAction} key={state.title}>
      <label>
        題名 <input name="title" defaultValue={state.title} aria-invalid={state.error ? true : undefined} />
      </label>{' '}
      <SubmitButton />
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
