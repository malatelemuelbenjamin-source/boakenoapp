import Link from "next/link";
import { requireUser, homeForRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { Address } from "@/lib/types";
import { BARANGAYS, MUNICIPALITY, ROLE_LABELS } from "@/lib/boac";
import { saveAddress, deleteAddress, setDefaultAddress } from "@/app/actions/orders";
import { logoutAction } from "@/app/actions/auth";
import MapView from "@/components/MapView";
import SubmitButton from "@/components/SubmitButton";
import { Alert } from "@/components/ui";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser("/account");
  const { saved, error } = await searchParams;
  const addresses = await query<Address>("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id", user.id);
  const stats = await queryOne<{ orders: number; visited: number; planned: number }>(
    `SELECT (SELECT COUNT(*) FROM orders WHERE user_id = ?) orders,
            (SELECT COUNT(*) FROM bucket_list WHERE user_id = ? AND status = 'visited') visited,
            (SELECT COUNT(*) FROM bucket_list WHERE user_id = ? AND status = 'planned') planned`,
    user.id,
    user.id,
    user.id,
  );
  const shop = await queryOne<{ slug: string; name: string }>("SELECT slug, name FROM shops WHERE owner_id = ?", user.id);

  return (
    <div className="space-y-5">
      <header className="card overflow-hidden">
        <div className="bg-gradient-to-br from-moss-800 to-moss-950 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 font-display text-xl font-bold">
              {user.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold leading-tight">{user.name}</h1>
              <p className="text-xs text-moss-200">
                {ROLE_LABELS[user.role] ?? user.role} · {user.barangay ?? "Boac"}
              </p>
              <p className="text-xs text-moss-300">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Orders", value: stats?.orders ?? 0 },
              { label: "Visited", value: stats?.visited ?? 0 },
              { label: "Planned", value: stats?.planned ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-2 py-2">
                <dt className="text-[10px] uppercase tracking-wide text-moss-200">{stat.label}</dt>
                <dd className="font-display text-lg font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          <Link href="/orders" className="btn-ghost">
            My orders
          </Link>
          <Link href="/bucket-list" className="btn-ghost">
            Bucket list
          </Link>
          <Link href="/notifications" className="btn-ghost">
            Notifications
          </Link>
          {shop ? (
            <Link href="/seller" className="btn-gold">
              Seller hub
            </Link>
          ) : user.role === "resident" ? (
            <Link href="/seller" className="btn-gold">
              Open a shop
            </Link>
          ) : (
            <Link href={homeForRole(user.role)} className="btn-gold">
              My panel
            </Link>
          )}
        </div>
      </header>

      {saved === "address" ? <Alert tone="success">Address saved. You can pick it at checkout.</Alert> : null}
      {error === "max" ? <Alert tone="error">You have reached the limit of 10 delivery addresses. Remove one first.</Alert> : null}
      {error === "fields" ? <Alert tone="error">Please enter a complete address and barangay.</Alert> : null}

      <section id="addresses" className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-moss-900">Delivery addresses</h2>
            <span className="chip bg-moss-50 text-moss-700">{addresses.length}/10</span>
          </div>
          <p className="mt-1 text-xs text-moss-500">
            Pin up to 10 addresses on the Boac map so riders can find you quickly.
          </p>
          <ul className="mt-3 space-y-2">
            {addresses.map((address) => (
              <li key={address.id} className="rounded-2xl border border-moss-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-moss-900">
                      {address.label}{" "}
                      {address.is_default ? <span className="chip ml-1 bg-gold-100 text-gold-800">Default</span> : null}
                    </p>
                    <p className="text-xs text-moss-600">
                      {address.line}, {address.barangay}
                    </p>
                    {address.notes ? <p className="mt-0.5 text-[11px] text-moss-500">{address.notes}</p> : null}
                    {address.lat && address.lng ? (
                      <p className="mt-0.5 font-mono text-[10px] text-moss-400">
                        📌 {address.lat.toFixed(4)}, {address.lng.toFixed(4)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!address.is_default ? (
                      <form action={setDefaultAddress}>
                        <input type="hidden" name="addressId" value={address.id} />
                        <button type="submit" className="text-[11px] font-semibold text-moss-700 hover:underline">
                          Make default
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteAddress}>
                      <input type="hidden" name="addressId" value={address.id} />
                      <button type="submit" className="text-[11px] font-semibold text-rose-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
            {addresses.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-moss-300 p-4 text-sm text-moss-600">
                No saved addresses yet. Add your first one using the form.
              </li>
            ) : null}
          </ul>
        </div>

        <form action={saveAddress} className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold text-moss-900">Add an address</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="label">
                Label
              </label>
              <input id="label" name="label" className="input" placeholder="Home / Office" />
            </div>
            <div>
              <label className="label" htmlFor="address-barangay">
                Barangay
              </label>
              <select id="address-barangay" name="barangay" className="input" defaultValue={user.barangay ?? "Tampus (Poblacion)"}>
                {BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="line">
              House / street / purok
            </label>
            <input id="line" name="line" required className="input" placeholder="12 Mercader St., Purok 3" />
          </div>
          <div>
            <label className="label" htmlFor="notes">
              Rider notes
            </label>
            <input id="notes" name="notes" className="input" placeholder="Blue gate beside the sari-sari store" />
          </div>
          <div>
            <span className="label">Pin on the map</span>
            <MapView
              points={[]}
              center={MUNICIPALITY.center}
              zoom={13}
              height={240}
              pickable
              initialPin={
                addresses[0]?.lat && addresses[0]?.lng ? { lat: addresses[0].lat, lng: addresses[0].lng } : null
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-moss-800">
            <input type="checkbox" name="isDefault" className="accent-moss-700" /> Make this my default address
          </label>
          <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">
            Save address
          </SubmitButton>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-semibold text-moss-900">Account &amp; services</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Link href="/emergency" className="flex items-center gap-3 rounded-2xl bg-moss-50 p-3 text-sm hover:bg-moss-100">
            <span className="text-lg">🚨</span>
            <span>
              <strong className="block font-semibold text-moss-900">Emergency &amp; incident reporting</strong>
              <span className="text-xs text-moss-600">Boac hotlines and MDRRMO dispatch</span>
            </span>
          </Link>
          <Link href="/park" className="flex items-center gap-3 rounded-2xl bg-moss-50 p-3 text-sm hover:bg-moss-100">
            <span className="text-lg">🚂</span>
            <span>
              <strong className="block font-semibold text-moss-900">Park &amp; plaza schedules</strong>
              <span className="text-xs text-moss-600">Kiddie train, playground and covered court</span>
            </span>
          </Link>
          {user.role === "mdrrmo" || user.role === "admin" ? (
            <Link href="/panels/mdrrmo" className="flex items-center gap-3 rounded-2xl bg-moss-50 p-3 text-sm hover:bg-moss-100">
              <span className="text-lg">🛟</span>
              <span>
                <strong className="block font-semibold text-moss-900">MDRRMO personnel panel</strong>
                <span className="text-xs text-moss-600">Dispatch and incident status</span>
              </span>
            </Link>
          ) : null}
          {user.role === "tourism" || user.role === "admin" ? (
            <Link href="/panels/tourism" className="flex items-center gap-3 rounded-2xl bg-moss-50 p-3 text-sm hover:bg-moss-100">
              <span className="text-lg">🧭</span>
              <span>
                <strong className="block font-semibold text-moss-900">Tourism administration</strong>
                <span className="text-xs text-moss-600">Places, park status and officer verification</span>
              </span>
            </Link>
          ) : null}
        </div>
        <form action={logoutAction} className="mt-4">
          <button type="submit" className="btn-sm border border-moss-200 px-3 py-2 text-moss-700 hover:bg-moss-50">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
