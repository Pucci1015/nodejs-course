// 練習問題3 の模範解答
export async function getPricesSerial(ids, getPrice) {
  const result = [];
  for (const id of ids) {
    result.push(await getPrice(id));
  }
  return result;
}

export async function getPricesParallel(ids, getPrice) {
  return Promise.all(ids.map((id) => getPrice(id)));
}

export async function getPricesSettled(ids, getPrice) {
  const settled = await Promise.allSettled(ids.map((id) => getPrice(id)));
  const prices = {};
  const failed = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      prices[ids[i]] = r.value;
    } else {
      failed.push(ids[i]);
    }
  });
  return { prices, failed };
}
