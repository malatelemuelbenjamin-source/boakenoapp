import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { setBucketStatus, removeFromBucket } from "@/app/actions/tourism";
import { Progress, Empty } from "@/components/ui";
import { shortDate } from "@/lib/format";

type Row = {
  bucket_id: number;
  status: string;
  visited_at: string | null;
  created_at: string;
  id: number;
  slug: string;
  name: string;
  category: string;
  barangay: string;
  emoji: string;
  accent: string;
  hours: string | null;
  fee: string | null;
};

export default async function BucketListPage() {
  const user = await requireUser("/bucket-list");
  const rows = await query<Row>(
    `SELECT b.id AS bucket_id, b.status, b.visited_at, b.created_at,
            d.id, d.slug, d.name, d.category, d.barangay, d.emoji, d.accent, d.hours, d.fee
       FROM bucket_list b JOIN destinations d ON d.id = b.destination_id
      WHERE b.user_id = ?
      ORDER BY CASE b.status WHEN 'planned' THEN 0 ELSE 1 END, b.created_at DESC`,
    user.id,
  );
  const total = (await query<{ c: number }>("SELECT COUNT(*) c FROM destinations WHERE status = 'published'"))[0]?.c ?? 0;
  const visited = rows.filter((r) => r.status === "visited").length;
  const planned = rows.length - visited;

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] bg-gradient-to-br from-moss-800 to-moss-950 p-6 text-white shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200">Travel bucket list</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Boac, one place at a time</h1>
        <p className="mt-1 max-w-xl text-sm text-moss-100">
          Save the places you want to see, then mark them as conquered. Your list is tied to your account.
        </p>
        <div className="mt-4 max-w-md">
          <div className="flex items-center justify-between text-xs font-semibold text-moss-100">
            <span>
              {visited} visited · {planned} planned
            </span>
            <span>
              {rows.length}/{total} places
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500"
              style={{ width: `${total ? Math.round((visited / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <Empty
          emoji="📌"
          title="Your bucket list is empty"
          body="Browse the Boac map and save the heritage sites, beaches and viewpoints you want to visit."
          action={{ href: "/explore", label: "Explore Boac" }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <article key={row.bucket_id} className="card overflow-hidden">
              <div className="flex items-stretch">
                <div className={`grid w-24 shrink-0 place-items-center bg-gradient-to-br ${row.accent} text-3xl`}>{row.emoji}</div>
                <div className="min-w-0 flex-1 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/explore/${row.slug}`} className="font-display text-base font-semibold leading-tight text-moss-900 hover:underline">
                      {row.name}
                    </Link>
                    <span
                      className={`chip shrink-0 ${
                        row.status === "visited" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {row.status === "visited" ? "Conquered ✓" : "Planned"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-moss-500">
                    {row.category} · {row.barangay}
                  </p>
                  {row.status === "visited" && row.visited_at ? (
                    <p className="mt-1 text-[11px] text-moss-500">Visited {shortDate(row.visited_at)}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-moss-500">🕒 {row.hours}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <form action={setBucketStatus}>
                      <input type="hidden" name="bucketId" value={row.bucket_id} />
                      <input type="hidden" name="status" value={row.status === "visited" ? "planned" : "visited"} />
                      <button
                        type="submit"
                        className={`btn-sm border px-2.5 py-1 ${
                          row.status === "visited"
                            ? "border-moss-200 text-moss-700 hover:bg-moss-50"
                            : "border-moss-700 bg-moss-700 text-white hover:bg-moss-800"
                        }`}
                      >
                        {row.status === "visited" ? "Undo visit" : "Mark visited"}
                      </button>
                    </form>
                    <form action={removeFromBucket}>
                      <input type="hidden" name="bucketId" value={row.bucket_id} />
                      <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between text-sm font-semibold text-moss-800">
          <span>Progress through Boac</span>
          <span>{total ? Math.round((visited / total) * 100) : 0}%</span>
        </div>
        <div className="mt-2">
          <Progress value={visited} max={total || 1} />
        </div>
        <p className="mt-2 text-xs text-moss-500">
          {visited} of {total} published destinations conquered. Keep going — the wildlife sanctuary is worth the trip.
        </p>
      </div>
    </div>
  );
}
