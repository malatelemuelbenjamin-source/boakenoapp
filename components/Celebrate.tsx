"use client";

import { useEffect, useMemo, useState } from "react";

const COLORS = ["#e01414", "#f52f2f", "#ff9a9a", "#e9c257", "#ffffff", "#9b1212"];

export default function Celebrate({ pieces = 44 }: { pieces?: number }) {
  const [done, setDone] = useState(false);

  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const seed = (i * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        const size = 6 + Math.round(rnd * 7);
        return {
          left: `${(i / pieces) * 100 + rnd * 4}%`,
          delay: `${Math.round(rnd * 380)}ms`,
          duration: `${1200 + Math.round(rnd * 900)}ms`,
          color: COLORS[i % COLORS.length],
          size,
          tall: Math.round(size * 1.7),
        };
      }),
    [pieces],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {bits.map((bit, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-[2px]"
          style={{
            left: bit.left,
            width: bit.size,
            height: bit.tall,
            backgroundColor: bit.color,
            animation: `confettiFall ${bit.duration} cubic-bezier(.25,.6,.4,1) ${bit.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
}
