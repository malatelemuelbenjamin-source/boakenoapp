import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { BARANGAYS } from "@/lib/boac";
import { loginAction, signupAction } from "@/app/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import Logo, { LogoMark } from "@/components/Logo";
import { Alert } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
}) {
  const { mode, next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") ? next : homeForRole(user.role));

  const isSignup = mode === "signup";
  const errorMessage =
    error === "invalid"
      ? "That email and password combination did not work."
      : error === "exists"
        ? "An account with that email already exists. Sign in instead."
        : error === "fields"
          ? "Please complete the required fields. Passwords need at least 6 characters."
          : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hero-brand relative hidden overflow-hidden p-10 text-white lg:block">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-gold-300/25 blur-3xl animate-drift" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl animate-drift" />
        <span className="pointer-events-none absolute right-14 top-24 text-5xl opacity-25 animate-floaty" aria-hidden="true">
          ⛪
        </span>
        <span
          className="pointer-events-none absolute bottom-28 right-24 text-4xl opacity-20 animate-floaty"
          style={{ animationDelay: "1.6s" }}
          aria-hidden="true"
        >
          🚂
        </span>
        <div className="relative flex h-full flex-col">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative inline-flex">
              <span className="absolute inset-0 -z-10 rounded-2xl bg-white/30 blur-lg animate-glow-pulse" aria-hidden="true" />
              <LogoMark className="h-12 w-12 rounded-2xl shadow-glow animate-bob" />
            </span>
            <span>
              <span className="block font-display text-xl font-semibold">MyBoakenoApp</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-white/70">Boac · Marinduque</span>
            </span>
          </Link>
          <div className="mt-16 max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-200">Ang Bayang Biak</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.1]">
              One account for Boac travel, shopping and community alerts.
            </h1>
            <ul className="mt-8 space-y-3 text-sm text-moss-100">
              <li>🧭 Save heritage sites and plan island trips.</li>
              <li>🛒 Order from Boac sellers and follow every delivery.</li>
              <li>🚨 Report incidents straight to the MDRRMO duty desk.</li>
              <li>🏞️ Read park and facility updates posted by the tourism office.</li>
            </ul>
          </div>
          <p className="mt-auto text-xs text-moss-200">
            No demo accounts: everything here is created by real sign-ups on this installation.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
            <Logo size="md" />
          </Link>

          <div className="flex gap-1.5 rounded-full bg-white p-1 shadow-sm">
            <Link
              href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
              className={`tab flex-1 text-center ${!isSignup ? "tab-active" : ""}`}
            >
              Sign in
            </Link>
            <Link
              href={`/login?mode=signup${next ? `&next=${encodeURIComponent(next)}` : ""}`}
              className={`tab flex-1 text-center ${isSignup ? "tab-active" : ""}`}
            >
              Create account
            </Link>
          </div>

          <div className="card mt-4 p-5">
            <h2 className="font-display text-2xl font-semibold text-moss-900">
              {isSignup ? "Join MyBoakeno" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-moss-600">
              {isSignup ? "Create a resident account, or open your own Boac shop." : "Sign in to track orders and your bucket list."}
            </p>

            {errorMessage ? (
              <div className="mt-3">
                <Alert tone="error">{errorMessage}</Alert>
              </div>
            ) : null}

            {isSignup ? (
              <form action={signupAction} className="mt-4 space-y-3">
                {next ? <input type="hidden" name="next" value={next} /> : null}
                <div>
                  <label className="label" htmlFor="name">
                    Full name
                  </label>
                  <input id="name" name="name" required className="input" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="email">
                      Email
                    </label>
                    <input id="email" name="email" type="email" required className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="phone">
                      Mobile
                    </label>
                    <input id="phone" name="phone" className="input" placeholder="0917 000 0000" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="barangay">
                    Barangay
                  </label>
                  <select id="barangay" name="barangay" className="input" defaultValue="Tampus (Poblacion)">
                    {BARANGAYS.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="input"
                    placeholder="At least 6 characters"
                  />
                </div>
                <label className="flex items-start gap-2 rounded-2xl bg-moss-50 p-3 text-sm text-moss-800">
                  <input type="checkbox" name="wantsShop" className="mt-0.5 accent-brand-600" />
                  <span>
                    <strong className="block font-semibold">I want to sell on MyBoakeno</strong>
                    <span className="text-xs text-moss-600">Free shop, no commissions. Set it up after signing in.</span>
                  </span>
                </label>
                <SubmitButton className="btn-primary w-full" pendingLabel="Creating account…">
                  Create account
                </SubmitButton>
              </form>
            ) : (
              <form action={loginAction} className="mt-4 space-y-3">
                {next ? <input type="hidden" name="next" value={next} /> : null}
                <div>
                  <label className="label" htmlFor="login-email">
                    Email
                  </label>
                  <input id="login-email" name="email" type="email" required autoComplete="email" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="login-password">
                    Password
                  </label>
                  <input id="login-password" name="password" type="password" required autoComplete="current-password" className="input" />
                </div>
                <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">
                  Sign in
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
