"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BARANGAYS, ORDER_LABELS, SHOP_CATEGORIES, pickOption } from "@/lib/boac";
import { deleteImage, storeImage } from "@/lib/media";

async function slugify(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48) || "shop";
  let slug = base;
  let n = 2;
  while (n < 1000 && (await queryOne("SELECT id FROM shops WHERE slug = ?", slug))) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createShop(formData: FormData) {
  const user = await requireUser("/seller");
  const existing = await queryOne("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (existing) redirect("/seller");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/seller?error=name");
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO shops (owner_id, name, slug, tagline, description, category, barangay, emoji, accent, rating, orders_count, is_open, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?)`,
    user.id,
    name,
    await slugify(name),
    String(formData.get("tagline") ?? "").trim() || "Proudly Boac-made",
    String(formData.get("description") ?? "").trim() || null,
    pickOption(SHOP_CATEGORIES, formData.get("category"), "Grocery"),
    pickOption(BARANGAYS, formData.get("barangay"), "Tampus (Poblacion)"),
    String(formData.get("emoji") ?? "🏪").slice(0, 4) || "🏪",
    "from-moss-500 to-moss-700",
    now,
  );
  if (user.role === "resident") await execute("UPDATE users SET role = 'seller' WHERE id = ?", user.id);
  revalidatePath("/seller");
  revalidatePath("/market");
  redirect("/seller?created=1");
}

export async function updateShop(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  await execute(
    "UPDATE shops SET tagline = ?, description = ?, is_open = ? WHERE id = ?",
    String(formData.get("tagline") ?? "").slice(0, 140),
    String(formData.get("description") ?? "").slice(0, 800),
    formData.get("isOpen") === "on" ? 1 : 0,
    shop.id,
  );
  revalidatePath("/seller");
  revalidatePath("/market");
  redirect("/seller?tab=settings&saved=1");
}

export async function addProduct(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  const name = String(formData.get("name") ?? "").trim();
  const pricePesos = Number(formData.get("price"));
  if (!name || !Number.isFinite(pricePesos) || pricePesos <= 0) {
    redirect("/seller?tab=products&error=fields");
  }
  const image = await storeImage(formData.get("image"));
  if (image.error) redirect("/seller?tab=products&error=image");
  await execute(
    `INSERT INTO products (shop_id, name, description, price, unit, stock, emoji, image_id, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    shop.id,
    name,
    String(formData.get("description") ?? "").trim() || null,
    Math.round(pricePesos * 100),
    String(formData.get("unit") ?? "pc").trim() || "pc",
    Math.max(0, Number(formData.get("stock") ?? 20)),
    String(formData.get("emoji") ?? "🛍️").slice(0, 4) || "🛍️",
    image.imageId,
    new Date().toISOString(),
  );
  revalidatePath("/seller");
  revalidatePath("/market");
  redirect("/seller?tab=products&saved=product");
}

export async function updateProduct(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  const productId = Number(formData.get("productId"));
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock") ?? 0);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0) {
    redirect("/seller?tab=products&error=fields");
  }
  const product = await queryOne<{ image_id: number | null }>(
    "SELECT image_id FROM products WHERE id = ? AND shop_id = ?",
    productId,
    shop.id,
  );
  if (!product) redirect("/seller?tab=products");
  const image = await storeImage(formData.get("image"));
  if (image.error) redirect("/seller?tab=products&error=image");
  const oldImageId = product.image_id;
  let imageId = oldImageId;
  if (image.imageId) {
    imageId = image.imageId;
  } else if (formData.get("removeImage") === "on") {
    imageId = null;
  }
  await execute(
    "UPDATE products SET price = ?, stock = ?, image_id = ?, is_active = ? WHERE id = ? AND shop_id = ?",
    Math.round(price * 100),
    Math.floor(stock),
    imageId,
    formData.get("isActive") === "on" ? 1 : 0,
    productId,
    shop.id,
  );
  if (oldImageId && oldImageId !== imageId) await deleteImage(oldImageId);
  revalidatePath("/seller");
  revalidatePath("/market");
  redirect("/seller?tab=products&saved=product");
}

export async function deleteProduct(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  const productId = Number(formData.get("productId"));
  const product = await queryOne<{ image_id: number | null }>(
    "SELECT image_id FROM products WHERE id = ? AND shop_id = ?",
    productId,
    shop.id,
  );
  await execute("DELETE FROM products WHERE id = ? AND shop_id = ?", productId, shop.id);
  await deleteImage(product?.image_id);
  revalidatePath("/seller");
  revalidatePath("/market");
  redirect("/seller?tab=products");
}

export async function addDeliveryRate(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  const count = await queryOne<{ c: number }>("SELECT COUNT(*) c FROM delivery_rates WHERE shop_id = ?", shop.id);
  if ((count?.c ?? 0) >= 20) redirect("/seller?tab=settings&error=rates");
  const label = String(formData.get("label") ?? "").trim();
  const fee = Number(formData.get("fee"));
  if (!label || !Number.isFinite(fee) || fee < 0) redirect("/seller?tab=settings&error=fields");
  await execute(
    "INSERT INTO delivery_rates (shop_id, label, fee, eta) VALUES (?, ?, ?, ?)",
    shop.id,
    label,
    Math.round(fee * 100),
    String(formData.get("eta") ?? "30–45 mins").trim() || "30–45 mins",
  );
  revalidatePath("/seller");
  redirect("/seller?tab=settings&saved=rate");
}

export async function deleteDeliveryRate(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  await execute("DELETE FROM delivery_rates WHERE id = ? AND shop_id = ?", Number(formData.get("rateId")), shop.id);
  revalidatePath("/seller");
  redirect("/seller?tab=settings");
}

export async function markOrderPaid(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  const orderId = Number(formData.get("orderId"));
  const order = await queryOne<{ code: string; user_id: number; payment_status: string; status: string }>(
    "SELECT code, user_id, payment_status, status FROM orders WHERE id = ? AND shop_id = ?",
    orderId,
    shop.id,
  );
  if (!order || order.payment_status === "paid" || order.status === "cancelled") {
    redirect("/seller?tab=orders");
  }

  const now = new Date().toISOString();
  await execute("UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?", now, orderId);
  await execute(
    "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    order.user_id,
    `Payment received for ${order.code}`,
    "The seller confirmed your payment. Thank you!",
    "order",
    `/orders/${orderId}`,
    now,
  );
  revalidatePath("/seller");
  revalidatePath(`/orders/${orderId}`);
  redirect("/seller?tab=orders&saved=payment");
}

const SELLER_FLOW: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "out_for_delivery", "cancelled"],
  ready: ["completed"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};

export async function updateOrderStatus(formData: FormData) {
  const user = await requireUser("/seller");
  const shop = await queryOne<{ id: number }>("SELECT id FROM shops WHERE owner_id = ?", user.id);
  if (!shop) redirect("/seller");
  const orderId = Number(formData.get("orderId"));
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  const order = await queryOne<{ id: number; code: string; status: string; user_id: number; payment_method: string; mode: string }>(
    "SELECT id, code, status, user_id, payment_method, mode FROM orders WHERE id = ? AND shop_id = ?",
    orderId,
    shop.id,
  );
  if (!order) redirect("/seller?tab=orders");
  // A pick-up order is never "out for delivery", and a delivery order is never
  // just "ready for pickup": keeping the flows apart prevents broken tracking steps.
  const allowed = (SELLER_FLOW[order.status] ?? []).filter((next) =>
    order.mode === "pickup" ? next !== "out_for_delivery" : next !== "ready",
  );
  if (!allowed.includes(status)) redirect("/seller?tab=orders&error=transition");

  const now = new Date().toISOString();
  await execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", status, now, orderId);
  await execute("UPDATE orders SET payment_status = 'paid' WHERE id = ? AND payment_method = 'cod' AND ? = 'completed'", orderId, status);
  await execute(
    "INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, ?, ?)",
    orderId,
    status,
    note ?? ORDER_LABELS[status] ?? status,
    now,
  );
  if (status !== "cancelled") {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      order.user_id,
      `${order.code}: ${ORDER_LABELS[status] ?? status}`,
      note ?? `Your ${order.mode === "pickup" ? "pickup" : "delivery"} order is now marked “${ORDER_LABELS[status] ?? status}”.`,
      "order",
      `/orders/${orderId}`,
      now,
    );
  } else {
    // Put the reserved stock back when the shop cannot fulfil the order.
    const items = await query<{ product_id: number | null; qty: number }>(
      "SELECT product_id, qty FROM order_items WHERE order_id = ?",
      orderId,
    );
    for (const item of items) {
      if (item.product_id) await execute("UPDATE products SET stock = stock + ? WHERE id = ?", item.qty, item.product_id);
    }
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      order.user_id,
      `Order ${order.code} cancelled by seller`,
      "The shop could not fulfil this order. Any online payment will be refunded to your wallet.",
      "order",
      `/orders/${orderId}`,
      now,
    );
  }
  revalidatePath("/seller");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  redirect("/seller?tab=orders&saved=status");
}
