import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { Incident } from "@/lib/types";
import { BARANGAYS, EMERGENCY_CONTACTS, INCIDENT_TYPES, MUNICIPALITY } from "@/lib/boac";
import { reportIncident } from "@/app/actions/mdrrmo";
import { StatusPill, Alert } from "@/components/ui";
import MapView from "@/components/MapView";
import SubmitButton from "@/components/SubmitButton";
import { timeAgo } from "@/lib/format";

export default async function EmergencyPage({
  searchParams,
}: {
  searchParams: Promise<{ reported?: string; error?: string }>;
}) {
  const { reported, error } = await searchParams;
  const user = await getCurrentUser();
  const incidents = await query<Incident>(
    "SELECT * FROM incidents ORDER BY created_at DESC LIMIT 6",
  );

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] bg-gradient-to-br from-rose-700 to-rose-950 p-6 text-white shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">Emergency · Boac</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Help is one tap away</h1>
        <p className="mt-1 max-w-2xl text-sm text-rose-100">
          Call the responders directly, or send an incident report to MDRRMO Boac. For a life-threatening emergency,
          call 911 first.
        </p>
        <a href="tel:911" className="btn mt-4 bg-white text-rose-800 hover:bg-rose-50">
          📞 Call 911
        </a>
      </header>

      {reported ? (
        <Alert tone="success">
          <strong>Report received.</strong> Your reference is <span className="font-mono font-semibold">{reported}</span>.
          MDRRMO Boac has been alerted and will call you if they need more details.
        </Alert>
      ) : null}
      {error === "fields" ? <Alert tone="error">Please add a barangay and a short description of the incident.</Alert> : null}

      <section>
        <h2 className="mb-3 font-display text-xl font-semibold text-moss-900">Boac &amp; provincial hotlines</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {EMERGENCY_CONTACTS.map((contact) => (
            <div key={contact.name + contact.number} className="card flex items-center gap-3 p-3.5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-xl">{contact.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-moss-900">{contact.name}</p>
                <p className="text-xs text-moss-500">{contact.detail}</p>
              </div>
              <a
                href={`tel:${contact.number.replace(/[^0-9+]/g, "")}`}
                className="btn-sm shrink-0 border border-moss-200 px-3 py-2 text-moss-800 hover:bg-moss-50"
              >
                {contact.number}
              </a>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section id="report" className="card p-4">
          <h2 className="font-display text-xl font-semibold text-moss-900">Report an incident</h2>
          <p className="mt-1 text-sm text-moss-600">
            Flooding, fire, fallen trees, medical emergencies or power outages. Reports go straight to the MDRRMO duty desk.
          </p>
          <form action={reportIncident} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="type">
                  Incident type
                </label>
                <select id="type" name="type" className="input">
                  {INCIDENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="severity">
                  Severity
                </label>
                <select id="severity" name="severity" className="input" defaultValue="moderate">
                  <option value="low">Low — no immediate danger</option>
                  <option value="moderate">Moderate — needs response</option>
                  <option value="high">High — risk to people or property</option>
                  <option value="critical">Critical — life threatening</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="barangay">
                Barangay
              </label>
              <select id="barangay" name="barangay" className="input" defaultValue={user?.barangay ?? "Tampus (Poblacion)"}>
                {BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="description">
                What is happening?
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                required
                className="input resize-none"
                placeholder="Describe the situation, landmarks and how many people need help."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="reporterName">
                  Your name
                </label>
                <input id="reporterName" name="reporterName" defaultValue={user?.name ?? ""} className="input" placeholder="Optional if anonymous" />
              </div>
              <div>
                <label className="label" htmlFor="reporterPhone">
                  Contact number
                </label>
                <input id="reporterPhone" name="reporterPhone" defaultValue={user?.phone ?? ""} className="input" placeholder="0917 000 0000" />
              </div>
            </div>
            <div>
              <span className="label">Location pin (optional)</span>
              <MapView points={[]} center={MUNICIPALITY.center} zoom={13} height={220} pickable />
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Sending to MDRRMO…">
              Send report to MDRRMO
            </SubmitButton>
            <p className="text-center text-[11px] text-moss-500">
              Reports reach the MDRRMO duty desk in the app. For anything life-threatening, call 911 immediately.
            </p>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-moss-900">Recent response board</h2>
          {incidents.map((incident) => (
            <article key={incident.id} className="card p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-moss-500">{incident.code}</span>
                <StatusPill status={incident.status} />
                <StatusPill status={incident.severity} />
                <span className="ml-auto text-[11px] text-moss-400">{timeAgo(incident.created_at)}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-moss-900">
                {incident.type} · {incident.barangay}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-moss-600">{incident.description}</p>
              {incident.team ? <p className="mt-1 text-[11px] font-semibold text-moss-700">Assigned: {incident.team}</p> : null}
            </article>
          ))}
          <p className="text-[11px] text-moss-500">
            The response board shows the latest reports received by the Boac MDRRMO duty desk.
          </p>
        </section>
      </div>
    </div>
  );
}
