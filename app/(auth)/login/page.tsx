"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND } from "@/lib/helpers";

// useSearchParams suspends on the first client render of a prerendered page, so
// the form lives inside a boundary. Nothing is rendered as the fallback: the
// resolution is immediate and a flash of placeholder would be worse than none.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // proxy.ts already bounces authenticated visitors off /login (and leaves
  // /reset-password reachable for a recovery session). All this does is surface
  // the notices other screens hand back on the query string: the post-reset
  // success message (green), and the two reasons /auth/signout turns someone
  // away, which are warnings rather than successes and so render amber.
  //
  // Derived during render rather than pushed into state from an effect: it is a
  // pure function of the URL, so an effect would only add a second render pass.
  const notice = noticeFor(params);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid var(--border)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    color: "var(--text)",
    fontFamily: "inherit",
    background: "var(--surface)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ background: "var(--surface)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
          {/* Brand header: light background, image logo looks natural here. The
              lockup already includes the "INFINITY / TOURS + EVENTS" wordmark, so
              no separate text block is rendered (it would duplicate the wordmark). */}
          <div style={{ padding: "28px 32px 22px", textAlign: "center", borderBottom: "1px solid var(--surface-3)" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <InfinityLogoImg height={56} />
            </div>
          </div>

          <div style={{ padding: "28px 32px 32px" }}>
          <h2 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 22, fontWeight: 400, color: "var(--ink)", margin: "0 0 24px" }}>
            Sign in
          </h2>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {notice && (
              <div style={{
                background: notice.ok ? "var(--green-bg)" : "var(--amber-bg)",
                color: notice.ok ? "var(--green-text)" : "var(--amber-text)",
                borderRadius: 8, padding: "10px 14px", fontSize: 13, lineHeight: 1.5,
              }}>
                {notice.text}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
              <input
                style={inp}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@infinitytours.us"
                required
                autoComplete="email"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
              <input
                style={inp}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{ textAlign: "right", marginTop: -8 }}>
              <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: BRAND.blue, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>

            {error && (
              <div style={{ background: "var(--red-bg)", color: "var(--red-text)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: BRAND.navy,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                fontFamily: "inherit",
                marginTop: 4,
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// The three notices other screens redirect here with. Each query flag is
// matched exactly rather than reflected, so nothing a visitor puts in the
// address bar can put its own words on the sign in screen.
function noticeFor(params: URLSearchParams): { ok: boolean; text: string } | null {
  if (params.get("reset") === "success") {
    return { ok: true, text: "Your password has been updated. Please sign in with your new password." };
  }
  if (params.get("deactivated") === "1") {
    return {
      ok: false,
      text: "Your access to Infinity Tours has been turned off. Contact an administrator at Infinity Tours if you think this is a mistake.",
    };
  }
  if (params.get("noaccess") === "1") {
    return {
      ok: false,
      text: "This account is not set up for Infinity Tours yet. Ask an administrator at Infinity Tours to send you an invitation.",
    };
  }
  return null;
}
