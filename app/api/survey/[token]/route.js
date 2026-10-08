// /api/survey/[token] — one person's impact survey.
//
//   GET   the questions, their name, the nights it covers, and anything they already answered
//   POST  save their answers (the first save marks the invite replied; later saves edit it)
//
// The token belongs to one person, so there is no separate edit key: reopening the link
// on any device shows and changes their own answers.

import { hasServiceKey } from "@/lib/portalDb";
import { inviteByToken, surveyById, inviteEvents, saveInviteAnswers } from "@/lib/surveyDb";
import { sanitizeAnswers, answerProblems } from "@/lib/surveyForm";
import { notifySurveyReply } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error, status = 400) => Response.json({ error }, { status });

async function load(params) {
  if (!hasServiceKey()) return { res: fail("This survey is not set up yet.", 503) };
  const { token } = await params;
  try {
    const invite = await inviteByToken(token);
    if (!invite) return { res: fail("This link is not valid. Check with us for a fresh one.", 404) };
    const survey = await surveyById(invite.survey_id);
    if (!survey) return { res: fail("This survey could not be found.", 404) };
    const events = await inviteEvents(invite.event_ids || []);
    return { invite, survey, events };
  } catch {
    return { res: fail("The survey is temporarily unavailable. Please try again in a few minutes.", 503) };
  }
}

export async function GET(_req, { params }) {
  const { invite, survey, events, res } = await load(params);
  if (res) return res;
  return Response.json({
    survey: { audience: survey.audience, title: survey.title, intro: survey.intro, thanks: survey.thanks, questions: survey.questions },
    name: invite.name || "",
    events,
    answers: invite.answers || {},
    replied: Boolean(invite.replied_at),
  });
}

export async function POST(req, { params }) {
  const { invite, survey, events, res } = await load(params);
  if (res) return res;
  let body;
  try { body = await req.json(); } catch { return fail("Invalid request."); }

  const answers = sanitizeAnswers(body?.answers, survey.questions, events.map((e) => e.id));
  const problems = answerProblems(answers, survey.questions);
  if (problems.length) return fail(problems[0]);

  const firstReply = !invite.replied_at;
  const { error } = await saveInviteAnswers(invite.id, { answers, questions: survey.questions, firstReply });
  if (error) {
    console.error("survey POST — save failed:", error);
    return fail("We could not save that. Please try again.", 500);
  }

  // Awaited because serverless stops once the response is sent, but caught: a failed
  // alert must never fail someone's reply.
  try {
    await notifySurveyReply({ invite, survey, events, answers, origin: new URL(req.url).origin, updated: !firstReply });
  } catch (e) {
    console.error("survey — notification email failed:", e?.message || e);
  }
  return Response.json({ ok: true });
}
