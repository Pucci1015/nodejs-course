-- Idempotency-Key で覚えた応答（第25章 8節）。サーバを再起動しても、2台にしても、送り直しを見分けられる
CREATE TABLE idempotency_keys (
  key         text        PRIMARY KEY,
  fingerprint text        NOT NULL,
  status      text        NOT NULL CHECK (status IN ('running', 'done')),
  response    jsonb,
  expires_at  timestamptz NOT NULL
);

-- 期限の切れたものを、まとめて消すときに使う
CREATE INDEX idempotency_keys_expires_at ON idempotency_keys (expires_at);
