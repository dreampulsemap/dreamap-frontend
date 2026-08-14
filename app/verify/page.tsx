"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VerifyPage() {
  const [msg, setMsg] = useState("Confirming your email…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const token = p.get("token");
    const type = (p.get("type") as any) || "signup";
    const redirectTo = p.get("redirect_to") || "/profile";

    if (!token) { setMsg("Link is missing a token."); return; }

    supabase.auth.verifyOtp({ token_hash: token, type }).then(({ error }) => {
      if (error) {
        setMsg("Link invalid or expired. Please try again.");
      } else {
        setOk(true);
        setMsg("Welcome to Lunosfer 🌙 Email confirmed.");
        setTimeout(() => window.location.replace(redirectTo), 2000);
      }
    });
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center",
      background: "#1E2A5A", color: "#F5F1E6", textAlign: "center", padding: 24 }}>
      <div>
        <div style={{ fontSize: 44 }}>🌙</div>
        <p style={{ fontSize: 18, marginTop: 12 }}>{msg}</p>
        {ok && <p style={{ opacity: .7 }}>Redirecting…</p>}
      </div>
    </main>
  );
}
