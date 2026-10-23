"use client";

// Call for submissions (/submit). The QR on the Sprout N Tell TV slide lands here.
// Artists and musicians leave a name + email; we send them the submission form later.
// Styles are scoped under .sb and follow the coming-soon page's look.

import { useState } from "react";

const BRAND = "https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand";
const LOGO_DARK = `${BRAND}/sprout-logo-blackheart.png`;

const ROLES = [
  { id: "music", label: "Music" },
  { id: "art", label: "Art" },
  { id: "other", label: "Something else" },
];

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap");
.sb{--ink:#030000;--paper:#F7F7F6;--acid:#C6C902;--banana:#FAD100;--fuchsia:#E10098;--cyan:#73C4D6;
  min-height:100vh;background:var(--paper);color:var(--ink);font-family:"Lato","Helvetica Neue",Arial,sans-serif;color-scheme:light}
.sb *{box-sizing:border-box}
.sb-head{background:#fff;border-bottom:4px solid var(--banana)}
.sb-head div{max-width:640px;margin:0 auto;padding:18px 20px}
.sb-head img{width:130px;height:auto;display:block}
.sb-main{max-width:640px;margin:0 auto;padding:36px 20px 56px}
.sb-eyebrow{font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--fuchsia);margin:0 0 12px}
.sb h1{font-size:clamp(30px,7vw,46px);line-height:1.05;font-weight:900;margin:0;letter-spacing:-.01em;text-wrap:balance}
.sb-lede{font-size:17px;line-height:1.55;margin:16px 0 28px;color:#2b2b29}
.sb form{display:flex;flex-direction:column;gap:16px;background:#fff;border-radius:10px;padding:22px;border-left:6px solid var(--banana)}
.sb label{display:block;font-size:13px;font-weight:900;margin:0 0 6px}
.sb label span{font-weight:400;color:#6b6b67}
.sb input{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:2px solid var(--ink);border-radius:8px;background:#fff;color:var(--ink);color-scheme:light}
.sb input:focus{outline:3px solid var(--cyan);outline-offset:1px}
.sb-chips{display:flex;flex-wrap:wrap;gap:8px}
.sb-chip{font:inherit;font-weight:900;font-size:15px;border:2px solid var(--ink);border-radius:999px;padding:9px 16px;background:#fff;color:var(--ink);cursor:pointer}
.sb-chip[aria-pressed="true"]{background:var(--ink);color:#fff}
.sb-chip:focus-visible,.sb-go:focus-visible{outline:3px solid var(--cyan);outline-offset:2px}
.sb-go{font:inherit;font-weight:900;font-size:16px;background:var(--fuchsia);color:#fff;border:0;border-radius:8px;padding:14px 22px;cursor:pointer;align-self:flex-start}
.sb-go:disabled{opacity:.6;cursor:default}
.sb-msg{font-size:15px;margin:0;min-height:1.3em;color:#5f5f5b}
.sb-msg.err{color:#b0006f;font-weight:700}
.sb-done{background:#fff;border-radius:10px;padding:26px 22px;border-left:6px solid var(--acid)}
.sb-done h2{margin:0 0 8px;font-size:24px;font-weight:900}
.sb-done p{margin:0;font-size:16px;line-height:1.55}
.sb-foot{font-size:13px;color:#6b6b67;margin-top:22px;line-height:1.6}
.sb-foot a{color:var(--ink)}
`;

export default function SubmitList() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [instagram, setInstagram] = useState("");
  const [state, setState] = useState({ kind: "idle", text: "" });

  async function submit(e) {
    e.preventDefault();
    if (state.kind === "sending") return;
    if (!role) { setState({ kind: "err", text: "Please pick music, art, or something else." }); return; }
    setState({ kind: "sending", text: "Adding you…" });
    try {
      const res = await fetch("/api/submit-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, instagram }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Something went wrong. Please try again.");
      setState({ kind: "done", already: !!out.already });
    } catch (err) {
      setState({ kind: "err", text: err.message });
    }
  }

  return (
    <div className="sb">
      <style>{CSS}</style>
      <header className="sb-head"><div><img src={LOGO_DARK} alt="Sprout Society" /></div></header>

      <main className="sb-main">
        <p className="sb-eyebrow">Sprout N Tell · Call for submissions</p>
        <h1>Show your work at Sprout N Tell.</h1>
        <p className="sb-lede">
          Artists and musicians: leave your email and we'll send you the submission form for an upcoming show.
        </p>

        {state.kind === "done" ? (
          <div className="sb-done" aria-live="polite">
            <h2>{state.already ? "You're already on the list." : "You're on the list!"}</h2>
            <p>Watch your inbox: we'll email you the submission form soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div>
              <label htmlFor="sb-name">Name</label>
              <input id="sb-name" type="text" autoComplete="name" required
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="sb-email">Email</label>
              <input id="sb-email" type="email" autoComplete="email" inputMode="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div role="group" aria-labelledby="sb-role-l">
              <label id="sb-role-l">What do you make?</label>
              <div className="sb-chips">
                {ROLES.map((r) => (
                  <button key={r.id} type="button" className="sb-chip" aria-pressed={role === r.id}
                    onClick={() => setRole(r.id)}>{r.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="sb-ig">Instagram <span>(optional)</span></label>
              <input id="sb-ig" type="text" placeholder="@yourhandle" autoComplete="off"
                value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
            <button className="sb-go" type="submit" disabled={state.kind === "sending"}>
              {state.kind === "sending" ? "Adding…" : "Send me the form"}
            </button>
            <p className={`sb-msg ${state.kind === "err" ? "err" : ""}`} aria-live="polite">
              {state.kind === "err" || state.kind === "sending" ? state.text : ""}
            </p>
          </form>
        )}

        <p className="sb-foot">
          Sprout Society · 26 Scott Ave, Brooklyn ·{" "}
          <a href="https://instagram.com/sproutsocietyorg" target="_blank" rel="noopener noreferrer">@sproutsocietyorg</a>
        </p>
      </main>
    </div>
  );
}
