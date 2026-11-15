"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import Logo from "./Logo";
import ScrollProgress from "./ScrollProgress";

const ICONS: Record<string, string> = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9h13v-9",
  explore: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.8 5.2-2.1 5.4-5.5 2.1 2.1-5.4Z",
  market: "M4 9h16l-1.2 10H5.2L4 9Zm3 0V7a5 5 0 0 1 10 0v2",
  orders: "M7 3h10v18l-5-3-5 3V3Zm3 5h4m-4 4h4",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  bell: "M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Zm3.5 9a2.5 2.5 0 0 0 5 0",
  cart: "M4 5h2l2.2 10.2h9.4L20 8H7M9.5 20a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm8 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z",
};

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.home} />
    </svg>
  );
}

const BOTTOM = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/explore", label: "Explore", icon: "explore" },
  { href: "/market", label: "Market", icon: "market" },
  { href: "/orders", label: "Orders", icon: "orders" },
  { href: "/account", label: "Account", icon: "account" },
];

const DESKTOP = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/news", label: "News" },
  { href: "/market", label: "Market" },
  { href: "/park", label: "Park" },
  { href: "/orders", label: "Orders" },
  { href: "/emergency", label: "Emergency" },
];

export default function AppFrame({
  user,
  cartCount,
  unread,
  children,
}: {
  user: SessionUser | null;
  cartCount: number;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;

  const staffLink =
    user?.role === "seller"
      ? { href: "/seller", label: "Seller hub" }
      : user?.role === "mdrrmo"
        ? { href: "/panels/mdrrmo", label: "MDRRMO panel" }
        : user?.role === "tourism" || user?.role === "admin"
          ? { href: "/panels/tourism", label: "Tourism panel" }
          : null;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="ambient" aria-hidden="true" />
      <ScrollProgress />

      <header className="nav-glow sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2.5">
          <Link href="/" className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
            <Logo size="md" />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {DESKTOP.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-glow"
                      : "text-moss-700 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {staffLink ? (
              <Link
                href={staffLink.href}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  pathname.startsWith(staffLink.href)
                    ? "bg-gold-300 text-moss-950"
                    : "text-gold-700 hover:bg-gold-50"
                }`}
              >
                {staffLink.label}
              </Link>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="relative grid h-10 w-10 place-items-center rounded-full text-moss-800 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <Icon name="bell" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white animate-glow-pulse">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative grid h-10 w-10 place-items-center rounded-full text-moss-800 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <Icon name="cart" />
              {cartCount > 0 ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white animate-glow-pulse">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </Link>
            {user ? (
              <Link
                href="/account"
                className="ml-0.5 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold uppercase text-white shadow-glow transition hover:scale-105"
                title={user.name}
              >
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </Link>
            ) : (
              <Link href="/login" className="btn-primary btn-sm ml-1 px-3 py-2">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:pb-14">{children}</main>

      <footer className="hidden border-t border-white/60 bg-white/70 px-4 py-8 text-center text-xs text-moss-600 backdrop-blur md:block">
        <p className="flex items-center justify-center gap-2 font-semibold text-moss-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> MyBoakenoApp
        </p>
        <p className="mt-1">
          The community app for Boac, Marinduque — heritage, local sellers, news and emergency services in one place.
        </p>
        <p className="mt-1 text-moss-500">
          Listings, posts and reports are published by their authors. In a real emergency, always call 911.
        </p>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1.5">
          {BOTTOM.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition ${
                  active ? "text-brand-700" : "text-moss-500"
                }`}
              >
                <span
                  className={`relative grid h-7 w-9 place-items-center rounded-full transition ${
                    active ? "bg-brand-100 animate-glow-pulse" : ""
                  }`}
                >
                  <Icon name={item.icon} className="h-[21px] w-[21px]" />
                  {item.href === "/market" && cartCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
                {item.label}
                {active ? <span className="mt-0.5 h-1 w-1 rounded-full bg-brand-500" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
