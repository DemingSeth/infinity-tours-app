"use client";

import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// "Request help" (October 2026): opens the signed-in person's own link to the
// AI Leverage request portal, where they report bugs and ask for changes.
//
// Each link is personal (it signs requests with that person's name and carries
// their approver or submitter role), so it is read from help_portal_links, whose
// RLS returns only the viewer's own row. No row, or any error, means no button:
// someone without a link never sees a control that cannot work.
export default function HelpRequestButton() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("help_portal_links")
        .select("url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (active && !error && data?.url) setUrl(data.url as string);
    })();
    return () => { active = false; };
  }, []);

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Report a bug or ask for a change"
      className="app-help-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(255,255,255,0.1)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.85)",
        borderRadius: 6,
        padding: "5px 12px",
        fontSize: 12,
        fontWeight: 600,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      <LifeBuoy size={13} />
      <span className="app-help-label">Request help</span>
    </a>
  );
}
