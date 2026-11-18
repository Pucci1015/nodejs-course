# src/pages — 第10部の成果物の完成例（画面）

第8部の画面に、ログインのページを足したものです（第10部で足したものは、表の「第10部」の行）。完成例の全体は [../../README.md](../../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [ForgotPasswordPage.tsx](ForgotPasswordPage.tsx) | 第10部: パスワードの再設定（/forgot-password）。登録されているかに関係なく、同じ文を出す |
| [LoginPage.tsx](LoginPage.tsx) | 第10部: ログイン（/login）。できたら `?next=` のページへ（このサイトの中だけ）。確認がまだなら、確認のメールを送り直せる。IdP から戻ったときの `?error=` の理由も出す |
| [RegisterPage.tsx](RegisterPage.tsx) | 第10部: 登録（/register）。422 はその欄の横に。送れたら「メールを送りました」 |
| [ResetPasswordPage.tsx](ResetPasswordPage.tsx) | 第10部: 新しいパスワード（/reset-password#token=…） |
| [VerifyEmailPage.tsx](VerifyEmailPage.tsx) | 第10部: メールアドレスの確認（/verify-email#token=…）。開いただけでは送らず、ボタンで POST する |
| [ErrorPage.tsx](ErrorPage.tsx) | 描くときに投げられた失敗を受け止める（第44章 2.3節）。ここに来るのはバグなので、中身は見せない |
| [NewTaskPage.tsx](NewTaskPage.tsx) | 新しいタスク（/tasks/new）。作れたら、そのタスクの画面へ |
| [NotFoundPage.tsx](NotFoundPage.tsx) | どの URL にも合わないとき・タスクが無いとき |
| [TaskDetailPage.tsx](TaskDetailPage.tsx) | 1つのタスク（/tasks/:id）。状態を変える・題名と締め切りを直す・消す |
| [TaskListPage.tsx](TaskListPage.tsx) | 一覧（/）。条件は URL、データは TanStack Query、題名の絞り込みは読み込んだものの中から |
