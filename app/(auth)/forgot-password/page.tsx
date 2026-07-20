"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND } from "@/lib/helpers";

// The neutral confirmation is shown whether or not an account exists, so the page
// never reveals which addresses are registered.
const NEUTRAL_MESSAGE =
  "If an account exists for that address, a reset link is on its way.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    // The reset email links back to /reset-password on this same origin (which is
    // the production URL in production). That URL must be in Supabase's redirect
    // allowlist. We intentionally ignore the result: success and "no such account"
    // must look identical to the user.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setSent(true);
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
          <div style={{ padding: "28px 32px 22px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <InfinityLogoImg height={56} />
            </div>
          </div>

          <div style={{ padding: "28px 32px 32px" }}>
            <h2 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 22, fontWeight: 400, color: BRAND.navy, margin: "0 0 8px" }}>
              Reset your password
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
              Enter the email on your account and we&rsquo;ll send a link to set a new password.
            </p>

            {sent ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: "#dcfce7", color: "#15803d", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.5 }}>
                  {NEUTRAL_MESSAGE}
                </div>
                <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: BRAND.blue, textDecoration: "none", textAlign: "center" }}>
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                  {loading ? "Sending..." : "Send reset link"}
                </button>

                <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: BRAND.blue, textDecoration: "none", textAlign: "center" }}>
                  Back to sign in
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
