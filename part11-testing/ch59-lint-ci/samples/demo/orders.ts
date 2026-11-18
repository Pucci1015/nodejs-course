// 第59章 2節: 注文の合計（ESLint の指摘を、1つずつ直す）
export interface Order {
  id: number;
  items: { price: number; qty: number }[];
  coupon?: string;
}

export function total(order: Order): number {
  const TAX = 1.1;
  let sum = 0;
  for (const item of order.items) {
    sum += item.price * item.qty;
  }
  if (order.coupon == 'HALF') {
    sum = sum / 2;
  }
  return sum;
}

export async function saveOrder(order: Order): Promise<void> {
  fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });
}

export function parseOrder(text: string): Order {
  return JSON.parse(text);
}
