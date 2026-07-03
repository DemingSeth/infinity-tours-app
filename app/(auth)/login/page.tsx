"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND } from "@/lib/helpers";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // proxy.ts already bounces authenticated visitors off /login (and leaves
  // /reset-password reachable for a recovery session). Here we only surface the
  // post-reset success notice carried back on ?reset=success.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "success") {
      setNotice("Your password has been updated. Please sign in with your new password.");
    }
  }, []);

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
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "inherit",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
          {/* Brand header — light background, image logo looks natural here. The
              lockup already includes the "INFINITY / TOURS + EVENTS" wordmark, so
              no separate text block is rendered (it would duplicate the wordmark). */}
          <div style={{ padding: "28px 32px 22px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <InfinityLogoImg height={56} />
            </div>
          </div>

          <div style={{ padding: "28px 32px 32px" }}>
          <h2 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 22, fontWeight: 700, color: BRAND.navy, margin: "0 0 24px" }}>
            Sign in
          </h2>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {notice && (
              <div style={{ background: "#dcfce7", color: "#15803d", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                {notice}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Email</label>
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
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
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
              <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
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
