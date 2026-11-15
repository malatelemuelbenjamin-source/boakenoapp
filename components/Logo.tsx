export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="MyBoakenoApp logo">
      <defs>
        <linearGradient id="mbo-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff3a3a" />
          <stop offset="52%" stopColor="#e20000" />
          <stop offset="100%" stopColor="#a80000" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="27" fill="url(#mbo-red)" />
      <g fill="#ffffff">
        <circle cx="55" cy="35" r="17" />
        <ellipse cx="72" cy="59" rx="24" ry="22" />
        <ellipse cx="68" cy="86" rx="25" ry="21" />
        <rect x="27" y="52" width="26" height="58" rx="13" transform="rotate(-36 40 81)" />
      </g>
      <g fill="none" stroke="#dd0000" strokeLinecap="round">
        <path d="M49.5 31.5c2.6-3.2 6.2-3.2 8.8 0" strokeWidth="2.6" />
        <path d="M61.5 31.5c2.6-3.2 6.2-3.2 8.8 0" strokeWidth="2.6" />
        <path d="M52.5 40.5c3.6 4.2 8.2 4.2 11.8 0" strokeWidth="2.6" />
        <path d="M68 51c14 4 18 15 6 23-10 7-8 16 4 21" strokeWidth="4.2" />
      </g>
      <circle cx="41" cy="46" r="2.4" fill="#ffffff" opacity=".55" />
    </svg>
  );
}

export default function Logo({
  size = "md",
  showWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}) {
  const box = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const title = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-[18px]";
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative inline-flex">
        <span className="absolute inset-0 -z-10 rounded-2xl bg-brand-500/40 blur-lg animate-glow-pulse" aria-hidden="true" />
        <LogoMark className={`${box} rounded-2xl shadow-glow animate-bob`} />
      </span>
      {showWordmark ? (
        <span className="leading-tight">
          <span className={`block font-display ${title} font-semibold tracking-tight text-moss-950`}>
            MyBoakeno<span className="text-brand-600">App</span>
          </span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-moss-500">
            Boac · Marinduque
          </span>
        </span>
      ) : null}
    </span>
  );
}
