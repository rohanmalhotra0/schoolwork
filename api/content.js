// Vercel Serverless Function — /api/content?tab=<id>
// Returns the content pack for a tab (CARDS, CASES, FRAMEWORKS, FORMULAS, …)
// so the full-page chat can run a structured quiz without loading the tab's
// client-side content.js.

const { loadTab } = require("./_content.js");

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const tab = String((req.query && req.query.tab) || "").toLowerCase();
  const pack = loadTab(tab);
  if (!pack) {
    res.status(404).json({ error: `no content pack for tab "${tab}"` });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=600");
  res.json(pack);
};
