import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { NotificationRow } from "@/lib/types";
import { markNotificationsRead } from "@/app/actions/orders";
import { Empty } from "@/components/ui";
import { timeAgo } from "@/lib/format";

const KIND_EMOJI: Record<string, string> = {
  order: "🧾",
  park: "🚂",
  tourism: "🧭",
  incident: "🚨",
  update: "🔔",
};

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const rows = await query<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60",
    user.id,
  );
  const unread = rows.filter((r) => !r.is_read).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">Alerts</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-moss-900">Notifications</h1>
          <p className="mt-1 text-sm text-moss-600">
            {unread > 0 ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You are all caught up."}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markNotificationsRead}>
            <button type="submit" className="btn-ghost">
              Mark all as read
            </button>
          </form>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <Empty emoji="🔔" title="No notifications yet" body="Order updates, park schedules and MDRRMO alerts will appear here." />
      ) : (
        <div className="card divide-y divide-moss-100">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href ?? "/"}
              className={`flex gap-3 p-4 transition hover:bg-moss-50 ${row.is_read ? "" : "bg-gold-50/40"}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-lg shadow-sm">
                {KIND_EMOJI[row.kind] ?? "🔔"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-moss-900">{row.title}</span>
                  {!row.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold-500" /> : null}
                </span>
                <span className="mt-0.5 block text-sm text-moss-600">{row.body}</span>
                <span className="mt-1 block text-[11px] text-moss-400">{timeAgo(row.created_at)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
