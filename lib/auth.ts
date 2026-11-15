import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import crypto from "node:crypto";
import { execute, queryOne } from "./db";

export const SESSION_COOKIE = "mbo_session";

/**
 * The owner account. Only this email can ever hold the administrator role, so a
 * fresh installation cannot be taken over by whoever registers first. Override
 * with the ADMIN_EMAIL environment variable when deploying.
 */
export const OWNER_EMAIL =
  (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase() || "lemuelbenjamin.malate@gmail.com";

export function isOwnerEmail(email: string): boolean {
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

/** Who may open the tourism administration panel. */
export function canManageTourism(role: string | null | undefined): boolean {
  return role === "admin" || role === "tourism";
}

/** Who may open the MDRRMO dispatch panel. */
export function canManageMdrrmo(role: string | null | undefined): boolean {
  return role === "admin" || role === "mdrrmo";
}

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  barangay: string | null;
  role: string;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const user = await queryOne<SessionUser>(
    `SELECT u.id, u.name, u.email, u.phone, u.barangay, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    sid,
  );
  return user ?? null;
});

export async function createSession(userId: number) {
  const sid = crypto.randomBytes(24).toString("hex");
  await execute("INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)", sid, userId, new Date().toISOString());
  const store = await cookies();
  store.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (sid) await execute("DELETE FROM sessions WHERE id = ?", sid);
  store.delete(SESSION_COOKIE);
}

export function homeForRole(role: string): string {
  switch (role) {
    case "seller":
      return "/seller";
    case "mdrrmo":
      return "/panels/mdrrmo";
    case "tourism":
    case "admin":
      return "/panels/tourism";
    default:
      return "/";
  }
}

export async function requireUser(nextPath = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireStaff(roles: string[], nextPath = "/"): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
