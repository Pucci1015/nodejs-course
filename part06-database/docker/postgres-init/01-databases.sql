-- PostgreSQL のコンテナを最初に作ったとき（データが空のとき）に、1回だけ動く SQL
-- 第32章は app、第33章は ch33、成果物は taskapi のデータベースを使う（テーブルの名前がぶつからないように）
CREATE DATABASE ch33 OWNER app;
CREATE DATABASE taskapi OWNER app;
