// 第50章 6節: /help/start など。generateStaticParams で、ビルドのときに全部のページを作っておく
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HELP_TOPICS, findTopic } from '../../../lib/help.ts';

/** ビルドのときに作る [topic] の値の一覧 */
export function generateStaticParams() {
  return HELP_TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: PageProps<'/help/[topic]'>): Promise<Metadata> {
  const topic = findTopic((await params).topic);
  return { title: topic ? `ヘルプ: ${topic.title}` : 'ヘルプ' };
}

export default async function HelpPage({ params }: PageProps<'/help/[topic]'>) {
  const topic = findTopic((await params).topic);
  if (topic === undefined) notFound();
  return (
    <>
      <h1>{topic.title}</h1>
      <p>{topic.body}</p>
    </>
  );
}
