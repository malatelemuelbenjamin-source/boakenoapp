"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, hashPassword, queryOne, verifyPassword } from "@/lib/db";
import { BARANGAYS } from "@/lib/boac";
import { createSession, destroySession, homeForRole, isOwnerEmail } from "@/lib/auth";

function safeNext(value: FormDataEntryValue | null): string | null {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const user = await queryOne<{ id: number; role: string; password_hash: string }>(
    "SELECT id, role, password_hash FROM users WHERE lower(email) = ?",
    email,
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect(`/login?error=invalid${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  // The owner account is always an administrator, even if its role was changed.
  if (isOwnerEmail(email) && user.role !== "admin") {
    await execute("UPDATE users SET role = 'admin' WHERE id = ?", user.id);
    user.role = "admin";
  }
  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect(next ?? homeForRole(user.role));
}

/**
 * There are no pre-made demo accounts. The administrator role belongs only to the
 * owner email (see OWNER_EMAIL); every other sign-up joins as a resident or seller,
 * so nobody else can claim administration of a new installation.
 */
export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const barangay = String(formData.get("barangay") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const wantsShop = formData.get("wantsShop") === "on";
  const owner = isOwnerEmail(email);

  if (!name || !email || password.length < (owner ? 8 : 6)) {
    redirect("/login?error=fields&mode=signup");
  }
  if (await queryOne("SELECT id FROM users WHERE lower(email) = ?", email)) {
    redirect("/login?error=exists&mode=signup");
  }

  const info = await execute(
    `INSERT INTO users (name, email, phone, barangay, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name,
    email,
    phone || null,
    BARANGAYS.includes(barangay) ? barangay : null,
    owner ? "admin" : wantsShop ? "seller" : "resident",
    hashPassword(password),
    new Date().toISOString(),
  );
  await createSession(Number(info.lastInsertRowid));
  revalidatePath("/", "layout");
  redirect(owner ? "/panels/tourism" : wantsShop ? "/seller?welcome=1" : "/");
}

export async function logoutAction() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}
