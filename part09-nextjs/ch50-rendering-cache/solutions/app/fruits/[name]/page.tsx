// 第50章 練習問題3の模範解答: /fruits/apple など。generateStaticParams で、3つのページをビルドのときに作る
import { notFound } from 'next/navigation';
import { FRUITS, findFruit } from '../../../lib/fruits.ts';

export function generateStaticParams() {
  return FRUITS.map((f) => ({ name: f.name }));
}

export default async function FruitPage({ params }: PageProps<'/fruits/[name]'>) {
  const fruit = findFruit((await params).name);
  if (fruit === undefined) notFound();
  return (
    <>
      <h1>{fruit.label}</h1>
      <p>色: {fruit.color}</p>
    </>
  );
}
