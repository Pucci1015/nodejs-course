// 第47章 練習問題3の模範解答
export default async function GreetPage({ params }: PageProps<'/greet/[name]'>) {
  const { name } = await params;
  // params の値は、URL に書かれたまま（%E3%81%AD%E3%81%93）。元の文字に戻す
  return <p>こんにちは、{decodeURIComponent(name)} さん</p>;
}
