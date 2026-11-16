// 第50章 2節: /clock。3つの時刻で、「いつ作られたか」の違いを見る
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { connection } from 'next/server';
import { Suspense } from 'react';

export const metadata: Metadata = { title: '時計' };

const time = () => new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' });

/** ビルドのときに1回だけ作り、ずっと使う */
async function BuildTime() {
  'use cache';
  cacheLife('max');
  return <p>A. ビルドのときの時刻: {time()}</p>;
}

/** 作ってから1分たつと、次に開いたときに、裏で作り直す */
async function MinuteTime() {
  'use cache';
  cacheLife('minutes');
  return <p>B. 1分ごとに新しくなる時刻: {time()}</p>;
}

/** 覚えておく長さがとても短い（5分より短い）と、前もって作る HTML には入らず、リクエストが来てから作る */
async function SecondsTime() {
  'use cache';
  cacheLife('seconds');
  return <p>D. 数秒ごとに新しくなる時刻: {time()}</p>;
}

/** 開くたびに作る。connection() で「ここから先は、リクエストが来てから」と知らせる */
async function RequestTime() {
  await connection();
  return <p>C. 開いた時刻: {time()}</p>;
}

export default function ClockPage() {
  return (
    <>
      <h1>時計</h1>
      <BuildTime />
      <MinuteTime />
      <Suspense fallback={<p>C. 開いた時刻: …</p>}>
        <RequestTime />
      </Suspense>
      <Suspense fallback={<p>D. 数秒ごとに新しくなる時刻: …</p>}>
        <SecondsTime />
      </Suspense>
    </>
  );
}
