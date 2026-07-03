"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND } from "@/lib/helpers";

type Status = "checking" | "ready" | "invalid" | "saving";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  // Establish the recovery session. The recovery email link carries a token hash
  // (?token_hash=...&type=recovery), verified with verifyOtp — the robust path
  // for email links: it needs nothing from prior browser storage, so it works no
  // matter where the link is opened (a different browser, device, or incognito).
  // Legacy PKCE (?code=) and implicit-hash (#access_token=) forms are kept only
  // as minimal fallbacks; verifyOtp on the token hash is the expected path. The
  // @supabase/ssr client may also surface recovery via the PASSWORD_RECOVERY
  // event. Any failure (an expired or already-used link, or a link opened
  // without a valid token) drops the user to the branded "invalid" state with a
  // way back to /forgot-password.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const supabase = createClient();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const token_hash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const code = url.searchParams.get("code");
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        if (token_hash) {
          // Primary, expected path for email recovery links.
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: (type ?? "recovery") as EmailOtpType,
          });
          if (error) throw error;
        } else if (code) {
          // Legacy PKCE fallback.
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (hashParams.get("access_token")) {
          // Legacy implicit-hash fallback.
          const access_token = hashParams.get("access_token")!;
          const refresh_token = hashParams.get("refresh_token") ?? "";
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }

        // Confirm an actual session exists before showing the form.
        const { data: { session } } = await supabase.auth.getSession();
        setStatus(session ? "ready" : "invalid");

        // Strip the token from the address bar once consumed.
        if (token_hash || code || hashParams.get("access_token")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch {
        setStatus("invalid");
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setStatus("saving");
    const supabase = createClient();
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setStatus("ready");
      return;
    }
    // New password saved. End the recovery session and send them to sign in fresh.
    await supabase.auth.signOut();
    router.push("/login?reset=success");
    router.refresh();
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
            <h2 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 22, fontWeight: 700, color: BRAND.navy, margin: "0 0 24px" }}>
              Set a new password
            </h2>

            {status === "checking" && (
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Verifying your reset link…</p>
            )}

            {status === "invalid" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.5 }}>
                  This password reset link is invalid or has expired. Request a new one to try again.
                </div>
                <Link href="/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: BRAND.blue, textDecoration: "none", textAlign: "center" }}>
                  Request a new reset link
                </Link>
              </div>
            )}

            {(status === "ready" || status === "saving") && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>New password</label>
                  <input
                    style={inp}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Confirm password</label>
                  <input
                    style={inp}
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "saving"}
                  style={{
                    background: BRAND.navy,
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: status === "saving" ? "not-allowed" : "pointer",
                    opacity: status === "saving" ? 0.7 : 1,
                    fontFamily: "inherit",
                    marginTop: 4,
                  }}
                >
                  {status === "saving" ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
