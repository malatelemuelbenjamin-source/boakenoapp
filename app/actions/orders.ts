"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { BARANGAYS } from "@/lib/boac";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { orderCode } from "@/lib/format";
import { getCart } from "@/lib/cart";

export async function addToCart(formData: FormData) {
  const productId = Number(formData.get("productId"));
  const qty = Math.max(1, Number(formData.get("qty") ?? 1));
  const product = await queryOne<{ stock: number; shop_id: number; is_active: number }>(
    "SELECT stock, shop_id, is_active FROM products WHERE id = ?",
    productId,
  );
  if (!product || !product.is_active || product.stock < 1) return;
  const safeQty = Math.min(qty, product.stock);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(String(formData.get("next") ?? "/market"))}`);
  }

  // A cart holds items from one shop only, like a real basket. Tell the shopper
  // when adding this item replaced a basket from another shop.
  const otherShop = await queryOne<{ c: number }>(
    `SELECT COUNT(*) c FROM cart_items c JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ? AND p.shop_id != ?`,
    user.id,
    product.shop_id,
  );
  await execute(
    "DELETE FROM cart_items WHERE user_id = ? AND product_id IN (SELECT id FROM products WHERE shop_id != ?)",
    user.id,
    product.shop_id,
  );
  await execute(
    `INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?)
     ON CONFLICT(user_id, product_id) DO UPDATE SET qty = MIN(cart_items.qty + excluded.qty, ?)`,
    user.id,
    productId,
    safeQty,
    product.stock,
  );
  revalidatePath("/cart");
  revalidatePath("/market");
  if ((otherShop?.c ?? 0) > 0) redirect("/cart?switched=1");
}

export async function setCartQty(formData: FormData) {
  const user = await requireUser("/cart");
  const itemId = Number(formData.get("itemId"));
  const qty = Number(formData.get("qty"));
  const line = await queryOne<{ id: number; stock: number }>(
    `SELECT c.id, p.stock FROM cart_items c JOIN products p ON p.id = c.product_id
      WHERE c.id = ? AND c.user_id = ?`,
    itemId,
    user.id,
  );
  if (!line) return;
  if (qty <= 0 || line.stock < 1) {
    // Never leave a zero-quantity or unavailable line in the basket.
    await execute("DELETE FROM cart_items WHERE id = ?", itemId);
  } else {
    await execute("UPDATE cart_items SET qty = ? WHERE id = ?", Math.min(qty, line.stock), itemId);
  }
  revalidatePath("/cart");
}

export async function removeCartItem(formData: FormData) {
  const user = await requireUser("/cart");
  await execute("DELETE FROM cart_items WHERE id = ? AND user_id = ?", Number(formData.get("itemId")), user.id);
  revalidatePath("/cart");
}

export async function saveAddress(formData: FormData) {
  const user = await requireUser("/account");
  const label = String(formData.get("label") ?? "Home").trim() || "Home";
  const line = String(formData.get("line") ?? "").trim();
  const barangay = String(formData.get("barangay") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const isDefault = formData.get("isDefault") === "on" ? 1 : 0;

  const count = await queryOne<{ c: number }>("SELECT COUNT(*) c FROM addresses WHERE user_id = ?", user.id);
  if ((count?.c ?? 0) >= 10 || !line || !BARANGAYS.includes(barangay)) {
    redirect(`/account?error=${(count?.c ?? 0) >= 10 ? "max" : "fields"}`);
  }
  if (isDefault) await execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user.id);
  await execute(
    `INSERT INTO addresses (user_id, label, line, barangay, notes, lat, lng, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    user.id,
    label,
    line,
    barangay,
    notes,
    Number.isFinite(lat) && lat !== 0 ? lat : null,
    Number.isFinite(lng) && lng !== 0 ? lng : null,
    isDefault,
    new Date().toISOString(),
  );
  revalidatePath("/account");
  redirect("/account?saved=address");
}

export async function deleteAddress(formData: FormData) {
  const user = await requireUser("/account");
  const id = Number(formData.get("addressId"));
  const owned = await queryOne<{ id: number }>("SELECT id FROM addresses WHERE id = ? AND user_id = ?", id, user.id);
  if (!owned) {
    revalidatePath("/account");
    return;
  }
  // Orders keep the address text snapshot, so the reference can be detached safely.
  await execute("UPDATE orders SET address_id = NULL WHERE address_id = ? AND user_id = ?", id, user.id);
  await execute("DELETE FROM addresses WHERE id = ? AND user_id = ?", id, user.id);
  revalidatePath("/account");
  revalidatePath("/orders");
}

export async function setDefaultAddress(formData: FormData) {
  const user = await requireUser("/account");
  const id = Number(formData.get("addressId"));
  await execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", user.id);
  await execute("UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?", id, user.id);
  revalidatePath("/account");
}

export async function placeOrder(formData: FormData) {
  const user = await requireUser("/cart");
  const mode = String(formData.get("mode") ?? "delivery") === "pickup" ? "pickup" : "delivery";
  const payment = String(formData.get("payment") ?? "cod");
  const paymentMethod = ["gcash", "maya", "cod"].includes(payment) ? payment : "cod";
  const note = String(formData.get("note") ?? "").trim() || null;
  const addressId = Number(formData.get("addressId") ?? 0);
  const rateId = Number(formData.get("rateId") ?? 0);

  const lines = await getCart(user.id);
  if (lines.length === 0) redirect("/cart");
  const shopId = lines[0].shop_id;

  let deliveryFee = 0;
  let addressText: string | null = null;
  let chosenAddress: number | null = null;

  if (mode === "delivery") {
    const address = await queryOne<{ id: number; label: string; line: string; barangay: string }>(
      "SELECT id, label, line, barangay FROM addresses WHERE id = ? AND user_id = ?",
      addressId,
      user.id,
    );
    if (!address) redirect("/cart?error=address");
    const rate = await queryOne<{ fee: number; label: string }>(
      "SELECT fee, label FROM delivery_rates WHERE id = ? AND shop_id = ?",
      rateId,
      shopId,
    );
    if (!rate) redirect("/cart?error=rate");
    chosenAddress = address.id;
    addressText = `${address.line}, ${address.barangay} · ${rate.label}`;
    deliveryFee = rate.fee;
  }

  const shop = await queryOne<{ id: number; name: string; owner_id: number; slug: string; is_open: number }>(
    "SELECT id, name, owner_id, slug, is_open FROM shops WHERE id = ?",
    shopId,
  );
  if (!shop) redirect("/cart");
  if (!shop.is_open) redirect("/cart?error=closed");
  // Re-check stock at the moment of ordering: the cart may have been filled in
  // another tab, or the seller may have reduced stock since.
  for (const line of lines) {
    if (line.qty > line.stock || line.stock < 1) redirect("/cart?error=stock");
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const total = subtotal + deliveryFee;
  const code = orderCode();
  const now = new Date().toISOString();
  // No payment is captured by the app: the seller confirms wallet transfers manually.
  const paid = "pending";
  const reference = null;

  const info = await execute(
    `INSERT INTO orders (code, user_id, shop_id, mode, address_id, address_text, subtotal, delivery_fee, total,
        payment_method, payment_status, payment_ref, status, note, placed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, ?)`,
    code,
    user.id,
    shop.id,
    mode,
    chosenAddress,
    addressText ?? `Pick up at ${shop.name}`,
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    paid,
    reference,
    note,
    now,
    now,
  );
  const orderId = Number(info.lastInsertRowid);

  for (const line of lines) {
    await execute(
      "INSERT INTO order_items (order_id, product_id, name, price, qty, emoji) VALUES (?, ?, ?, ?, ?, ?)",
      orderId,
      line.product_id,
      line.name,
      line.price,
      line.qty,
      line.emoji,
    );
    await execute("UPDATE products SET stock = MAX(stock - ?, 0) WHERE id = ?", line.qty, line.product_id);
  }
  await execute(
    "INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'placed', ?, ?)",
    orderId,
    mode === "delivery" ? "Order received — waiting for seller confirmation" : "Pickup order received — waiting for seller confirmation",
    now,
  );
  await execute("UPDATE shops SET orders_count = orders_count + 1 WHERE id = ?", shop.id);
  await execute("DELETE FROM cart_items WHERE user_id = ? AND product_id IN (SELECT id FROM products WHERE shop_id = ?)", user.id, shop.id);

  await execute(
    "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    user.id,
    `Order ${code} placed`,
    `${lines.length} item${lines.length > 1 ? "s" : ""} from ${shop.name}. We'll notify you when the seller confirms${
      paymentMethod === "cod" ? "." : ", and pay only after they confirm your transfer."
    }`,
    "order",
    `/orders/${orderId}`,
    now,
  );
  await execute(
    "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    shop.owner_id,
    `New order ${code}`,
    `${user.name} placed a ${paymentMethod === "cod" ? "cash on delivery" : paymentMethod.toUpperCase()} order worth ₱${(total / 100).toFixed(2)}.`,
    "order",
    "/seller?tab=orders",
    now,
  );

  revalidatePath("/orders");
  revalidatePath("/seller");
  redirect(`/orders/${orderId}?placed=1`);
}

export async function cancelOrder(formData: FormData) {
  const user = await requireUser("/orders");
  const orderId = Number(formData.get("orderId"));
  const order = await queryOne<{ id: number; code: string; status: string; shop_id: number }>(
    "SELECT id, code, status, shop_id FROM orders WHERE id = ? AND user_id = ?",
    orderId,
    user.id,
  );
  if (!order || !["placed", "confirmed"].includes(order.status)) {
    redirect(`/orders/${orderId}`);
  }
  const now = new Date().toISOString();
  await execute("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?", now, orderId);
  await execute(
    "INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, 'cancelled', 'Cancelled by customer', ?)",
    orderId,
    now,
  );
  const items = await query<{ product_id: number | null; qty: number }>(
    "SELECT product_id, qty FROM order_items WHERE order_id = ?",
    orderId,
  );
  for (const item of items) {
    if (item.product_id) await execute("UPDATE products SET stock = stock + ? WHERE id = ?", item.qty, item.product_id);
  }
  const shop = await queryOne<{ owner_id: number }>("SELECT owner_id FROM shops WHERE id = ?", order.shop_id);
  if (shop) {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      shop.owner_id,
      `Order ${order.code} cancelled`,
      `${user.name} cancelled the order before preparation started.`,
      "order",
      "/seller?tab=orders",
      now,
    );
  }
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  redirect(`/orders/${orderId}`);
}

export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");
  await execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", user.id);
  revalidatePath("/notifications");
  revalidatePath("/");
}
