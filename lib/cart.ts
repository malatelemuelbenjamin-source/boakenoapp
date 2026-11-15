import { query } from "./db";

export type CartLine = {
  id: number;
  qty: number;
  product_id: number;
  name: string;
  price: number;
  unit: string;
  stock: number;
  emoji: string;
  image_id: number | null;
  shop_id: number;
  shop_name: string;
  shop_slug: string;
};

export async function getCart(userId: number): Promise<CartLine[]> {
  return query<CartLine>(
    `SELECT c.id, c.qty, p.id AS product_id, p.name, p.price, p.unit, p.stock, p.emoji, p.image_id,
            s.id AS shop_id, s.name AS shop_name, s.slug AS shop_slug
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       JOIN shops s ON s.id = p.shop_id
      WHERE c.user_id = ?
      ORDER BY c.id`,
    userId,
  );
}
