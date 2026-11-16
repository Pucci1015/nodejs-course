-- 3: 終わった時刻の列を足す
ALTER TABLE tasks ADD COLUMN completed_at timestamptz;
