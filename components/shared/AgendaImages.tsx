"use client";

import Image from "next/image";
import { X } from "lucide-react";

export default function AgendaImages({
  urls,
  size = 76,
  onRemove,
}: {
  urls: string[] | null | undefined;
  size?: number;
  onRemove?: (url: string) => void;
}) {
  if (!urls || urls.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {urls.map((url, i) => (
        <div key={`${url}-${i}`} style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", position: "relative", width: "100%", height: "100%",
              borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0",
              background: "#f1f5f9",
            }}
          >
            <Image src={url} alt="Agenda item photo" fill sizes={`${size}px`} style={{ objectFit: "cover" }} />
          </a>
          {onRemove && (
            <button
              type="button"
              title="Remove image"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(url); }}
              style={{
                position: "absolute", top: -6, right: -6, width: 20, height: 20,
                borderRadius: "50%", background: "#ef4444", color: "#fff",
                border: "2px solid #fff", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}
            >
              <X size={11} strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
