"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";

export default function AccountForm({
  userId,
  email,
  initialName,
}: {
  userId: string;
  email: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (savingName) return;
    setNameMsg(null);
    if (!name.trim()) {
      setNameMsg({ ok: false, text: "Name can't be empty." });
      return;
    }
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("tour_hosts")
      .update({ name: name.trim() })
      .eq("id", userId);
    setSavingName(false);
    setNameMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Name updated." });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (savingPw) return;
    setPwMsg(null);
    if (password.length < 8) {
      setPwMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setPwMsg({ ok: false, text: "The passwords don't match." });
      return;
    }
    setSavingPw(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPw(false);
    if (error) {
      setPwMsg({ ok: false, text: error.message });
      return;
    }
    setPassword("");
    setConfirm("");
    setPwMsg({ ok: true, text: "Password updated." });
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em", fontSize: 24, fontWeight: 400, color: BRAND.navy, margin: 0 }}>
        Account
      </h1>

      {/* Profile */}
      <section style={card}>
        <h2 style={sectionTitle}>Profile</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
          <label style={fieldLabel}>Email</label>
          <input value={email} readOnly style={{ ...inp, background: "#f8fafc", color: "#64748b", cursor: "not-allowed" }} />
        </div>

        <form onSubmit={saveName} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={fieldLabel}>Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="Your name" />
          {nameMsg && <Msg ok={nameMsg.ok} text={nameMsg.text} />}
          <div style={{ marginTop: 10 }}>
            <button type="submit" disabled={savingName} style={btn(savingName)}>
              {savingName ? "Saving..." : "Save name"}
            </button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section style={card}>
        <h2 style={sectionTitle}>Change password</h2>
        <form onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={fieldLabel}>New password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              placeholder="At least 8 characters"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={fieldLabel}>Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={inp}
              placeholder="Re-enter new password"
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {pwMsg && <Msg ok={pwMsg.ok} text={pwMsg.text} />}
          <div>
            <button type="submit" disabled={savingPw} style={btn(savingPw)}>
              {savingPw ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Msg({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{
      background: ok ? "#dcfce7" : "#fee2e2",
      color: ok ? "#15803d" : "#b91c1c",
      borderRadius: 8, padding: "8px 12px", fontSize: 13,
    }}>
      {text}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid #e8eef4",
  borderRadius: 14,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Fjalla One', Georgia, sans-serif",
  letterSpacing: "0.03em",
  fontSize: 15,
  fontWeight: 700,
  color: BRAND.navy,
  margin: "0 0 14px",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

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

function btn(busy: boolean): React.CSSProperties {
  return {
    background: BRAND.navy,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  };
}
