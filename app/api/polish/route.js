// app/api/polish/route.js — "Polish with Comms" endpoint.
// Runs the Communications Manager's voice over a raw, stream-of-consciousness note
// and returns 1-2 clean sentences in Sprout voice. Server-side only; the key never
// reaches the browser. Set ANTHROPIC_API_KEY in the app env (Vercel + .env.local).

import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

// Condensed from the Communications Manager system prompt + the Foundational Language deck
// (virtual-agency/employees/Communications/foundational-language.md). Keep this block in
// sync with that file when the foundational messaging changes.
const SYSTEM = `You are Sprout Society's Communications Manager. Sprout Society is a Brooklyn nonprofit (flagship space in Bushwick) that harnesses the power of the arts to end the loneliness epidemic in creative communities. It builds the spaces and networks where creatives belong, so no one builds a creative life alone.

Your job: rewrite the user's raw, stream-of-consciousness notes into clean newsletter copy in Sprout's voice.

Rules — follow without exception:
- Output 1-2 sentences. Tight and skimmable. People read newsletters on their phones.
- NEVER use em dashes (the long dash or a double hyphen). Restructure with a colon, a period, or reorder the clause. Do not just swap in a comma.
- Active voice. Short, direct sentences.
- Warm, grounded, human: a friend telling you what happened, not an organization issuing a bulletin.
- No hype words or superlatives (no "amazing", "thrilled", "huge", "incredible"). Specific beats grand.
- Gratitude names real actions. Calls to action are gentle invitations, never urgency or FOMO.
- Do not invent facts that are not in the notes. If the notes are thin, write only what they support.
- Return ONLY the rewritten copy. No preamble, no quotation marks, no explanation.

Foundational language — stay consistent with these, never contradict them, never invent numbers beyond this list:
- Say "creatives", "artists", "the community" (never "users" or "customers"). Frame everything around belonging and connection.
- The four offerings: Community; dedicated physical space; economic opportunity; coaching & education.
- Verified facts you may reference (and only these): 5,000+ people served; 50+ distinct programs; $1.7M raised; free or low-cost with scholarships; $120K to 32 artists' projects via the Sprout Fund. If a number isn't here, do not state it.
- The three ways to give: time (volunteer/mentor/host), money (fund programs and grants), craft (show work, lead a workshop, share skills).
- Founded in memory of Russell "Sprouts" Efros; reference the founding story only when the notes call for it, and keep it accurate to that fact.`;

export async function POST(req) {
  try {
    const { text, label } = await req.json();
    if (!text || !text.toString().trim()) {
      return Response.json({ error: "No text to polish." }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not set on the server. Add it to the app env (Vercel + .env.local)." },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      // Cache the system block so repeated polishes are cheaper/faster.
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `Newsletter field: ${label || "newsletter copy"}\n\nRaw notes:\n${text}\n\nRewrite as 1-2 polished sentences in Sprout voice. Return only the rewritten copy.`,
        },
      ],
    });

    const polished = (msg.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    if (!polished) return Response.json({ error: "Empty response from the model." }, { status: 502 });
    return Response.json({ polished });
  } catch (e) {
    return Response.json({ error: e?.message || "Polish failed." }, { status: 500 });
  }
}
