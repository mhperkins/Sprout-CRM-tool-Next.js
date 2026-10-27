"use client";

// Get involved (/get-involved). A general interest form for anyone who wants more
// info, more events, or a way into the community. Styles are scoped under .gi and
// follow the /submit page's look.

import { useState } from "react";
import { INTERESTS, HEARD_OPTIONS, LIMITS } from "@/lib/interestForm";

const BRAND = "https://ixdnmjchvjzytyhmripc.supabase.co/storage/v1/object/public/newsletter-images/brand";
const LOGO_DARK = `${BRAND}/sprout-logo-blackheart.png`;
const DISCORD_URL = "https://discord.gg/SUuDdrSAv";
const IG_URL = "https://instagram.com/sproutsocietyorg";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap");
.gi{--ink:#030000;--paper:#F7F7F6;--acid:#C6C902;--banana:#FAD100;--fuchsia:#E10098;--cyan:#73C4D6;
  min-height:100vh;background:var(--paper);color:var(--ink);font-family:"Lato","Helvetica Neue",Arial,sans-serif;color-scheme:light}
.gi *{box-sizing:border-box}
.gi-head{background:#fff;border-bottom:4px solid var(--cyan)}
.gi-head div{max-width:640px;margin:0 auto;padding:18px 20px}
.gi-head img{width:130px;height:auto;display:block}
.gi-main{max-width:640px;margin:0 auto;padding:36px 20px 56px}
.gi-eyebrow{font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--fuchsia);margin:0 0 12px}
.gi h1{font-size:clamp(30px,7vw,46px);line-height:1.05;font-weight:900;margin:0;letter-spacing:-.01em;text-wrap:balance}
.gi-lede{font-size:17px;line-height:1.55;margin:16px 0 28px;color:#2b2b29}
.gi form{display:flex;flex-direction:column;gap:18px;background:#fff;border-radius:10px;padding:22px;border-left:6px solid var(--cyan)}
.gi label,.gi .gi-l{display:block;font-size:13px;font-weight:900;margin:0 0 6px}
.gi label span,.gi .gi-l span{font-weight:400;color:#6b6b67}
.gi input,.gi textarea,.gi select{width:100%;font:inherit;font-size:16px;padding:12px 14px;border:2px solid var(--ink);border-radius:8px;background:#fff;color:var(--ink);color-scheme:light}
.gi textarea{min-height:110px;resize:vertical;line-height:1.5}
.gi input:focus,.gi textarea:focus,.gi select:focus{outline:3px solid var(--cyan);outline-offset:1px}
.gi .bad{border-color:#b0006f}
.gi-err{font-size:13px;color:#b0006f;font-weight:700;margin:6px 0 0}
.gi-count{font-size:12px;color:#6b6b67;text-align:right;margin:4px 0 0}
.gi-chips{display:flex;flex-wrap:wrap;gap:8px}
.gi-chip{font:inherit;font-weight:900;font-size:15px;border:2px solid var(--ink);border-radius:999px;padding:9px 16px;background:#fff;color:var(--ink);cursor:pointer}
.gi-chip[aria-pressed="true"]{background:var(--ink);color:#fff}
.gi-chip:focus-visible,.gi-go:focus-visible,.gi-next a:focus-visible{outline:3px solid var(--cyan);outline-offset:2px}
.gi-go{font:inherit;font-weight:900;font-size:16px;background:var(--fuchsia);color:#fff;border:0;border-radius:8px;padding:14px 26px;cursor:pointer;align-self:flex-start}
.gi-go:disabled{opacity:.6;cursor:default}
.gi-msg{font-size:15px;margin:0;min-height:1.3em;color:#5f5f5b}
.gi-msg.err{color:#b0006f;font-weight:700}
.gi-small{font-size:13px;color:#6b6b67;margin:0}
.gi-small a{color:var(--ink)}
.gi-done{background:#fff;border-radius:10px;padding:26px 22px;border-left:6px solid var(--acid);display:flex;flex-direction:column;gap:14px}
.gi-done h2{margin:0;font-size:26px;font-weight:900}
.gi-done p{margin:0;font-size:16px;line-height:1.55}
.gi-next{border:2px solid var(--ink);border-radius:8px;padding:14px 16px;display:flex;flex-direction:column;gap:4px}
.gi-next b{font-size:16px}
.gi-next span{font-size:14px;color:#5f5f5b}
.gi-next a{align-self:flex-start;margin-top:8px;font-weight:900;font-size:15px;color:var(--ink);text-decoration:none;border-bottom:3px solid var(--fuchsia);padding-bottom:1px}
.gi-foot{font-size:13px;color:#6b6b67;margin-top:22px;line-height:1.6}
.gi-foot a{color:var(--ink)}
@media (max-width:480px){.gi-go{align-self:stretch}}
`;

export default function GetInvolvedForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState([]);
  const [message, setMessage] = useState("");
  const [instagram, setInstagram] = useState("");
  const [howHeard, setHowHeard] = useState("");
  const [problems, setProblems] = useState({});
  const [state, setState] = useState({ kind: "idle", text: "" });

  const toggle = (id) => setInterests((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submit(e) {
    e.preventDefault();
    if (state.kind === "sending") return;
    const local = {};
    if (!name.trim()) local.name = "Add your name so we know who to reply to.";
    if (!EMAIL_RE.test(email.trim())) local.email = "Add an email we can reach you at.";
    if (!interests.length) local.interests = "Pick at least one.";
    setProblems(local);
    if (Object.keys(local).length) { setState({ kind: "err", text: "Please fix the highlighted fields." }); return; }

    setState({ kind: "sending", text: "Sending…" });
    try {
      const res = await fetch("/api/get-involved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, interests, message, instagram, how_heard: howHeard }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (out.problems) setProblems(out.problems);
        throw new Error(out.error || "Something went wrong. Please try again.");
      }
      setState({ kind: "done" });
      window.scrollTo?.(0, 0);
    } catch (err) {
      setState({ kind: "err", text: err.message });
    }
  }

  const first = name.trim().split(/\s+/)[0];

  return (
    <div className="gi">
      <style>{CSS}</style>
      <header className="gi-head"><div><img src={LOGO_DARK} alt="Sprout Society" /></div></header>

      <main className="gi-main">
        <p className="gi-eyebrow">Sprout Society · Bushwick</p>
        <h1>Get involved with Sprout.</h1>
        <p className="gi-lede">Tell us what you're curious about and we'll follow up.</p>

        {state.kind === "done" ? (
          <div className="gi-done" aria-live="polite">
            <h2>Thanks{first ? `, ${first}` : ""}. We got it.</h2>
            <p>Someone from Sprout will follow up by email. While you wait:</p>
            {interests.includes("hosting") && (
              <div className="gi-next"><b>Hosting an event?</b><span>Send the details so we can check dates.</span><a href="/book">Request a date →</a></div>
            )}
            {interests.includes("showcase") && (
              <div className="gi-next"><b>Want to showcase?</b><span>Get on the list for the next call for submissions.</span><a href="/submit">Submit your work →</a></div>
            )}
            <div className="gi-next"><b>Hear about the next one first</b><span>Join The Stoop, our Discord.</span><a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">Join the Discord →</a></div>
            <p className="gi-small">Follow <a href={IG_URL} target="_blank" rel="noopener noreferrer">@sproutsocietyorg</a> for photos and news.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div>
              <label htmlFor="gi-name">Name</label>
              <input id="gi-name" type="text" autoComplete="name" maxLength={LIMITS.name} className={problems.name ? "bad" : ""}
                value={name} onChange={(e) => setName(e.target.value)} />
              {problems.name && <p className="gi-err">{problems.name}</p>}
            </div>
            <div>
              <label htmlFor="gi-email">Email</label>
              <input id="gi-email" type="email" autoComplete="email" inputMode="email" maxLength={LIMITS.email} className={problems.email ? "bad" : ""}
                value={email} onChange={(e) => setEmail(e.target.value)} />
              {problems.email && <p className="gi-err">{problems.email}</p>}
            </div>
            <div role="group" aria-labelledby="gi-int-l">
              <div className="gi-l" id="gi-int-l">I'm interested in <span>(pick any)</span></div>
              <div className="gi-chips">
                {INTERESTS.map((i) => (
                  <button key={i.id} type="button" className="gi-chip" aria-pressed={interests.includes(i.id)}
                    onClick={() => toggle(i.id)}>{i.label}</button>
                ))}
              </div>
              {problems.interests && <p className="gi-err">{problems.interests}</p>}
            </div>
            <div>
              <label htmlFor="gi-msg">Anything you want us to know? <span>(optional)</span></label>
              <textarea id="gi-msg" maxLength={LIMITS.message} placeholder="Questions, ideas, what you'd like to see…"
                value={message} onChange={(e) => setMessage(e.target.value)} />
              {message.length > LIMITS.message * 0.8 && <p className="gi-count">{message.length} / {LIMITS.message}</p>}
            </div>
            <div>
              <label htmlFor="gi-ig">Instagram <span>(optional)</span></label>
              <input id="gi-ig" type="text" placeholder="@yourhandle" autoComplete="off" maxLength={LIMITS.instagram}
                value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
            <div>
              <label htmlFor="gi-heard">How did you hear about us? <span>(optional)</span></label>
              <select id="gi-heard" value={howHeard} onChange={(e) => setHowHeard(e.target.value)}>
                <option value="">Select one…</option>
                {HEARD_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <button className="gi-go" type="submit" disabled={state.kind === "sending"}>
              {state.kind === "sending" ? "Sending…" : "Send"}
            </button>
            <p className={`gi-msg ${state.kind === "err" ? "err" : ""}`} aria-live="polite">
              {state.kind === "err" || state.kind === "sending" ? state.text : ""}
            </p>
            <p className="gi-small">We only use this to follow up with you.</p>
          </form>
        )}

        <p className="gi-foot">
          Sprout Society · 26 Scott Ave, Brooklyn ·{" "}
          <a href={IG_URL} target="_blank" rel="noopener noreferrer">@sproutsocietyorg</a>
        </p>
      </main>
    </div>
  );
}
