"use client";

import { useEffect } from "react";
import { BRAND } from "@/lib/helpers";

export const ICONS: Record<string, string> = {
  trash:   "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  plus:    "M12 5v14M5 12h14",
  check:   "M20 6L9 17l-5-5",
  x:       "M18 6L6 18M6 6l12 12",
  warn:    "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  upload:  "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

export function I({ n, s = 13, c }: { n: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c || "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={ICONS[n] ?? ""} />
    </svg>
  );
}

export const INP: React.CSSProperties = {
  border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 11px",
  fontSize: 13, fontFamily: "inherit", color: "#1e293b", background: "#fff",
  outline: "none", width: "100%", boxSizing: "border-box",
};

export function Field({ label, children, half, third }: { label: string; children: React.ReactNode; half?: boolean; third?: boolean }) {
  const w = third ? "calc(33.33% - 7px)" : half ? "calc(50% - 5px)" : "100%";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: w, minWidth: 0, flexShrink: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>{label}</label>
      {children}
    </div>
  );
}

export function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...INP, ...props.style }} />;
}

export function Tex(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...INP, minHeight: 60, resize: "vertical", ...props.style }} />;
}

export function Sel({ options, ...props }: { options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...INP, ...props.style }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Btn({ children, onClick, variant, small, style, disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "muted" | "ghost" | "teal"; small?: boolean;
  style?: React.CSSProperties; disabled?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit", fontWeight: 600, border: "none", borderRadius: 8,
    padding: small ? "5px 11px" : "8px 16px", fontSize: small ? 11 : 12, opacity: disabled ? .6 : 1,
    background: variant === "muted" ? "#f1f5f9" : variant === "ghost" ? "transparent" : variant === "teal" ? BRAND.teal : BRAND.navy,
    color: variant === "muted" ? "#64748b" : variant === "ghost" ? "#64748b" : "#fff",
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...style }}>{children}</button>;
}

export function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: wide ? 680 : 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><I n="x" s={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
