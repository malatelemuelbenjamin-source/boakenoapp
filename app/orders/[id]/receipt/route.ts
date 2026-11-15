import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Order, OrderItem, Shop } from "@/lib/types";
import { PAYMENT_LABELS, MUNICIPALITY } from "@/lib/boac";

function money(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in to view this receipt.", { status: 401 });
  const { id } = await params;
  const order = await queryOne<Order & { shop_name: string; shop_barangay: string }>(
    `SELECT o.*, s.name shop_name, s.barangay shop_barangay
       FROM orders o JOIN shops s ON s.id = o.shop_id
      WHERE o.id = ? AND o.user_id = ?`,
    Number(id),
    user.id,
  );
  if (!order) return new Response("Receipt not found.", { status: 404 });

  const items = await query<OrderItem>("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", order.id);
  const shop = await queryOne<Shop>("SELECT * FROM shops WHERE id = ?", order.shop_id);
  const download = new URL(request.url).searchParams.get("download") === "1";
  const paid = order.payment_status === "paid";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt ${escapeHtml(order.code)} · MyBoakeno</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #fff1f1; color: #2a0a0a; }
  .receipt { max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #ffd9d9; border-radius: 24px; padding: 28px; box-shadow: 0 12px 30px -18px rgba(120,6,6,.35); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #ff3a3a, #a80000); display: grid; place-items: center; font-weight: 800; color: #fff; }
  h1 { font-size: 18px; margin: 0; }
  .muted { color: #8c2626; font-size: 12px; margin: 2px 0 0; }
  .code { margin: 22px 0 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #bc0f0f; }
  h2 { font-size: 22px; margin: 2px 0 0; }
  .status { display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; background: ${paid ? "#d1fae5" : "#fef3c7"}; color: ${paid ? "#065f46" : "#92400e"}; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 13px; }
  th { text-align: left; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: #8c2626; border-bottom: 1px solid #ffd9d9; padding-bottom: 8px; }
  td { padding: 8px 0; border-bottom: 1px solid #fff1f1; }
  td.num, th.num { text-align: right; }
  .totals { margin-top: 14px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 3px 0; color: #8c2626; }
  .totals .grand { color: #2a0a0a; font-weight: 700; font-size: 16px; border-top: 1px solid #ffd9d9; margin-top: 6px; padding-top: 8px; }
  .meta { margin-top: 22px; display: grid; gap: 10px; font-size: 12px; color: #8c2626; }
  .meta strong { display: block; color: #2a0a0a; font-size: 12px; }
  .footer { margin-top: 24px; border-top: 1px dashed #ffc4c4; padding-top: 14px; font-size: 11px; color: #8c2626; line-height: 1.6; }
  .actions { max-width: 560px; margin: 0 auto 16px; display: flex; gap: 8px; justify-content: flex-end; }
  button, a.button { border: 0; background: #bc0f0f; color: #fff; padding: 10px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
  a.ghost { background: #fff; color: #bc0f0f; border: 1px solid #ffc4c4; }
  @media print { body { background: #fff; padding: 0; } .actions { display: none; } .receipt { border: 0; box-shadow: none; max-width: none; padding: 0; } }
</style>
</head>
<body>
  <div class="actions">
    <a class="button ghost" href="javascript:window.print()">Print</a>
    <a class="button" href="?download=1">Download .html</a>
  </div>
  <main class="receipt">
    <div class="brand">
      <div class="logo">MB</div>
      <div>
        <h1>MyBoakenoApp</h1>
        <p class="muted">${escapeHtml(MUNICIPALITY.name)}, ${escapeHtml(MUNICIPALITY.province)} · Order receipt</p>
      </div>
    </div>

    <p class="code">${escapeHtml(order.code)}</p>
    <h2>${escapeHtml(order.shop_name)}</h2>
    <p class="muted">${escapeHtml(order.shop_barangay)}, Boac · ${new Date(order.placed_at).toLocaleString("en-PH")}</p>
    <span class="status">${paid ? "Paid" : "Payment pending"} · ${escapeHtml(PAYMENT_LABELS[order.payment_method] ?? order.payment_method)}</span>

    <table>
      <thead>
        <tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${money(item.price)}</td>
          <td class="num">${money(item.price * item.qty)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
      <div><span>${order.mode === "pickup" ? "Pick-up" : "Delivery fee"}</span><span>${order.delivery_fee ? money(order.delivery_fee) : "Free"}</span></div>
      <div class="grand"><span>Total</span><span>${money(order.total)}</span></div>
    </div>

    <div class="meta">
      <div><strong>${order.mode === "pickup" ? "Pick-up at" : "Deliver to"}</strong>${escapeHtml(order.address_text ?? "—")}</div>
      <div><strong>Order status</strong>${escapeHtml(order.status.replace(/_/g, " "))}</div>
      ${order.payment_ref ? `<div><strong>Payment reference</strong>${escapeHtml(order.payment_ref)}</div>` : ""}
      ${order.note ? `<div><strong>Customer note</strong>${escapeHtml(order.note)}</div>` : ""}
      <div><strong>Seller</strong>${escapeHtml(shop?.name ?? order.shop_name)} · Boac, Marinduque</div>
    </div>

    <p class="footer">
      This receipt was generated by MyBoakenoApp for Boac, Marinduque.
      MyBoakenoApp does not process payments: GCash or Maya transfers are made directly to the seller, who confirms
      receipt in the app. Questions? Reach the seller through the app or the Boac municipal hall at (042) 311-1378.
    </p>
  </main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...(download
        ? { "Content-Disposition": `attachment; filename="MyBoakeno-receipt-${order.code}.html"` }
        : {}),
    },
  });
}
