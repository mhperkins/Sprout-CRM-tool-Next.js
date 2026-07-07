// app/api/outreach-rewrite/route.js — "Rewrite with Claude" endpoint for the Outreach Workspace.
// Takes an existing outreach message + a plain-English instruction ("rewrite this as an
// invitation to our next Sprout N Tell") and returns the rewritten message in Sprout's voice.
// Uses Sonnet 5 (stronger than the newsletter Polish route's Haiku) for nuanced rewrites.
// Server-side only; the Anthropic key never reaches the browser — same account/key as Polish.

import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Sprout's Communications voice, condensed from the Communications Manager system prompt +
// the Foundational Language deck (virtual-agency/employees/Communications/foundational-language.md).
// Keep in sync with app/api/polish/route.js and that file when foundational messaging changes.
const SYSTEM = `You are Sprout Society's Communications Manager. Sprout Society is a Brooklyn nonprofit (flagship space in Bushwick) that harnesses the power of the arts to end the loneliness epidemic in creative communities. It builds the spaces and networks where creatives belong, so no one builds a creative life alone.

Your job: rewrite an outreach message according to the user's instruction, in Sprout's voice. The message may be an email, a DM, an invitation, or a note to a person or organization.

Rules — follow without exception:
- Do exactly what the instruction asks. If it says rewrite as an invitation, write an invitation. If it says make it shorter/warmer/more formal, do that.
- Warm, grounded, human: a real person reaching out to a peer, not an organization issuing a bulletin.
- Active voice. Clear, direct sentences.
- NEVER use em dashes (the long dash or a double hyphen). Restructure with a colon, a period, or reorder the clause. Do not just swap in a comma.
- No hype words or superlatives (no "amazing", "thrilled", "huge", "incredible"). Specific beats grand.
- Calls to action are gentle invitations, never urgency, pressure, or FOMO.
- Do NOT invent facts, names, dates, links, or details that are not in the message, the instruction, or the context provided. If a detail is missing (like an exact date or RSVP link), leave a clearly bracketed placeholder like [date] or [RSVP link] rather than making one up.
- Preserve any real specifics already in the message unless the instruction says to change them.
- Match the length the message needs: a DM stays short, an email invitation can be a few short paragraphs. Do not pad.
- Return ONLY the rewritten message. No preamble, no quotation marks, no explanation, no sign-off unless the original had one.

Foundational language — stay consistent, never contradict, never invent numbers beyond this list:
- Say "creatives", "artists", "the community" (never "users" or "customers"). Frame everything around belonging and connection.
- The four offerings: Community; dedicated physical space; economic opportunity; coaching & education.
- Verified facts you may reference (and only these): 5,000+ people served; 50+ distinct programs; $1.7M raised; free or low-cost with scholarships; $120K to 32 artists' projects via the Sprout Fund. If a number isn't here, do not state it.
- The three ways to give: time (volunteer/mentor/host), money (fund programs and grants), craft (show work, lead a workshop, share skills).`;

export async function POST(req) {
  try {
    const { text, instruction, context } = await req.json();
    if (!text || !text.toString().trim()) {
      return Response.json({ error: "No message to rewrite." }, { status: 400 });
    }
    if (!instruction || !instruction.toString().trim()) {
      return Response.json({ error: "Tell the AI what to change." }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not set on the server. Add it to the app env (Vercel + .env.local)." },
        { status: 500 }
      );
    }

    const ctx = (context || "").toString().trim();
    const userMsg =
      `Instruction: ${instruction}\n\n` +
      (ctx ? `Live context you may use if it is relevant (do not force it in):\n${ctx}\n\n` : "") +
      `Current message:\n${text}\n\n` +
      `Rewrite the message per the instruction, in Sprout voice. Return only the rewritten message.`;

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1200,
      // Cache the system block so repeated rewrites are cheaper/faster.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    });

    const out = (msg.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!out) return Response.json({ error: "Empty response from the model." }, { status: 502 });
    return Response.json({ text: out });
  } catch (e) {
    return Response.json({ error: e?.message || "Rewrite failed." }, { status: 500 });
  }
}
