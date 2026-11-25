#!/usr/bin/env bash
# 本文10.1節「手を動かす」の完成形: 環境変数 GREETING を表示する
echo "GREETING は「${GREETING:-（なし）}」です"
