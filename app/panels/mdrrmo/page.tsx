import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { Incident } from "@/lib/types";
import { updateIncident } from "@/app/actions/mdrrmo";
import { StatusPill, Alert } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import MapView from "@/components/MapView";
import { dateTime, timeAgo } from "@/lib/format";

const TEAMS = ["Alpha Rescue Team", "Bravo Medical Team", "MDRRMO Monitoring", "BFP Boac", "PNP Boac", "Barangay Tanod"];

export default async function MdrrmoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string }>;
}) {
  const user = await requireStaff(["mdrrmo", "admin"], "/panels/mdrrmo");
  const { status, saved } = await searchParams;
  const active = ["new", "dispatched", "resolved"].includes(status ?? "") ? (status as string) : "all";

  const incidents = await query<Incident>(
    `SELECT * FROM incidents ${active !== "all" ? "WHERE status = ?" : ""} ORDER BY created_at DESC`,
    ...(active !== "all" ? [active] : []),
  );
  const counts = await queryOne<{ total: number; fresh: number; dispatched: number; resolved: number; critical: number }>(
    `SELECT COUNT(*) total,
            SUM(status = 'new') fresh,
            SUM(status = 'dispatched') dispatched,
            SUM(status = 'resolved') resolved,
            SUM(severity IN ('high','critical') AND status != 'resolved') critical
       FROM incidents`,
  );
  const pinned = incidents.filter((i) => i.lat && i.lng && i.status !== "resolved").slice(0, 12);

  return (
    <div className="space-y-5">
      <header className="rounded-[28px] bg-gradient-to-br from-slate-800 to-slate-950 p-5 text-white shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200">MDRRMO personnel panel</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Boac disaster response desk</h1>
        <p className="text-xs text-slate-300">
          Signed in as {user.name} · Duty dispatcher
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Total reports", value: counts?.total ?? 0 },
            { label: "New", value: counts?.fresh ?? 0 },
            { label: "Dispatched", value: counts?.dispatched ?? 0 },
            { label: "Resolved", value: counts?.resolved ?? 0 },
            { label: "High priority", value: counts?.critical ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/10 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-slate-300">{stat.label}</dt>
              <dd className="font-display text-lg font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {saved ? <Alert tone="success">Incident updated and logged.</Alert> : null}

      <section className="card overflow-hidden p-2">
        <MapView
          points={pinned.map((incident) => ({
            id: incident.id,
            lat: incident.lat as number,
            lng: incident.lng as number,
            title: `${incident.code} · ${incident.type}`,
            subtitle: `${incident.barangay} · ${incident.status}`,
            emoji: incident.severity === "critical" || incident.severity === "high" ? "🚨" : "📍",
          }))}
          center={{ lat: 13.4465, lng: 121.8403 }}
          height={300}
        />
        <p className="px-2 py-2 text-[11px] text-moss-500">Active incident pins across Boac. Resolved reports are hidden from the map.</p>
      </section>

      <div className="flex gap-1.5 overflow-x-auto">
        {[
          { key: "all", label: "All reports" },
          { key: "new", label: "New" },
          { key: "dispatched", label: "Dispatched" },
          { key: "resolved", label: "Resolved" },
        ].map((tab) => (
          <Link key={tab.key} href={`/panels/mdrrmo${tab.key === "all" ? "" : `?status=${tab.key}`}`} className={`tab shrink-0 ${active === tab.key ? "tab-active" : "bg-white"}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        {incidents.map((incident) => (
          <article key={incident.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-moss-500">{incident.code}</span>
                  <StatusPill status={incident.status} />
                  <StatusPill status={incident.severity} />
                  <span className="chip bg-moss-50 text-moss-700">{incident.type}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-moss-900">{incident.barangay}</p>
                <p className="mt-0.5 max-w-2xl text-sm text-moss-600">{incident.description}</p>
                <p className="mt-1 text-xs text-moss-500">
                  Reported by {incident.reporter_name}
                  {incident.reporter_phone ? ` · ${incident.reporter_phone}` : ""} · {dateTime(incident.created_at)} ({timeAgo(incident.created_at)})
                </p>
              </div>
              <div className="text-right text-xs text-moss-500">
                {incident.lat && incident.lng ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${incident.lat},${incident.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-moss-700 underline"
                  >
                    Open pin
                  </a>
                ) : (
                  <span>No pin provided</span>
                )}
                <p className="mt-1">Updated {timeAgo(incident.updated_at)}</p>
              </div>
            </div>

            <form action={updateIncident} className="mt-3 flex flex-wrap items-end gap-2 border-t border-moss-100 pt-3">
              <input type="hidden" name="incidentId" value={incident.id} />
              <div>
                <label className="label" htmlFor={`status-${incident.id}`}>
                  Status
                </label>
                <select id={`status-${incident.id}`} name="status" defaultValue={incident.status} className="input py-1.5">
                  <option value="new">New</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="min-w-[200px] flex-1">
                <label className="label" htmlFor={`team-${incident.id}`}>
                  Assigned team
                </label>
                <input id={`team-${incident.id}`} name="team" defaultValue={incident.team ?? ""} list="mdrrmo-teams" className="input py-1.5" placeholder="Alpha Rescue Team" />
              </div>
              <SubmitButton className="btn-primary py-2" pendingLabel="Saving…">
                Update dispatch
              </SubmitButton>
            </form>
          </article>
        ))}
        <datalist id="mdrrmo-teams">
          {TEAMS.map((team) => (
            <option key={team} value={team} />
          ))}
        </datalist>
        {incidents.length === 0 ? <p className="card p-5 text-sm text-moss-600">No incidents match this filter.</p> : null}
      </section>
    </div>
  );
}
