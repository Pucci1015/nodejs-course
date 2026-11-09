// npm run が用意する環境変数を表示する（第14章 9節）
const env = process.env;
console.log('npm_lifecycle_event :', env.npm_lifecycle_event); // 実行中のスクリプトの名前
console.log('npm_package_name    :', env.npm_package_name);
console.log('npm_package_version :', env.npm_package_version);
console.log('npm_execpath        :', env.npm_execpath?.replace(/^.*\/(lib\/node_modules\/)/, '…/$1'));
console.log('INIT_CWD            :', env.INIT_CWD?.replace(/^.*\/samples\//, '…/samples/')); // npm を実行した場所
