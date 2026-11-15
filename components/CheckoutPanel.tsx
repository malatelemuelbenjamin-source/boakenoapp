"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { placeOrder } from "@/app/actions/orders";
import SubmitButton from "./SubmitButton";
import { peso } from "@/lib/format";

type Line = {
  id: number;
  qty: number;
  product_id: number;
  name: string;
  price: number;
  unit: string;
  emoji: string;
  image_id: number | null;
};
type AddressOption = { id: number; label: string; line: string; barangay: string; is_default: number };
type RateOption = { id: number; label: string; fee: number; eta: string };

const PAYMENTS = [
  { id: "gcash", label: "GCash", hint: "Transfer to the seller; they confirm receipt", emoji: "💙" },
  { id: "maya", label: "Maya", hint: "Transfer to the seller; they confirm receipt", emoji: "💚" },
  { id: "cod", label: "Cash on delivery", hint: "Pay the rider or at the shop", emoji: "💵" },
];

export default function CheckoutPanel({
  lines,
  addresses,
  rates,
  shopName,
  error,
}: {
  lines: Line[];
  addresses: AddressOption[];
  rates: RateOption[];
  shopName: string;
  error?: string;
}) {
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const deliveryAvailable = rates.length > 0;
  const [mode, setMode] = useState<"delivery" | "pickup">(
    addresses.length > 0 && deliveryAvailable ? "delivery" : "pickup",
  );
  const [addressId, setAddressId] = useState<number | null>(defaultAddress?.id ?? null);
  const [rateId, setRateId] = useState<number | null>(rates[0]?.id ?? null);
  const [payment, setPayment] = useState("cod");

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.price * line.qty, 0), [lines]);
  const selectedRate = rates.find((r) => r.id === rateId) ?? null;
  const deliveryFee = mode === "delivery" ? selectedRate?.fee ?? 0 : 0;
  const total = subtotal + deliveryFee;
  const missingAddress = mode === "delivery" && !addressId;
  const missingRate = mode === "delivery" && !rateId;
  const canSubmit = mode === "pickup" || (!missingAddress && !missingRate);

  return (
    <form action={placeOrder} className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="addressId" value={addressId ?? ""} />
      <input type="hidden" name="rateId" value={rateId ?? ""} />
      <input type="hidden" name="payment" value={payment} />

      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
        ) : null}

        <section className="card p-4">
          <h2 className="font-display text-lg font-semibold text-moss-900">How should we get it to you?</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => deliveryAvailable && setMode("delivery")}
              disabled={!deliveryAvailable}
              className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === "delivery" ? "border-moss-700 bg-moss-50" : "border-moss-200 hover:border-moss-300"
              }`}
            >
              <span className="text-xl">🛵</span>
              <span className="mt-1 block text-sm font-semibold text-moss-900">Delivery</span>
              <span className="block text-xs text-moss-500">
                {deliveryAvailable ? "To a pinned address" : "Shop has not set delivery rates"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("pickup")}
              className={`rounded-2xl border p-3 text-left transition ${
                mode === "pickup" ? "border-moss-700 bg-moss-50" : "border-moss-200 hover:border-moss-300"
              }`}
            >
              <span className="text-xl">🏪</span>
              <span className="mt-1 block text-sm font-semibold text-moss-900">Pick-up</span>
              <span className="block text-xs text-moss-500">Free, ready at the shop</span>
            </button>
          </div>

          {mode === "delivery" ? (
            <div className="mt-4 space-y-3">
              <div>
                <span className="label">Delivery address</span>
                {addresses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-moss-300 p-4 text-sm text-moss-600">
                    You have no saved addresses yet.
                    <Link href="/account#addresses" className="ml-1 font-semibold text-moss-800 underline">
                      Add one in your account
                    </Link>
                    .
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 text-sm transition ${
                          addressId === address.id ? "border-moss-700 bg-moss-50" : "border-moss-200 hover:border-moss-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="addressChoice"
                          checked={addressId === address.id}
                          onChange={() => setAddressId(address.id)}
                          className="mt-0.5 accent-moss-700"
                        />
                        <span>
                          <strong className="block font-semibold text-moss-900">
                            {address.label} {address.is_default ? <span className="chip ml-1 bg-gold-100 text-gold-800">Default</span> : null}
                          </strong>
                          <span className="text-xs text-moss-600">
                            {address.line}, {address.barangay}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <Link href="/account#addresses" className="mt-2 inline-block text-xs font-semibold text-moss-700 underline">
                  + Add another address (up to 10)
                </Link>
              </div>

              <div>
                <label htmlFor="rate" className="label">
                  Delivery rate
                </label>
                <select
                  id="rate"
                  className="input"
                  value={rateId ?? ""}
                  onChange={(e) => setRateId(Number(e.target.value))}
                >
                  {rates.map((rate) => (
                    <option key={rate.id} value={rate.id}>
                      {rate.label} — {peso(rate.fee)} · {rate.eta}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-moss-50 p-3 text-sm text-moss-700">
              <p className="font-semibold text-moss-900">Pick up at {shopName}</p>
              <p className="mt-0.5 text-xs">We will notify you when the seller marks your order ready. No delivery fee.</p>
            </div>
          )}
        </section>

        <section className="card p-4">
          <h2 className="font-display text-lg font-semibold text-moss-900">Payment method</h2>
          <div className="mt-3 space-y-2">
            {PAYMENTS.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition ${
                  payment === option.id ? "border-moss-700 bg-moss-50" : "border-moss-200 hover:border-moss-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentChoice"
                  checked={payment === option.id}
                  onChange={() => setPayment(option.id)}
                  className="accent-moss-700"
                />
                <span className="text-lg">{option.emoji}</span>
                <span>
                  <strong className="block font-semibold text-moss-900">{option.label}</strong>
                  <span className="text-xs text-moss-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-gold-50 px-3 py-2 text-[11px] text-gold-900">
            MyBoakenoApp does not process or hold payments. GCash and Maya transfers are arranged with the seller, who
            confirms receipt inside the app.
          </p>
        </section>

        <section className="card p-4">
          <label htmlFor="note" className="label">
            Note for the seller (optional)
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="e.g. Please pack the kalamay separately, I'll pick up at 4 PM."
            className="input resize-none"
          />
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="card p-4">
          <h2 className="font-display text-lg font-semibold text-moss-900">Order summary</h2>
          <ul className="mt-3 space-y-2">
            {lines.map((line) => (
              <li key={line.id} className="flex items-start gap-2 text-sm">
                {line.image_id ? (
                  <img
                    src={`/media/${line.image_id}`}
                    alt={line.name}
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-lg">{line.emoji}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-moss-900">{line.name}</span>
                  <span className="text-xs text-moss-500">
                    {line.qty} × {peso(line.price)}
                  </span>
                </span>
                <span className="font-semibold text-moss-900">{peso(line.price * line.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-moss-100 pt-3 text-sm">
            <div className="flex justify-between text-moss-600">
              <dt>Subtotal</dt>
              <dd>{peso(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-moss-600">
              <dt>{mode === "delivery" ? "Delivery fee" : "Pick-up"}</dt>
              <dd>{mode === "delivery" ? peso(deliveryFee) : "Free"}</dd>
            </div>
            <div className="flex justify-between pt-1.5 font-display text-lg font-semibold text-moss-900">
              <dt>Total</dt>
              <dd>{peso(total)}</dd>
            </div>
          </dl>

          {missingAddress ? (
            <Link href="/account#addresses" className="btn-primary mt-3 w-full">
              Add a delivery address
            </Link>
          ) : (
            <SubmitButton className="btn-gold mt-3 w-full" pendingLabel="Placing order…">
              Place order · {peso(total)}
            </SubmitButton>
          )}
          {!canSubmit ? <p className="mt-2 text-center text-[11px] text-rose-700">Complete the delivery details above.</p> : null}
          <p className="mt-2 text-center text-[11px] text-moss-500">
            {missingRate
              ? "Choose a delivery rate to continue."
              : "You will get a tracking page and a downloadable receipt."}
          </p>
        </div>
      </aside>
    </form>
  );
}
