// Next.js の設定（第47章 2節）。第9部のアプリは、どれもこの形
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components（第50章）。今の Next.js の、おすすめの決まり（create-next-app の既定）
  cacheComponents: true,
  partialPrefetching: true,
  // 開発サーバが AGENTS.md（AI 向けの説明）を作らないようにする
  agentRules: false,
  // ビルドの結果を置くフォルダ。練習問題のテストは .next-test を使い、自分で動かしている next dev とぶつからないようにする
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
