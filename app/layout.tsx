import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import AppFrame from "@/components/AppFrame";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyBoakenoApp · Boac, Marinduque",
  description:
    "The all-in-one Boac app: explore heritage sites, shop from Boac sellers, track deliveries, and reach MDRRMO and tourism services.",
  applicationName: "MyBoakenoApp",
  appleWebApp: { capable: true, title: "MyBoakenoApp", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#bc0f0f",
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  let cartCount = 0;
  let unread = 0;
  if (user) {
    cartCount =
      (await queryOne<{ c: number }>(
        "SELECT COALESCE(SUM(qty), 0) c FROM cart_items WHERE user_id = ?",
        user.id,
      ))?.c ?? 0;
    unread =
      (await queryOne<{ c: number }>(
        "SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND is_read = 0",
        user.id,
      ))?.c ?? 0;
  }

  return (
    <html lang="en">
      <head>
        {/* Credentialed fetch keeps the manifest working behind authenticated preview proxies. */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body>
        <AppFrame user={user} cartCount={cartCount} unread={unread}>
          {children}
        </AppFrame>
      </body>
    </html>
  );
}
