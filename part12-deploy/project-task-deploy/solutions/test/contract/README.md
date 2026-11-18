# test/contract — 契約テスト（第11部で追加）

| ファイル                                       | 中身                                                                                                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [task-repo-contract.ts](task-repo-contract.ts) | `TaskRepo`（`src/types.ts`）の約束を並べたテスト。リポジトリを作る関数を受け取る（第57章 6節）                                                                                            |
| [blob-store.test.ts](blob-store.test.ts)       | 第12部: `BlobStore`（`src/storage/blob-store.ts`）の約束を、メモリの偽物（`../support/memory-blob-store.ts`）と S3 版（練習用の mini-s3。テストごとに起動し直して空にする）の両方に動かす |
| [task-repo.test.ts](task-repo.test.ts)         | 同じ約束を、メモリの偽物（`../support/memory-tasks.ts`）と PostgreSQL（`src/repositories/pg-tasks.ts`）の両方に動かす。PostgreSQL だけの約束（別の人のタスクは見えない）も1つ             |

PostgreSQL のリポジトリは持ち主で絞るので、テストごとに新しいユーザーを作れば、空のリポジトリになります（表を空にしなくてよい）。偽物が本物と同じように動くことをここで確かめておくと、偽物を使う単体テスト（`../unit/`）を信じられます。
