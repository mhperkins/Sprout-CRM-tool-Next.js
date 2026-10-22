"use client";

// The public coming-soon page. Built to the Mission design Max signed off
// (docs/wireframes/2026-10-13_coming-soon-options.html, Summary A, Middle layout).
// Styles are scoped under .cs so nothing leaks into the CRM's own CSS.

import { useState } from "react";

const BRAND = "https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand";
const LOGO_DARK = `${BRAND}/sprout-logo-blackheart.png`;
const LOGO_WHITE = `${BRAND}/sprout-logo-white.png`;
const FLOWER = "/brand/sprout-flower-icon.svg";

const DONATE_URL = "https://givebutter.com/sproutspacedonors";
const DISCORD_URL = "https://discord.gg/SUuDdrSAv";

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap");
.cs{--ink:#030000;--paper:#F7F7F6;--acid:#C6C902;--banana:#FAD100;--fuchsia:#E10098;--cyan:#73C4D6;
  min-height:100vh;background:var(--paper);color:var(--ink);font-family:"Lato","Helvetica Neue",Arial,sans-serif;
  color-scheme:light;display:flex;flex-direction:column}
.cs *{box-sizing:border-box}
.cs a{color:inherit}
.cs-in{width:100%;max-width:1080px;margin:0 auto}
.cs-head{background:#fff;border-bottom:4px solid var(--acid)}
.cs-head .cs-in{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:20px 28px}
.cs-head img{width:150px;height:auto;display:block}
.cs-pill{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;background:var(--ink);color:#fff;border-radius:999px;padding:6px 12px;white-space:nowrap}
.cs-main{flex:1}
.cs-hero{padding:56px 28px 44px;max-width:760px}
.cs-eyebrow{font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--fuchsia);margin:0 0 14px}
.cs-hero h1{font-size:clamp(34px,6vw,56px);line-height:1.04;font-weight:900;margin:0;letter-spacing:-.01em;text-wrap:balance}
.cs-lede{font-size:clamp(17px,2.2vw,20px);line-height:1.55;margin:20px 0 0;color:#2b2b29;max-width:58ch}
.cs-soon{margin:22px 0 0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:10px}
.cs-soon i{width:10px;height:10px;border-radius:50%;background:var(--acid);box-shadow:0 0 0 4px rgba(198,201,2,.25);display:inline-block;flex:0 0 auto}
.cs-signup{padding:0 28px 48px;max-width:760px}
.cs-signup .cs-sl{margin:0 0 8px;font-size:13px;font-weight:700}
.cs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.cs-signup form{display:flex;flex-wrap:wrap;gap:8px}
.cs-signup input{flex:1 1 180px;min-width:0;font:inherit;font-size:16px;padding:13px 14px;border:2px solid var(--ink);border-radius:8px;background:#fff;color:var(--ink);color-scheme:light}
.cs-signup input:focus{outline:3px solid var(--cyan);outline-offset:1px}
.cs-signup button{font:inherit;font-weight:900;font-size:15px;background:var(--fuchsia);color:#fff;border:0;border-radius:8px;padding:13px 22px;cursor:pointer}
.cs-signup button:disabled{opacity:.6;cursor:default}
.cs-signup button:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
.cs-msg{font-size:14px;margin:10px 0 0;min-height:1.3em;color:#5f5f5b}
.cs-msg.ok{color:var(--ink);font-weight:700}
.cs-msg.err{color:#b0006f;font-weight:700}
.cs-memory{margin:0 28px 48px;background:#fff;border-radius:10px;padding:24px;display:flex;gap:20px;align-items:center;border-left:6px solid var(--fuchsia)}
.cs-memory img{width:76px;height:76px;flex:0 0 auto}
.cs-mem{display:flex;flex-direction:column;gap:8px;min-width:0}
.cs-k{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
.cs-mem .cs-k{color:var(--fuchsia)}
.cs-mem h2{margin:0;font-size:24px;font-weight:900;line-height:1.15}
.cs-mem p{margin:0;font-size:16px;line-height:1.55}
.cs-btn{align-self:flex-start;margin-top:6px;font-weight:900;font-size:14px;text-decoration:none;border-radius:6px;padding:10px 16px;background:var(--ink);color:#fff!important}
.cs-mem .cs-btn{background:var(--fuchsia)}
.cs-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:0 28px 48px}
.cs-card{border-radius:10px;padding:22px 20px;display:flex;flex-direction:column;gap:8px;min-width:0}
.cs-card h2{margin:0;font-size:21px;font-weight:900;line-height:1.15}
.cs-card p{margin:0;font-size:15px;line-height:1.5;flex:1}
.cs-c1{background:var(--cyan)} .cs-c2{background:var(--banana)}
.cs-foot{background:var(--ink);color:#d8d8d4}
.cs-foot .cs-in{padding:26px 28px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;font-size:13px;line-height:1.7}
.cs-foot b{color:#fff}
.cs-foot a{color:var(--cyan)}
.cs-foot img{width:110px;height:auto;display:block}
@media (max-width:760px){
  .cs-cards{grid-template-columns:1fr}
  .cs-head .cs-in,.cs-hero,.cs-signup,.cs-cards,.cs-foot .cs-in{padding-left:18px;padding-right:18px}
  .cs-memory{margin-left:18px;margin-right:18px;flex-direction:column;align-items:flex-start}
  .cs-hero{padding-top:36px}
  .cs-head img{width:120px}
}
`;

export default function ComingSoon() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ kind: "idle", text: "" });

  async function submit(e) {
    e.preventDefault();
    if (state.kind === "sending") return;
    setState({ kind: "sending", text: "Adding you…" });
    try {
      const res = await fetch("/api/coming-soon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Something went wrong. Please try again.");
      setState({
        kind: "ok",
        text: out.already
          ? "You're already on the list. We'll send a note when the site launches."
          : "Thanks! You're on the list. We'll send a note when the site launches.",
      });
      setName("");
      setEmail("");
    } catch (err) {
      setState({ kind: "err", text: err.message });
    }
  }

  return (
    <div className="cs">
      <style>{CSS}</style>

      <header className="cs-head">
        <div className="cs-in">
          <img src={LOGO_DARK} alt="Sprout Society" />
          <span className="cs-pill">New site coming soon</span>
        </div>
      </header>

      <main className="cs-main cs-in">
        <section className="cs-hero">
          <p className="cs-eyebrow">Sprout Society · Bushwick, Brooklyn</p>
          <h1>Strengthening the social connections that support mental health.</h1>
          <p className="cs-lede">
            We create welcoming places to gather, connect people through shared interests and experiences,
            and invest in the community builders who bring people together.
          </p>
          <p className="cs-soon"><i aria-hidden="true"></i>Our new website is on the way.</p>
        </section>

        <section className="cs-signup" aria-labelledby="cs-sl">
          <p className="cs-sl" id="cs-sl">Get a note when it launches</p>
          <form onSubmit={submit}>
            <label className="cs-sr" htmlFor="cs-name">Name</label>
            <input id="cs-name" type="text" placeholder="Your name" autoComplete="name" required
              value={name} onChange={(e) => setName(e.target.value)} />
            <label className="cs-sr" htmlFor="cs-email">Email</label>
            <input id="cs-email" type="email" placeholder="you@example.com" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" disabled={state.kind === "sending"}>
              {state.kind === "sending" ? "Adding…" : "Keep me posted"}
            </button>
          </form>
          <p className={`cs-msg ${state.kind === "ok" ? "ok" : state.kind === "err" ? "err" : ""}`} aria-live="polite">
            {state.text}
          </p>
        </section>

        <section className="cs-memory">
          <img src={FLOWER} alt="" />
          <div className="cs-mem">
            <span className="cs-k">Funders and friends</span>
            <h2>Russell's birthday fundraising: Launching 11/1/2026</h2>
            <p>
              Russell, known to friends as "Sprout," was a Brooklyn musician, artist, and filmmaker with a gift
              for making everyone feel they belonged. Sprout Society carries his vision forward.
            </p>
            <p>
              Our fundraiser for his birthday launches November 1. Your gift will let us start the Sprout Fund:
              investing in creators and community builders who embody the spirit and mission of Sprout Society.
            </p>
            <a className="cs-btn" href={DONATE_URL} target="_blank" rel="noopener noreferrer">Donate</a>
          </div>
        </section>

        <section className="cs-cards">
          <div className="cs-card cs-c1">
            <span className="cs-k">People looking for connection</span>
            <h2>Join the Sprout Community</h2>
            <p>Introduce yourself and find your community.</p>
            <a className="cs-btn" href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Join our Discord</a>
          </div>
          <div className="cs-card cs-c2">
            <span className="cs-k">Community builders</span>
            <h2>Host with Sprout</h2>
            <p>Bring your group, gathering, or program to our Bushwick space.</p>
            <a className="cs-btn" href="/book">Host at Sprout</a>
          </div>
        </section>
      </main>

      <footer className="cs-foot">
        <div className="cs-in">
          <div>
            <b>Sprout Society</b><br />
            26 Scott Ave, Brooklyn, NY 11237<br />
            Open Mon to Fri, 10am to 5pm ·{" "}
            <a href="https://instagram.com/sproutsocietyorg" target="_blank" rel="noopener noreferrer">@sproutsocietyorg</a><br />
            A 501(c)(3) nonprofit · EIN 83-1298420
          </div>
          <img src={LOGO_WHITE} alt="Sprout Society" />
        </div>
      </footer>
    </div>
  );
}
