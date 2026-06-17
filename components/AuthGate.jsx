"use client";

/**
 * AuthGate.jsx — login wall for the Sprout CRM.
 *
 * The CRM is no longer public: every screen now requires a Supabase Auth session.
 * Accounts are INVITE-ONLY (created from the Supabase dashboard → Authentication →
 * Add user → Send invite). There is no public sign-up here on purpose.
 *
 * Three screens:
 *   • login   — email + password (signInWithPassword)
 *   • setpw   — shown when the user arrives from an invite / reset email link
 *               (the URL carries a one-time token that supabase-js exchanges for a
 *               session automatically; we then force them to choose a password)
 *   • (authed) — renders the app (children) once a session exists
 *
 * Styling is self-contained inline CSS because CRMManager's <style> block is only
 * present once the app itself mounts — this screen renders before that.
 */

import { useState, useEffect } from "react";
import { getSupabase } from "../lib/supabase";

const C = {
  black: "#030000", white: "#F7F7F6", cyan: "#73C4D6", fuchsia: "#E10098",
  acid: "#C6C902", g200: "#E5E7EB", g400: "#9CA3AF", g600: "#4B5563",
};

const font = "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const wrap = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: C.white, fontFamily: font, padding: 20,
};
const card = {
  width: "100%", maxWidth: 380, background: "#fff", borderRadius: 14,
  border: `1.5px solid ${C.g200}`, boxShadow: "0 12px 40px rgba(0,0,0,0.13)",
  padding: "32px 30px",
};
const labelS = {
  display: "block", fontSize: 9, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.1em", color: C.g600, marginBottom: 5,
};
// Dark inputs with white text (kept consistent even under browser autofill — see the
// .ag-input rules injected below).
const inputS = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #3f3f3f",
  borderRadius: 7, fontSize: 14, fontFamily: font,
  outline: "none", marginBottom: 14,
};
const btnS = {
  width: "100%", padding: "11px 14px", borderRadius: 8, border: "none",
  background: C.black, color: C.white, fontSize: 14, fontWeight: 700,
  fontFamily: font, cursor: "pointer", letterSpacing: "0.02em",
};
const linkBtn = {
  background: "none", border: "none", color: C.g600, fontSize: 12,
  fontFamily: font, cursor: "pointer", textDecoration: "underline", padding: 0,
};

export default function AuthGate({ children }) {
  const sb = getSupabase();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  // "login" | "setpw" — setpw is forced when arriving from an invite/recovery link.
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    // Invite + password-reset emails land here with a token in the URL hash.
    // supabase-js (detectSessionInUrl) exchanges it for a session on load; we
    // detect the flow type so we can force a password choice.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=invite") || hash.includes("type=recovery")) setScreen("setpw");

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) => setSession(sess || null));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  async function doLogin(e) {
    e.preventDefault();
    setBusy(true); setMsg(""); setOk("");
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg(error.message || "Sign in failed.");
  }

  async function doSetPassword(e) {
    e.preventDefault();
    if (password.length < 8) { setMsg("Use at least 8 characters."); return; }
    setBusy(true); setMsg(""); setOk("");
    const { error } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMsg(error.message || "Could not set password. The invite link may have expired — ask for a new one."); return; }
    // Clean the token out of the URL and drop into the app.
    if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
    setScreen("login");
    setOk("");
    setPassword("");
  }

  async function doForgot() {
    if (!email.trim()) { setMsg("Enter your email first, then click again."); return; }
    setBusy(true); setMsg(""); setOk("");
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setBusy(false);
    if (error) setMsg(error.message || "Could not send reset email.");
    else setOk("Check your email for a password reset link.");
  }

  async function logout() {
    await sb.auth.signOut();
  }

  if (!ready) {
    return (
      <div style={wrap}>
        <div style={{ color: C.g400, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Loading…
        </div>
      </div>
    );
  }

  // Authenticated and not mid-invite → show the app.
  if (session && screen !== "setpw") return children;

  const isSetPw = screen === "setpw";

  return (
    <div style={wrap}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" />
      <style>{`
        .ag-input { background:#2b2b2b; color:#fff; caret-color:#fff; }
        .ag-input::placeholder { color:#8a8a8a; }
        .ag-input:-webkit-autofill,
        .ag-input:-webkit-autofill:hover,
        .ag-input:-webkit-autofill:focus {
          -webkit-text-fill-color:#fff;
          caret-color:#fff;
          -webkit-box-shadow:0 0 0 1000px #2b2b2b inset;
          transition: background-color 9999s ease-in-out 0s;
        }
        .ag-input:focus { border-color:#73C4D6; }
      `}</style>
      <div style={card}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: C.black }}>
            Sprout Society
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.cyan, marginTop: 3 }}>
            CRM Manager
          </div>
        </div>

        {isSetPw ? (
          <form onSubmit={doSetPassword}>
            <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6, color: C.black }}>Choose a password</div>
            <div style={{ fontSize: 12, color: C.g600, marginBottom: 18, lineHeight: 1.5 }}>
              Set a password for your account, then you'll be signed in.
            </div>
            <label style={labelS}>New password</label>
            <input className="ag-input" style={inputS} type="password" value={password} autoFocus
              onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            <button style={{ ...btnS, opacity: busy ? 0.6 : 1 }} disabled={busy} type="submit">
              {busy ? "Saving…" : "Set password & continue"}
            </button>
          </form>
        ) : (
          <form onSubmit={doLogin}>
            <label style={labelS}>Email</label>
            <input className="ag-input" style={inputS} type="email" value={email} autoFocus autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} placeholder="you@sproutsociety.org" />
            <label style={labelS}>Password</label>
            <input className="ag-input" style={inputS} type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
            <button style={{ ...btnS, opacity: busy ? 0.6 : 1 }} disabled={busy} type="submit">
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button type="button" style={linkBtn} onClick={doForgot} disabled={busy}>Forgot password?</button>
            </div>
          </form>
        )}

        {msg && <div style={{ marginTop: 14, fontSize: 12, color: C.fuchsia, fontWeight: 700 }}>{msg}</div>}
        {ok && <div style={{ marginTop: 14, fontSize: 12, color: "#157f3b", fontWeight: 700 }}>{ok}</div>}

        {session && isSetPw && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button type="button" style={linkBtn} onClick={logout}>Cancel / sign out</button>
          </div>
        )}

        <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.g200}`, fontSize: 10.5, color: C.g400, lineHeight: 1.6 }}>
          Access is invite-only. Need an account? Ask an admin to invite you.
        </div>
      </div>
    </div>
  );
}
