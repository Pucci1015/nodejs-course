// 第59章 2節: 注文の合計（ESLint の指摘を直した完成形）
import { z } from 'zod';

export interface Order {
  id: number;
  items: { price: number; qty: number }[];
  coupon?: string;
}

// 修正: JSON.parse の結果（any）を、そのまま Order として返さない。Zod で確かめる（第7部 第38章）
const OrderSchema = z.object({
  id: z.number().int(),
  items: z.array(z.object({ price: z.number(), qty: z.number().int() })),
  coupon: z.string().optional(),
});

export function total(order: Order): number {
  // 修正: 使っていない TAX を消した
  let sum = 0;
  for (const item of order.items) {
    sum += item.price * item.qty;
  }
  // 修正: == は型を変えて比べる。=== で比べる（eqeqeq）
  if (order.coupon === 'HALF') {
    sum = sum / 2;
  }
  return sum;
}

export async function saveOrder(order: Order): Promise<void> {
  // 修正: 送り終わるまで待つ。失敗したら、呼んだ側に例外が届く
  await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });
}

export function parseOrder(text: string): Order {
  return OrderSchema.parse(JSON.parse(text));
}
