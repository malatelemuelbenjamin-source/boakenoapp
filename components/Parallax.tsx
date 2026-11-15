"use client";

import { useEffect, useRef } from "react";

export default function Parallax({
  children,
  className = "",
  strength = 16,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      raf = 0;
      node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    };

    const queue = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      x = Math.max(-1, Math.min(1, dx)) * strength;
      y = Math.max(-1, Math.min(1, dy)) * strength;
      queue();
    };

    const reset = () => {
      x = 0;
      y = 0;
      queue();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", reset);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div ref={ref} className={`${className} transition-transform duration-300 ease-out will-change-transform`}>
      {children}
    </div>
  );
}
