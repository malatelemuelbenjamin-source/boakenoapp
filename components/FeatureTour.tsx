"use client";

import { useEffect, useState } from "react";

const SCENES = [
  {
    key: "explore",
    label: "Explore",
    title: "A map of Boac's heritage",
    caption:
      "Browse published places, open a pin, and save the ones you want to see. Only verified locations get a pin.",
    scene: (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-gold-50">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(#f8caca_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute left-6 right-6 top-1/2 origin-left border-t-2 border-dashed border-brand-400/70 animate-[grow_1.6s_ease-out_both]" />
        {[
          { left: "18%", top: "30%", emoji: "⛪", delay: "0ms" },
          { left: "49%", top: "62%", emoji: "🏛️", delay: "240ms" },
          { left: "75%", top: "28%", emoji: "🌉", delay: "480ms" },
        ].map((pin) => (
          <span
            key={pin.emoji}
            style={{ left: pin.left, top: pin.top, animationDelay: pin.delay }}
            className="absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-lg shadow-md ring-2 ring-brand-500/40 animate-[popIn_.7s_ease_both]"
          >
            {pin.emoji}
          </span>
        ))}
        <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-moss-800 shadow-sm animate-[popIn_.6s_ease_both_600ms]">
Heritage places · 61 barangays
        </div>
      </div>
    ),
  },
  {
    key: "bucket",
    label: "Bucket list",
    title: "Plan the trip, tick it off",
    caption: "Add places as planned, mark them visited after the trip, and watch your Boac progress fill up.",
    scene: (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-white p-4">
        <div className="space-y-2">
          {[
            { name: "Boac Cathedral", state: "visited" },
            { name: "National Museum", state: "visited" },
            { name: "Biglang Awa Bridge", state: "planned" },
          ].map((item, i) => (
            <div
              key={item.name}
              style={{ animationDelay: `${i * 220}ms` }}
              className="flex items-center gap-2 rounded-xl border border-moss-100 px-3 py-2 animate-[popRow_.6s_ease_both]"
            >
              <span
                style={{ animationDelay: `${i * 220 + 260}ms` }}
                className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold animate-[checkPop_.5s_ease_both] ${
                  item.state === "visited" ? "bg-brand-600 text-white" : "bg-moss-100 text-moss-500"
                }`}
              >
                {item.state === "visited" ? "✓" : "•"}
              </span>
              <span className="flex-1 text-xs font-semibold text-moss-900">{item.name}</span>
              <span className={`chip ${item.state === "visited" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                {item.state}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-moss-100">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-gold-400 animate-[fillBar_1.6s_ease-out_both]" />
        </div>
      </div>
    ),
  },
  {
    key: "market",
    label: "Market",
    title: "Order directly from Boac sellers",
    caption: "Real shops created by real sellers. Browse products, add to a one-shop basket, and check out.",
    scene: (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-white p-4">
        <div className="grid grid-cols-3 gap-2">
          {["🧺", "☕", "🎭"].map((emoji, i) => (
            <div
              key={emoji}
              style={{ animationDelay: `${i * 180}ms` }}
              className="rounded-xl border border-moss-100 bg-moss-50/60 p-2 text-center animate-[popRow_.6s_ease_both]"
            >
              <div className="text-xl">{emoji}</div>
              <div className="mt-1 h-1.5 w-8/12 mx-auto rounded bg-moss-200" />
              <div className="mt-1 h-1.5 w-5/12 mx-auto rounded bg-brand-200" />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] font-semibold text-brand-800 animate-[popRow_.6s_ease_both_600ms]">
          No middlemen · no commissions · free to open a shop
        </div>
        <div className="absolute right-4 top-4 grid h-9 min-w-9 place-items-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white animate-[checkPop_.6s_ease_both_1s]">
          3
        </div>
      </div>
    ),
  },
  {
    key: "track",
    label: "Delivery",
    title: "Follow the rider, keep the receipt",
    caption: "Delivery or pickup, seller-set rates, and a status trail from placed to completed — with a printable receipt.",
    scene: (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-white to-brand-50 p-4">
        <div className="relative mt-2 h-8">
          <div className="absolute left-2 right-2 top-1/2 border-t-2 border-dashed border-brand-300" />
          <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-brand-600" />
          <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold-500" />
          <span className="absolute top-1/2 -translate-y-1/2 text-2xl animate-[drive_4s_linear_infinite]">🛵</span>
        </div>
        <div className="mt-4 flex items-center gap-1">
          {["Placed", "Confirmed", "Preparing", "On the way", "Done"].map((step, i) => (
            <div key={step} className="flex flex-1 flex-col items-center gap-1">
              <span
                style={{ animationDelay: `${i * 320}ms` }}
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold animate-[checkPop_.5s_ease_both] ${
                  i < 4 ? "bg-brand-600 text-white" : "border border-moss-200 bg-white text-moss-400"
                }`}
              >
                {i < 4 ? "✓" : "5"}
              </span>
              <span className="text-[9px] font-semibold text-moss-600">{step}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-3 right-3 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-moss-700 shadow-sm">
          Receipt · downloadable
        </div>
      </div>
    ),
  },
  {
    key: "respond",
    label: "Response",
    title: "Report an incident to MDRRMO",
    caption: "Residents send type, severity, barangay, description and an optional pin. The duty desk dispatches a team.",
    scene: (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-white to-brand-50 p-4">
        <div className="flex items-start gap-3">
          <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-xl text-white">
            🚨
            <span className="absolute inset-0 rounded-2xl animate-[ringOut_2.2s_ease-out_infinite] border-2 border-brand-500" />
          </span>
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-2/3 rounded bg-moss-200 animate-[popRow_.5s_ease_both]" />
            <div className="h-2 w-5/6 rounded bg-moss-100 animate-[popRow_.5s_ease_both_150ms]" />
            <div className="h-2 w-1/2 rounded bg-moss-100 animate-[popRow_.5s_ease_both_300ms]" />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {["Report received by the duty desk", "Responder dispatch recorded"].map((team, i) => (
            <div
              key={team}
              style={{ animationDelay: `${600 + i * 220}ms` }}
              className="flex items-center justify-between rounded-xl border border-moss-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-moss-800 animate-[popRow_.6s_ease_both]"
            >
              <span>{team}</span>
              <span className="chip bg-emerald-100 text-emerald-800">tracked</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "tourism",
    label: "Tourism desk",
    title: "The LGU keeps the content real",
    caption:
      "Tourism staff publish places, park status, schedules and officer verification. Nothing appears to the public until they post it.",
    scene: (
      <div className="relative h-44 overflow-hidden rounded-2xl bg-white p-4">
        {[
          { label: "Boac Cathedral", status: "published" },
          { label: "Battle of Paye marker", status: "pending" },
          { label: "Facility status", status: "open" },
        ].map((row, i) => (
          <div
            key={row.label}
            style={{ animationDelay: `${i * 240}ms` }}
            className="mb-2 flex items-center justify-between rounded-xl border border-moss-100 px-3 py-2 animate-[popRow_.6s_ease_both]"
          >
            <span className="text-[11px] font-semibold text-moss-900">{row.label}</span>
            <span
              className={`chip ${
                row.status === "published" || row.status === "open"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {row.status}
            </span>
          </div>
        ))}
        <div className="rounded-xl bg-moss-900 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white animate-[popRow_.6s_ease_both_700ms]">
Published by the LGU desk
        </div>
      </div>
    ),
  },
];

export default function FeatureTour() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SCENES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const scene = SCENES[index];

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-card backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-moss-100 px-5 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-700">Feature tour</p>
          <h2 className="font-display text-lg font-semibold text-moss-950">How MyBoakeno works</h2>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="btn-sm border border-moss-200 px-3 py-1.5 text-moss-800 hover:bg-moss-50"
          aria-pressed={!playing}
        >
          {playing ? "❚❚ Pause tour" : "▶ Play tour"}
        </button>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div key={scene.key} className="animate-[riseIn_.55s_cubic-bezier(.22,1,.36,1)_both]">
          {scene.scene}
        </div>
        <div key={`${scene.key}-copy`} className="animate-[riseIn_.55s_cubic-bezier(.22,1,.36,1)_both]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-700">
            {index + 1} / {SCENES.length} · {scene.label}
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold leading-tight text-moss-950">{scene.title}</h3>
          <p className="mt-2 text-sm text-moss-600">{scene.caption}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SCENES.map((item, i) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setIndex(i);
                  setPlaying(false);
                }}
                aria-label={`Show ${item.label}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-7 bg-brand-600" : "w-2 bg-moss-200 hover:bg-brand-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-moss-100">
        <div
          key={`${scene.key}-bar`}
          className="h-full bg-gradient-to-r from-brand-600 to-gold-400"
          style={{ animation: playing ? "fillBar 5.2s linear forwards" : "none", width: playing ? undefined : "100%" }}
        />
      </div>
    </section>
  );
}
