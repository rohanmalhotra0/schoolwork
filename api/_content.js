// Server-side content loader. Reads the client-side content.js files (which
// define globals like CARDS, CASES, FORMULAS) inside a vm sandbox so we can
// use the same source of truth for grounding the AI tutor without duplicating
// the data. Results cached per-process.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const TAB_FILES = {
  consulting: "Consulting/content.js",
  politics:   "Politics/content.js",
  oracle:     "Oracle/content.js",
  german:     "German/content.js",
  studytool:  "StudyTool/content.js",
  // root home page has no content pack — AI falls back to a general persona
};

const CACHE = new Map();

function loadTab(tabId) {
  const key = String(tabId || "").toLowerCase();
  if (CACHE.has(key)) return CACHE.get(key);

  const rel = TAB_FILES[key];
  if (!rel) {
    CACHE.set(key, null);
    return null;
  }

  let abs = path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) {
    // Vercel sometimes nests project files under /var/task/ — try a fallback
    const alt = path.join(__dirname, "..", rel);
    if (fs.existsSync(alt)) abs = alt;
    else {
      CACHE.set(key, null);
      return null;
    }
  }

  const code = fs.readFileSync(abs, "utf8");
  // Top-level `const`/`let` declarations in a classic script create lexical
  // bindings that are NOT properties of globalThis (the sandbox). Append a
  // footer that copies the ones we care about onto a known global property
  // — the footer runs in the same script's lexical scope, so it can see them.
  const KEYS = ["CARDS","CASES","FORMULAS","FRAMEWORKS","ESSAYS","DECKS","MODULES","QUIZZES","SCENARIOS"];
  const footer = `
;try {
  const __out = {};
  ${KEYS.map(k => `try { if (typeof ${k} !== "undefined") __out.${k} = ${k}; } catch (e) {}`).join("\n  ")}
  globalThis.__LAB_CONTENT__ = __out;
} catch (e) {}
`;
  const sandbox = { module: {}, exports: {} };
  try {
    vm.runInNewContext(code + footer, sandbox, { timeout: 1500 });
  } catch (err) {
    console.error(`content load failed for ${key}:`, err.message);
    CACHE.set(key, null);
    return null;
  }
  const exported = sandbox.__LAB_CONTENT__ || {};
  // Also fall back to direct sandbox properties for any tab whose content.js
  // uses `var` (older style) so we don't regress.
  const out = {};
  for (const k of KEYS) {
    if (exported[k] !== undefined) out[k] = exported[k];
    else if (sandbox[k] !== undefined) out[k] = sandbox[k];
  }
  CACHE.set(key, out);
  return out;
}

// Compact string summary used in the system prompt. Keeps the prompt small
// (we only list titles/terms; the AI will quote from memory for detail).
function summarizeForPrompt(tabId) {
  const pack = loadTab(tabId);
  if (!pack) return null;

  const parts = [];
  if (pack.CARDS?.length) {
    const byCat = {};
    pack.CARDS.forEach(c => {
      const cat = c.cat || c.chapter || c.category || "misc";
      (byCat[cat] = byCat[cat] || []).push(c.term || c.de || c.en || "");
    });
    const catLines = Object.entries(byCat).map(
      ([cat, terms]) => `  ${cat}: ${terms.slice(0, 40).join(", ")}${terms.length > 40 ? ", …" : ""}`
    );
    parts.push(`KEY TERMS (${pack.CARDS.length}):\n${catLines.join("\n")}`);
  }
  if (pack.FORMULAS?.length) {
    parts.push(`FORMULAS (${pack.FORMULAS.length}): ${pack.FORMULAS.map(f => f.name).join(", ")}`);
  }
  if (pack.FRAMEWORKS?.length) {
    parts.push(`FRAMEWORKS (${pack.FRAMEWORKS.length}): ${pack.FRAMEWORKS.map(f => f.name).join(", ")}`);
  }
  if (pack.CASES?.length) {
    const lines = pack.CASES.map(c => `  #${c.id} ${c.title} — ${c.industry || ""} / ${c.type || ""} / ${c.difficulty || ""}`);
    parts.push(`CASES (${pack.CASES.length}):\n${lines.join("\n")}`);
  }
  if (pack.ESSAYS?.length) {
    parts.push(`ESSAY PROMPTS (${pack.ESSAYS.length}): ${pack.ESSAYS.map(e => (e.q || "").slice(0, 60)).join(" | ")}`);
  }
  return parts.join("\n\n");
}

// Returns a detailed chunk for a specific item (case, term, framework) when
// the user asks about it by id/name. Lets us ground answers precisely without
// flooding the system prompt.
function lookupDetail(tabId, query) {
  const pack = loadTab(tabId);
  if (!pack || !query) return null;
  const q = String(query).toLowerCase();

  const chunks = [];

  if (pack.CARDS) {
    pack.CARDS.forEach(c => {
      const term = (c.term || c.de || "").toLowerCase();
      if (term && (term === q || term.includes(q) || q.includes(term))) {
        chunks.push(`TERM [${c.cat || ""}] ${c.term}\n  Def: ${c.def || c.en || ""}${c.hint ? `\n  Hint: ${c.hint}` : ""}`);
      }
    });
  }
  if (pack.FORMULAS) {
    pack.FORMULAS.forEach(f => {
      if (f.name?.toLowerCase().includes(q)) {
        chunks.push(`FORMULA ${f.name}: ${f.formula}${f.note ? `  (${f.note})` : ""}`);
      }
    });
  }
  if (pack.FRAMEWORKS) {
    pack.FRAMEWORKS.forEach(f => {
      if (f.name?.toLowerCase().includes(q)) {
        chunks.push(`FRAMEWORK ${f.name}:\n  - ${(f.buckets || []).join("\n  - ")}${f.note ? `\n  Note: ${f.note}` : ""}`);
      }
    });
  }
  if (pack.CASES) {
    pack.CASES.forEach(c => {
      const title = (c.title || "").toLowerCase();
      if (title.includes(q) || String(c.id) === q) {
        chunks.push(formatCase(c));
      }
    });
  }
  return chunks.length ? chunks.join("\n\n") : null;
}

function formatCase(c) {
  const lines = [
    `CASE #${c.id}: ${c.title}`,
    `  ${c.industry || ""} · ${c.type || ""} · difficulty ${c.difficulty || ""}`,
  ];
  if (c.behavioral) lines.push(`  Behavioral: ${c.behavioral}`);
  if (c.prompt) lines.push(`  Prompt: ${c.prompt}`);
  if (c.clarifying?.length) lines.push(`  Clarifying: ${c.clarifying.join(" | ")}`);
  if (c.framework?.length) lines.push(`  Framework: ${c.framework.join(" | ")}`);
  if (c.math?.length) lines.push(`  Math steps:\n    - ${c.math.join("\n    - ")}`);
  if (c.brainstorm) lines.push(`  Brainstorm: ${c.brainstorm}`);
  if (c.recommendation) lines.push(`  Recommendation: ${c.recommendation}`);
  return lines.join("\n");
}

module.exports = { loadTab, summarizeForPrompt, lookupDetail, formatCase };
