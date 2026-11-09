# 練習問題7で使う「壊れた」スクリプト。直して動くようにすること。
cd ~
today=$(date +%Y-%m-%d)
count=$(ls | wc -l)
echo "今日は $today です"
echo "ホームには $count 個のファイル/フォルダがあります"
