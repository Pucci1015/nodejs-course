-- ユーザーの役割（第68章 2節）。今いる人は全員 member になる。管理者は scripts/grant-admin.ts で決める
ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'member' CONSTRAINT users_role_check CHECK (role IN ('member', 'admin'));
