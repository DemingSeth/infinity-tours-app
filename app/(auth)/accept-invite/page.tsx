"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND } from "@/lib/helpers";
import { firstName } from "@/lib/invites";

type Status = "checking" | "ready" | "invalid" | "saving";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [greeting, setGreeting] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  // Establish the session from the invite link. This is the same token_hash +
  // verifyOtp path the password reset page uses, and for the same reason: an
  // invite email is very often opened in a different browser or device from the
  // one that sent it, so nothing can be assumed about prior browser storage.
  // The only difference is the OTP type, which is "invite" here. Legacy PKCE
  // (?code=) and implicit-hash (#access_token=) forms are kept as minimal
  // fallbacks. Any failure (an expired link, or one already used to set a
  // password) drops the visitor to the branded "invalid" state.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const supabase = createClient();

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
          // Primary, expected path for invite links.
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: (type ?? "invite") as EmailOtpType,
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

        // Greet them by name. The invite action put the full name an admin typed
        // into the invite metadata, so it is available before they have filled
        // anything in themselves.
        if (session) setGreeting(firstName(session.user.user_metadata?.name));

        // Strip the token from the address bar once consumed.
        if (token_hash || code || hashParams.get("access_token")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch {
        setStatus("invalid");
      }
    })();
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
    // Unlike a password reset, the session stays: the invite is now accepted and
    // the new team member goes straight into the app. Their tour_hosts row was
    // written with the right name and role when the invite was sent.
    router.push("/dashboard");
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
            <h2 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 22, fontWeight: 400, color: BRAND.navy, margin: "0 0 24px" }}>
              {greeting ? `Welcome, ${greeting}` : "Welcome to Infinity Tours"}
            </h2>

            {status === "checking" && (
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Verifying your invite...</p>
            )}

            {status === "invalid" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "12px 14px", fontSize: 13, lineHeight: 1.5 }}>
                  This invite link is invalid or has expired. If you already set a password, sign in
                  below. Otherwise ask your administrator to send a new invite.
                </div>
                <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: BRAND.blue, textDecoration: "none", textAlign: "center" }}>
                  Go to sign in
                </Link>
              </div>
            )}

            {(status === "ready" || status === "saving") && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: 0 }}>
                  Choose a password to finish setting up your account.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Password</label>
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
                    placeholder="Re-enter your password"
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
                  {status === "saving" ? "Setting up..." : "Set password and continue"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
