// Vercel Serverless Function — /api/chat
// POST { tab, messages, mode?, focus?, mockCaseId?, mockBlock?, format? }
// Streams a reply from OpenAI (SSE) by default.
// When format === "json", returns a one-shot JSON response instead (used for
// the end-of-mock grade card).
// The API key lives only in env vars.

const OpenAI = require("openai");
const { summarizeForPrompt, lookupDetail, loadTab } = require("./_content.js");

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const TAB_PERSONA = {
  consulting: {
    label: "Darden Casebook (consulting / case interviews)",
    subject: "UVA Darden 2024-25 casebook: profitability, market entry, growth, M&A, operations, pricing, cost cutting, and non-profit cases. Plus formulas, accounting, industry vocab, and 8 named frameworks.",
  },
  politics: {
    label: "POL-UA 500 Exam #2",
    subject: "political science — voting & participation, ethnicity & identity, parties & systems. 30 terms, 10 essay prompts.",
  },
  oracle: {
    label: "Oracle 1Z0-1080-25 EPM Planning Cert",
    subject: "Oracle Planning 2025 Implementation Professional: dimensions, rules, modules, IPM, approvals.",
  },
  german: {
    label: "German II (K5–K8)",
    subject: "German grammar & vocab — Dativ, two-way prepositions, Perfekt/Präteritum, Relativpronomen, Konjunktiv II, Passiv.",
  },
  studytool: {
    label: "CS202 Operating Systems",
    subject: "x86-64 paging, fork/exec/pipe, mutexes, WeensyOS, file systems, crash recovery.",
  },
};

const MODE_INSTRUCTIONS = {
  chat: `Default mode. Be a sharp, concise study partner. Explain terms crisply, probe understanding, suggest next steps. Use bullet points only when they clarify; prefer tight sentences otherwise.`,
  quiz: `Quiz mode. Ask ONE question at a time drawn from the material. Wait for the student's answer. Grade honestly (right / partially right / wrong), give the correct answer with a 1-2 sentence reason, then immediately ask the next question. Track a running score at the bottom of each message like "score: 3/5". If the student asks to stop or switch, oblige.`,
  explain: `Explain mode. Give a rigorous, clean explanation of the term, formula, or concept the student names — include the formal definition, the intuition, a concrete example, and 1-2 common traps. Keep it under 250 words unless asked for more.`,
  mock: `Mock case interview mode. You are the interviewer. Use the CURRENT CASE context below — that's the ground truth for this interview. Walk the student through the 5 blocks in order; the client tells you which block is active. See the MOCK RULES section for details.`,
};

const MOCK_RULES = `
MOCK RULES (read carefully)
- You are the interviewer. The student is the candidate. Stay in character.
- You are given the FULL case below including the solution — DO NOT VOLUNTEER the solution. Use it only to (a) respond realistically to the student's inputs and (b) grade them at the end.
- Block discipline:
    * If this is the student's FIRST message, deliver the case prompt in 1-2 tight sentences, confirm the objective and (if they're not obvious) any key constraints. Then open the CURRENT BLOCK.
    * Do NOT advance blocks on your own. The client will send a system-style message when the student asks to advance.
    * When the client sends "[advance]", give 2-3 sentences of honest feedback on what the student did well and what was missing in the block they just finished, then open the next block.
    * In the Math block, if the student asks for specific numbers, provide only the numbers that would be in an exhibit (costs, volumes, rates). Do not do the arithmetic for them.
    * Never reveal the Recommendation until the student is in the Recommendation block and has given their own answer first.
- Tone: direct, interviewer-paced. Short paragraphs. No "great question!" filler.
- Render math with plain text (no LaTeX).
- Hints: when the client sends "[hint]", give ONE nudge that helps the student think, without giving the answer.
`;

const BLOCK_DETAILS = {
  clarify: {
    label: "Clarifying Questions",
    guidance: "Let the student ask clarifying questions. Answer what a real interviewer would share; don't volunteer the framework or the math. If they skip clarifying Qs, prompt them to check their assumptions."
  },
  framework: {
    label: "Framework",
    guidance: "Ask the student to walk through their structure for the case. Let them finish. Push back on MECE issues or missing buckets. Do NOT read them the framework from the case data — they must build it themselves."
  },
  math: {
    label: "Math / Exhibits",
    guidance: "Share exhibits or specific numbers when asked. Expect the student to do calculations out loud. If they go wrong, ask a guiding question rather than giving the answer."
  },
  brainstorm: {
    label: "Brainstorming",
    guidance: "Prompt the student to brainstorm qualitative factors relevant to the case (risks, drivers, creative solutions). Push for breadth and structure."
  },
  recommend: {
    label: "Recommendation",
    guidance: "Ask the student for their final recommendation. Expect: clear answer, supporting evidence from earlier, risks, next steps. Only after they give their rec, share how it compares to the casebook recommendation."
  },
};

function renderCaseForMock(caseData, blockId) {
  const blk = BLOCK_DETAILS[blockId] || BLOCK_DETAILS.clarify;
  const lines = [
    `CURRENT CASE`,
    `  Case #${caseData.id}: ${caseData.title}`,
    `  ${caseData.industry || ""} · ${caseData.type || ""} · difficulty ${caseData.difficulty || ""}`,
    ``,
    `  PROMPT`,
    `  ${caseData.prompt || ""}`,
    ``,
    caseData.clarifying?.length ? `  CLARIFYING DATA (share when asked)\n  ${caseData.clarifying.map(s => "- " + s).join("\n  ")}` : "",
    ``,
    caseData.framework?.length ? `  FRAMEWORK (DO NOT reveal — student must build their own)\n  ${caseData.framework.map(s => "- " + s).join("\n  ")}` : "",
    ``,
    caseData.math?.length ? `  MATH / EXHIBITS\n  ${caseData.math.map(s => "- " + s).join("\n  ")}` : "",
    ``,
    caseData.brainstorm ? `  BRAINSTORMING CONTEXT\n  ${caseData.brainstorm}` : "",
    ``,
    caseData.recommendation ? `  RECOMMENDATION (DO NOT reveal until the final block)\n  ${caseData.recommendation}` : "",
    ``,
    `CURRENT BLOCK: ${blockId.toUpperCase()}`,
    `  ${blk.guidance}`,
  ];
  return lines.filter(l => l !== undefined && l !== null).join("\n");
}

function buildSystemPrompt({ tab, mode, focus, mockCase, mockBlock }) {
  const persona = TAB_PERSONA[tab] || { label: "Study Notebook", subject: "general study help" };
  const modeInstr = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.chat;
  const summary = summarizeForPrompt(tab);
  const detail = focus ? lookupDetail(tab, focus) : null;

  const parts = [
    `You are the in-notebook AI tutor for "${persona.label}" (rohan.lab study site).`,
    `Subject: ${persona.subject}`,
    ``,
    `OPERATING RULES`,
    `- You are a MASTER of the material listed below. Ground every factual claim in it. If the student asks about something outside the listed scope, say so and offer the closest in-scope topic.`,
    `- Match how the site teaches it. Use the exact term names, framework buckets, and formula names shown below; don't invent new ones.`,
    `- Be direct and tight. No preamble, no "great question!" filler. Skip restating the question.`,
    `- Render math with plain text (no LaTeX) since this renders in a chat bubble.`,
    `- When the student gets something wrong, correct it specifically and show the fix, don't just vaguely affirm.`,
    ``,
    `MODE: ${mode || "chat"}`,
    modeInstr,
  ];

  if (mode === "mock" && mockCase) {
    parts.push("", MOCK_RULES.trim(), "", renderCaseForMock(mockCase, mockBlock || "clarify"));
  } else {
    parts.push("");
    parts.push(summary ? `MATERIAL IN SCOPE\n${summary}` : `MATERIAL: (no content pack loaded for this tab — stay general)`);
    if (detail) parts.push("", `FOCUSED DETAIL (student asked about this)\n${detail}`);
  }

  return parts.join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "server misconfigured: OPENAI_KEY not set" });
    return;
  }

  const {
    tab = "",
    messages = [],
    mode = "chat",
    focus = "",
    mockCaseId = null,
    mockBlock = null,
    format = "stream",   // "stream" | "json"
    model,
  } = req.body || {};

  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: "messages[] required" });
    return;
  }
  const trimmed = messages.slice(-30).map(m => ({
    role: m.role === "assistant" ? "assistant" : (m.role === "system" ? "system" : "user"),
    content: String(m.content || "").slice(0, 8000),
  }));

  // Resolve mock case server-side from the tab's content pack
  let mockCase = null;
  if (mode === "mock" && mockCaseId != null) {
    const pack = loadTab(String(tab).toLowerCase());
    if (pack && Array.isArray(pack.CASES)) {
      mockCase = pack.CASES.find(c => String(c.id) === String(mockCaseId)) || null;
    }
  }

  const system = buildSystemPrompt({
    tab: String(tab).toLowerCase(),
    mode,
    focus,
    mockCase,
    mockBlock,
  });
  const openai = new OpenAI({ apiKey });

  const temperature =
    mode === "quiz" ? 0.4 :
    mode === "mock" ? 0.5 :
    0.6;

  // Non-streaming JSON mode — used for the end-of-mock grade card
  if (format === "json") {
    try {
      const r = await openai.chat.completions.create({
        model: model || DEFAULT_MODEL,
        temperature,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, ...trimmed],
      });
      const raw = r.choices?.[0]?.message?.content || "{}";
      let parsed = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { error: "model returned invalid JSON", raw }; }
      res.status(200).json(parsed);
    } catch (err) {
      console.error("chat json error:", err);
      res.status(500).json({ error: err.message || "chat failed" });
    }
    return;
  }

  // Streaming SSE (default)
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = await openai.chat.completions.create({
      model: model || DEFAULT_MODEL,
      stream: true,
      temperature,
      messages: [{ role: "system", content: system }, ...trimmed],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) send("delta", { text: delta });
    }
    send("done", { ok: true });
    res.end();
  } catch (err) {
    console.error("chat error:", err);
    send("error", { message: err.message || "chat failed" });
    res.end();
  }
};
