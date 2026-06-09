import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Business-coach system prompt (stable → cached) ─────────────────────────
const SYSTEM_PROMPT = `You are a sharp, experienced business coach embedded in a 90-day
goal-setting wizard for entrepreneurs in a hospitality / short-term-rental mastermind
called Builder's Assembly. You guide a member through a funnel:
brainstorm ideas → cluster them into candidate "bets" → pick one → make it a measurable
90-day goal → commit to week-one tactics.

You ALWAYS reason over the member's ACTUAL dumped ideas and chosen bet — never give generic
advice that ignores what they wrote. When you summarize, summarize THEIR ideas. When you
group, group THEIR ideas. When you suggest a metric, tie it to THEIR bet.

Your style: concrete, practical, founder-to-founder. No fluff, no corporate jargon, no hedging.
Favor specific, testable suggestions. Assume the member is time-poor and running a real business.

You respond with ONLY the JSON object requested for the given step — no prose around it.`;

// ── Per-step output schemas (structured outputs guarantee valid JSON) ──────
type Step = "brainstorm" | "summarize" | "bet" | "measurable" | "tactics";

const SCHEMAS: Record<Step, Record<string, unknown>> = {
  // Expand the dump with fresh ideas.
  brainstorm: {
    type: "object",
    additionalProperties: false,
    properties: {
      ideas: {
        type: "array",
        items: { type: "string" },
        description: "4-5 distinct, concrete things the member could build, test, or launch.",
      },
    },
    required: ["ideas"],
  },
  // Read the dump, summarize the through-line, surface candidate directions.
  summarize: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description: "1-2 sentences naming the through-line in the member's dumped ideas.",
      },
      directions: {
        type: "array",
        items: { type: "string" },
        description: "2-4 strategic directions (potential bets) the ideas point toward.",
      },
    },
    required: ["summary", "directions"],
  },
  // Cluster the dumped ideas into 2-4 candidate 90-day bets.
  bet: {
    type: "object",
    additionalProperties: false,
    properties: {
      bets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", description: "Short name for this bet/theme." },
            groups: {
              type: "array",
              items: { type: "string" },
              description: "The member's idea texts that belong to this bet (verbatim).",
            },
            bet_sentence: {
              type: "string",
              description: "One sentence: what they'd build/test/launch if they pick this bet.",
            },
            why: { type: "string", description: "One line on why this bet is promising." },
          },
          required: ["title", "groups", "bet_sentence", "why"],
        },
        description: "2-4 candidate bets, each grouping related ideas from the dump.",
      },
      recommendation: {
        type: "string",
        description: "The title of the bet you'd recommend, with one line of reasoning.",
      },
    },
    required: ["bets", "recommendation"],
  },
  // Turn the chosen bet into a tracked number, with alternatives.
  measurable: {
    type: "object",
    additionalProperties: false,
    properties: {
      metric: { type: "string", description: "The single best number to track for this bet." },
      target_value: { type: "number", description: "A realistic 90-day target for that metric." },
      how_to_measure: { type: "string", description: "How to actually track it, in one line." },
      why: { type: "string", description: "A short 'why this matters' for the goal." },
      alternatives: {
        type: "array",
        items: { type: "string" },
        description: "1-2 other metrics they could track instead, each as 'Metric — why'.",
      },
    },
    required: ["metric", "target_value", "how_to_measure", "why", "alternatives"],
  },
  // First-week tactics toward the goal.
  tactics: {
    type: "object",
    additionalProperties: false,
    properties: {
      tactics: {
        type: "array",
        items: { type: "string" },
        description: "3 concrete tactics to commit to in week one toward the goal.",
      },
    },
    required: ["tactics"],
  },
};

// Build the per-step user instruction from caller-supplied context.
function userPrompt(step: Step, context: Record<string, unknown>): string {
  const ctx = JSON.stringify(context ?? {}, null, 2);
  switch (step) {
    case "brainstorm":
      return `STEP: Brainstorm — expand the dump. Based on the member's focus and what they've already listed, suggest 4-5 fresh, distinct ideas (don't repeat theirs).\nContext:\n${ctx}\nReturn { ideas }.`;
    case "summarize":
      return `STEP: Brainstorm — summarize. Read the member's dumped ideas. In 1-2 sentences, name the through-line / what they keep circling. Then list 2-4 strategic directions (potential bets) the ideas point toward.\nContext (their ideas):\n${ctx}\nReturn { summary, directions }.`;
    case "bet":
      return `STEP: Pick your bet. Cluster the member's brainstormed ideas into 2-4 candidate 90-day bets. Group related ideas under each bet (quote their idea text in "groups"). Give each a one-sentence bet and a why. Then name which you'd recommend.\nContext (their ideas):\n${ctx}\nReturn { bets, recommendation }.`;
    case "measurable":
      return `STEP: Make it measurable. Given the member's chosen bet and goal title, suggest the single best metric to track with a realistic 90-day target, how to measure it, and a short why. Add 1-2 alternative metrics.\nContext (their bet + goal):\n${ctx}\nReturn { metric, target_value, how_to_measure, why, alternatives }.`;
    case "tactics":
      return `STEP: Week one. Suggest 3 concrete tactics to commit to this week toward the goal.\nContext (their goal + metric):\n${ctx}\nReturn { tactics }.`;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { available: false, error: "Coach is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  let body: { step?: string; context?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ available: true, error: "Invalid JSON body." }, { status: 400 });
  }

  const step = body.step as Step;
  if (!step || !(step in SCHEMAS)) {
    return NextResponse.json(
      { available: true, error: "Invalid step." },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      output_config: {
        format: { type: "json_schema", schema: SCHEMAS[step] },
      },
      messages: [{ role: "user", content: userPrompt(step, body.context ?? {}) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ available: true, error: "Coach returned no content." }, { status: 502 });
    }

    const data = JSON.parse(textBlock.text);
    return NextResponse.json({ available: true, step, data });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError ? `${err.status}: ${err.message}` : String(err);
    return NextResponse.json({ available: true, error: message }, { status: 502 });
  }
}
