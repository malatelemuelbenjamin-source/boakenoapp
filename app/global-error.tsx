"use client";

import { useEffect } from "react";

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "14px",
  padding: "48px 24px",
  textAlign: "center",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  color: "#1f3a2d",
  background: "#f7f9f6",
};

const button: React.CSSProperties = {
  borderRadius: "999px",
  background: "#2f6b4f",
  color: "#fff",
  padding: "10px 22px",
  fontSize: "14px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
};

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main style={shell}>
          <p style={{ fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#4b7a63", margin: 0 }}>
            MyBoakeno
          </p>
          <h1 style={{ fontSize: "26px", margin: 0 }}>Something went wrong</h1>
          <p style={{ maxWidth: "34rem", fontSize: "14px", lineHeight: 1.6, color: "#3a5a4a", margin: 0 }}>
            The page could not load. If you just deployed this app, check that the database environment variables{" "}
            <code>TURSO_DATABASE_URL</code> and <code>TURSO_AUTH_TOKEN</code> are set in your hosting project, then try
            again.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" onClick={reset} style={button}>
              Try again
            </button>
            <a
              href="/"
              style={{ ...button, background: "#e4ece6", color: "#1f3a2d", display: "inline-block" }}
            >
              Go home
            </a>
          </div>
          {error.digest ? <p style={{ fontSize: "11px", color: "#7d9187", margin: 0 }}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
