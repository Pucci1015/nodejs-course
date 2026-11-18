-- 追加（第10部）: ユーザー・外のログイン・メールのトークン・セッションの表

-- ユーザー。メールアドレスは小文字にそろえて保存する。外のログインだけの人は、パスワードもアドレスも無いことがある
CREATE TABLE users (
  id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             text        CONSTRAINT users_email_check CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  password_hash     text,       -- Argon2id の PHC 文字列（第51章 3節）
  email_verified_at timestamptz, -- NULL なら、まだ確認していない（第53章 5節）
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email ON users (email);

-- 外のログイン（OpenID Connect）とユーザーの結びつき。sub は IdP ごとに一意なので、issuer と組にする（第54章 6節）
CREATE TABLE user_identities (
  issuer     text        NOT NULL,
  subject    text        NOT NULL,
  user_id    integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject)
);

-- メールのリンクのトークン。トークンそのものではなく、SHA-256 のハッシュを保存する（第53章 4節）
CREATE TABLE email_tokens (
  token_hash text        PRIMARY KEY,
  user_id    integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    text        NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at timestamptz NOT NULL
);
CREATE INDEX email_tokens_user ON email_tokens (user_id, purpose);

-- ログインのセッション（express-session の中身）。サーバを2台にしても、起動し直しても残る（第52章 2.3節）
CREATE TABLE sessions (
  sid        text        PRIMARY KEY,
  user_id    integer     REFERENCES users (id) ON DELETE CASCADE, -- 「すべての端末からログアウト」で使う
  data       jsonb       NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expires_at ON sessions (expires_at);
