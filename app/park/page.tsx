import Link from "next/link";
import { query } from "@/lib/db";
import type { Schedule, Venue } from "@/lib/types";
import { StatusPill, Empty } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { canManageTourism, getCurrentUser } from "@/lib/auth";

export default async function ParkPage() {
  const user = await getCurrentUser();
  const venues = await query<Venue>("SELECT * FROM park_venues ORDER BY id");
  const schedules = await query<Schedule>("SELECT * FROM park_schedules ORDER BY venue_id, start_time");
  const open = venues.filter((v) => v.status === "open").length;

  return (
    <div className="space-y-6">
      <header className="hero-brand rounded-[28px] p-6 text-white shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200">Boac plaza &amp; parks</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Status &amp; schedules</h1>
        <p className="mt-1 max-w-2xl text-sm text-moss-100">
          Facility status and schedules are posted by the Boac municipal tourism office. Nothing is shown until the office
          publishes it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="chip bg-white/15 text-white">{open} open now</span>
          <span className="chip bg-white/15 text-white">{venues.length} facilities posted</span>
          <span className="chip bg-white/15 text-white">{schedules.length} schedules posted</span>
        </div>
      </header>

      {venues.length === 0 ? (
        <Empty
          emoji="🏞️"
          title="No facility updates posted yet"
          body="The tourism office has not published park or plaza status. Once they post an update it appears here and in notifications."
          action={
            canManageTourism(user?.role)
              ? { href: "/panels/tourism?tab=park", label: "Post an update (staff)" }
              : undefined
          }
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <article key={venue.id} className="card flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-moss-50 text-2xl">{venue.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-base font-semibold leading-tight text-moss-900">{venue.name}</h2>
                    <p className="mt-0.5 text-xs text-moss-500">{venue.hours}</p>
                  </div>
                  <StatusPill status={venue.status} />
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-moss-600">{venue.description}</p>
                <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-moss-500">
                  <span>{venue.capacity > 0 ? `Capacity ${venue.capacity}` : "Capacity not posted"}</span>
                  <span>Updated {dateTime(venue.updated_at)}</span>
                </div>
              </article>
            ))}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-semibold text-moss-900">Schedules</h2>
            {schedules.length === 0 ? (
              <p className="card p-5 text-sm text-moss-600">No schedules have been posted by the tourism office yet.</p>
            ) : (
              <div className="space-y-3">
                {venues.map((venue) => {
                  const rows = schedules.filter((s) => s.venue_id === venue.id);
                  if (rows.length === 0) return null;
                  return (
                    <div key={venue.id} className="card overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-moss-100 bg-moss-50 px-4 py-2.5">
                        <span className="text-lg">{venue.emoji}</span>
                        <h3 className="font-display text-base font-semibold text-moss-900">{venue.name}</h3>
                        <span className="ml-auto">
                          <StatusPill status={venue.status} />
                        </span>
                      </div>
                      <ul className="divide-y divide-moss-100">
                        {rows.map((row) => (
                          <li key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                            <span className="font-semibold text-moss-900">{row.title}</span>
                            <span className="chip bg-moss-50 text-moss-700">{row.days}</span>
                            <span className="chip bg-gold-50 text-gold-800">
                              {row.start_time} – {row.end_time}
                            </span>
                            {row.note ? <span className="w-full text-xs text-moss-500">{row.note}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <section className="rounded-3xl border border-moss-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-moss-900">Are you from the tourism office?</h2>
            <p className="mt-1 max-w-xl text-sm text-moss-600">
              Verified tourism officers can post facility status, operating hours and schedules from the administration
              panel.
            </p>
          </div>
          <Link href="/panels/tourism?tab=park" className="btn-ghost">
            Open tourism panel
          </Link>
        </div>
      </section>
    </div>
  );
}
