// 会議室の管理（/admin/rooms。第69章 6節）。管理者だけ（RequireAdmin の中に置く。守っているのは API の 403）
import { useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, toFieldErrors } from '../api/client.ts';
import { useCreateRoom, useRooms, useUpdateRoom } from '../api/queries.ts';
import { RoomInputSchema, type Room } from '../api/schemas.ts';
import { useAnnounce } from '../components/Announcer.tsx';
import { Field } from '../components/Field.tsx';
import { PageTitle } from '../components/PageTitle.tsx';
import { errorMessage } from '../lib/errors.ts';

/** Zod の失敗を「項目の名前 → 文」にする（API の 422 と同じ形） */
function issuesToFields(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0] ?? '')] ??= i.message;
  return out;
}

/** 1つの会議室の行。名前・定員・使えるかを変えて「保存」 */
function RoomRow({ room }: { room: Room }): ReactNode {
  const [name, setName] = useState(room.name);
  const [capacity, setCapacity] = useState(String(room.capacity));
  const [active, setActive] = useState(room.active);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateRoom();
  const announce = useAnnounce();

  function save() {
    const parsed = RoomInputSchema.safeParse({ name, capacity });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? '入力を確かめてください');
    setError(null);
    update.mutate(
      { id: room.id, patch: { ...parsed.data, active } },
      {
        onSuccess: (saved) => announce(`${saved.name} を保存しました`),
        onError: (err) => setError(errorMessage(err)),
      },
    );
  }

  return (
    <tr>
      <td>
        <input aria-label={`${room.name} の名前`} value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input
          aria-label={`${room.name} の定員`}
          inputMode="numeric"
          size={4}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </td>
      <td>
        <input
          type="checkbox"
          aria-label={`${room.name} を使える`}
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
      </td>
      <td>
        <button type="button" onClick={save} disabled={update.isPending} aria-label={`${room.name} を保存`}>
          保存
        </button>
        {error !== null && (
          <span role="alert" className="error">
            {' '}
            {error}
          </span>
        )}
      </td>
    </tr>
  );
}

/** 会議室を足すフォーム */
function AddRoomForm(): ReactNode {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useCreateRoom();
  const announce = useAnnounce();

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = RoomInputSchema.safeParse({ name, capacity });
    if (!parsed.success) return setErrors(issuesToFields(parsed.error.issues));
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: (room) => {
        announce(`${room.name} を足しました`);
        setName('');
        setCapacity('');
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 422) setErrors(toFieldErrors(err.problem));
        else setErrors({ name: errorMessage(err) }); // 409（名前が重なる）は名前の欄に
      },
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <h2>会議室を足す</h2>
      <Field
        label="名前"
        name="name"
        type="text"
        value={name}
        onChange={setName}
        error={errors['name']}
        autoComplete="off"
      />
      <Field
        label="定員"
        name="capacity"
        type="text"
        value={capacity}
        onChange={setCapacity}
        error={errors['capacity']}
        autoComplete="off"
      />
      <button type="submit" disabled={create.isPending}>
        足す
      </button>
    </form>
  );
}

export function RoomsAdminPage(): ReactNode {
  const rooms = useRooms({ all: true });
  return (
    <>
      <PageTitle>会議室の管理</PageTitle>
      {rooms.isPending ? (
        <p>読み込み中…</p>
      ) : rooms.isError ? (
        <p role="alert">{errorMessage(rooms.error)}</p>
      ) : (
        <table className="rooms">
          <thead>
            <tr>
              <th scope="col">名前</th>
              <th scope="col">定員</th>
              <th scope="col">使える</th>
              <th scope="col">
                <span className="visually-hidden">保存</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.data.map((room) => (
              // 保存した後の値で行を作り直す（入力の state を、サーバの値にそろえる。第8部の成果物の key と同じ考え）
              <RoomRow key={`${room.id}:${room.name}:${room.capacity}:${String(room.active)}`} room={room} />
            ))}
          </tbody>
        </table>
      )}
      <AddRoomForm />
    </>
  );
}
