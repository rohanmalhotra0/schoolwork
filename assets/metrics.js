/* =========================================================
   rohan.lab — metrics page
   Reads localStorage logs (flash.results, quiz.results, mock.history)
   + per-tab weight/mastered keys, fetches content packs for totals,
   renders KPIs, daily calendar, per-tab mastery, weakest terms, mocks.
   ========================================================= */
(function(){
  "use strict";

  const FLASH_KEY = "rohan.lab.flash.results";
  const QUIZ_KEY  = "rohan.lab.quiz.results";
  const MOCK_KEY  = "rohan.lab.mock.history";

  const TABS = [
    { id: "consulting", label: "darden.lab",   course: "UVA Darden casebook",       weightKey: "darden.card.weights",   masteredKey: "darden.card.mastered",   href: "/Consulting/" },
    { id: "politics",   label: "pol500.lab",   course: "POL-UA 500 · Exam #2",      weightKey: "pol500.card.weights",   masteredKey: "pol500.card.mastered",   href: "/Politics/" },
    { id: "oracle",     label: "epm1080.lab",  course: "Oracle 1Z0-1080-25 EPM",    weightKey: "epm1080.card.weights",  masteredKey: "epm1080.card.mastered",  href: "/Oracle/" },
    { id: "german",     label: "deutsch.lab",  course: "German II · K5–K8",          weightKey: "deutsch.card.weights",  masteredKey: "deutsch.card.mastered",  href: "/German/" },
    { id: "studytool",  label: "cs202.lab",    course: "CS202 · Operating Systems",  weightKey: "cs202.card.weights",    masteredKey: "cs202.card.mastered",    href: "/StudyTool/" },
  ];

  let range = 7; // "7" | "30" | "all"

  /* ---------- data load ---------- */
  function readLog(key){
    try { return JSON.parse(localStorage.getItem(key) || "[]") || []; }
    catch { return []; }
  }
  function readObj(key){
    try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
    catch { return {}; }
  }

  async function loadContent(tabId){
    try {
      const res = await fetch(`/api/content?tab=${encodeURIComponent(tabId)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }

  /* ---------- time helpers ---------- */
  function dayKey(ts){
    const d = new Date(ts);
    d.setHours(0,0,0,0);
    return d.getTime();
  }
  function daysAgo(n){
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - n);
    return d.getTime();
  }
  function inRange(entry){
    if (range === "all") return true;
    const cutoff = daysAgo(Number(range));
    return (entry.ts || 0) >= cutoff;
  }

  /* ---------- compute ---------- */
  function computeKPIs(flash, quiz, mocks){
    const filteredFlash = flash.filter(inRange);
    const filteredQuiz  = quiz.filter(inRange);
    const filteredMocks = mocks.filter(inRange);

    const ratings = filteredFlash.length + filteredQuiz.length;
    const rightCount = filteredFlash.filter(r => r.correct).length + filteredQuiz.filter(r => r.correct).length;
    const acc = ratings ? Math.round(100 * rightCount / ratings) : 0;

    // streak = consecutive days with at least one rating, ending today
    const days = new Set();
    [...flash, ...quiz].forEach(r => days.add(dayKey(r.ts)));
    let streak = 0;
    const today = dayKey(Date.now());
    for (let d = today; d >= today - 365 * 86400000; d -= 86400000){
      if (days.has(d)) streak++;
      else break;
    }

    return {
      ratings,
      accuracy: acc,
      mocks: filteredMocks.length,
      streak,
    };
  }

  function computeCalendar(flash, quiz){
    // last 12 weeks, keyed by dayKey → count
    const counts = {};
    [...flash, ...quiz].forEach(r => {
      const k = dayKey(r.ts || 0);
      counts[k] = (counts[k] || 0) + 1;
    });
    const today = new Date(); today.setHours(0,0,0,0);
    // start at the Sunday ~12 weeks ago
    const WEEKS = 12;
    const endDow = today.getDay();          // 0 Sun..6 Sat
    const start = new Date(today);
    start.setDate(today.getDate() - (WEEKS * 7 - 1 - endDow));

    const cells = [];
    for (let i = 0; i < WEEKS * 7; i++){
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = d.getTime();
      cells.push({ ts: k, count: counts[k] || 0, isToday: k === today.getTime() });
    }
    // compute longest streak + weekly avg (of non-zero weeks)
    const sortedDays = Object.keys(counts).map(Number).sort((a,b) => a - b);
    let longest = 0, cur = 0, prev = null;
    sortedDays.forEach(d => {
      if (prev != null && d - prev === 86400000) cur++; else cur = 1;
      if (cur > longest) longest = cur;
      prev = d;
    });
    const totalRatings = Object.values(counts).reduce((a,b) => a+b, 0);
    const weeksWithActivity = Math.max(1, new Set(sortedDays.map(d => Math.floor(d / (7 * 86400000)))).size);
    const weeklyAvg = Math.round(totalRatings / weeksWithActivity);
    return { cells, longest, weeklyAvg };
  }

  function computePerTab(packs, flash, quiz){
    return TABS.map(t => {
      const pack = packs[t.id] || {};
      const cards = Array.isArray(pack.CARDS) ? pack.CARDS : [];
      const cardCount = cards.length;
      const mastered = readObj(t.masteredKey);
      const masteredCount = Object.keys(mastered).length;
      const pct = cardCount ? Math.round(100 * masteredCount / cardCount) : 0;

      const tabFlash = flash.filter(r => r.tab === t.id);
      const tabQuiz  = quiz.filter(r => r.tab === t.id);

      const recentFlash = tabFlash.filter(inRange);
      const recentQuiz  = tabQuiz.filter(inRange);
      const ratings7 = recentFlash.length + recentQuiz.length;
      const right7   = recentFlash.filter(r => r.correct).length + recentQuiz.filter(r => r.correct).length;
      const acc7 = ratings7 ? Math.round(100 * right7 / ratings7) : null;

      const last = [...tabFlash, ...tabQuiz].reduce((m, r) => Math.max(m, r.ts || 0), 0);
      const lastStr = last ? timeAgo(last) : "never";

      return {
        ...t,
        cardCount,
        masteredCount,
        pct,
        ratings7,
        acc7,
        lastStr,
      };
    });
  }

  function computeWeakest(packs, flash, quiz, n = 10){
    // key = tab + ":" + term. count misses.
    const byTerm = new Map();
    [...flash, ...quiz].forEach(r => {
      if (r.correct) {
        const k = r.tab + ":" + r.term;
        const v = byTerm.get(k) || { tab: r.tab, term: r.term, right: 0, wrong: 0 };
        v.right++;
        byTerm.set(k, v);
      } else {
        const k = r.tab + ":" + r.term;
        const v = byTerm.get(k) || { tab: r.tab, term: r.term, right: 0, wrong: 0 };
        v.wrong++;
        byTerm.set(k, v);
      }
    });
    const arr = Array.from(byTerm.values()).filter(x => x.wrong > 0);
    arr.sort((a, b) => (b.wrong - a.wrong) || ((b.wrong / Math.max(1, b.right+b.wrong)) - (a.wrong / Math.max(1, a.right+a.wrong))));
    return arr.slice(0, n).map(x => {
      const pack = packs[x.tab] || {};
      const cards = Array.isArray(pack.CARDS) ? pack.CARDS : [];
      // try to resolve the card — in content packs CARDS may use term or front
      const card = cards.find(c => c.term === x.term || c.front === x.term);
      return { ...x, card };
    });
  }

  /* ---------- render ---------- */
  function h(html){
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function renderKPIs(kpis, flashCount, quizCount, mocksCount){
    const root = document.getElementById("mx-kpis");
    root.innerHTML = "";
    const cards = [
      { lbl: "ratings",    num: kpis.ratings,  sub: range === "all" ? "all time" : `last ${range} days`, cls: "" },
      { lbl: "accuracy",   num: kpis.accuracy, unit: "%", sub: `${flashCount + quizCount} total events`, cls: "mx-kpi--accent" },
      { lbl: "streak",     num: kpis.streak,   unit: kpis.streak === 1 ? " day" : " days", sub: kpis.streak ? "consecutive days studying" : "start one today", cls: kpis.streak ? "mx-kpi--ok" : "" },
      { lbl: "mocks done", num: kpis.mocks,    sub: `${mocksCount} total interviews`, cls: "" },
    ];
    cards.forEach(c => {
      root.appendChild(h(`
        <div class="mx-kpi ${c.cls || ""}">
          <div class="mx-kpi-lbl">${c.lbl}</div>
          <div class="mx-kpi-num">${c.num}${c.unit ? `<span>${c.unit}</span>` : ""}</div>
          <div class="mx-kpi-sub">${c.sub || ""}</div>
        </div>
      `));
    });
  }

  function renderCalendar(cal){
    const grid = document.getElementById("mx-calendar");
    grid.innerHTML = "";
    cal.cells.forEach(c => {
      // bucket count into levels 0-4 for color intensity
      const lvl = c.count === 0 ? 0 : c.count < 3 ? 1 : c.count < 8 ? 2 : c.count < 16 ? 3 : 4;
      const d = new Date(c.ts);
      const title = `${d.toDateString()} — ${c.count} ratings`;
      const today = c.isToday ? " mx-day--today" : "";
      const el = document.createElement("div");
      el.className = `mx-day mx-day-${lvl}${today}`;
      el.title = title;
      grid.appendChild(el);
    });

    const side = document.getElementById("mx-calendar-side");
    side.innerHTML = `
      <div class="mx-side-row"><div class="mx-side-lbl">longest streak</div><div class="mx-side-val">${cal.longest} day${cal.longest === 1 ? "" : "s"}</div></div>
      <div class="mx-side-row"><div class="mx-side-lbl">weekly avg (active weeks)</div><div class="mx-side-val">${cal.weeklyAvg}</div></div>
    `;
  }

  function renderTabTable(rows){
    const el = document.getElementById("mx-tabtable");
    el.innerHTML = "";
    rows.forEach(r => {
      const bar = r.cardCount
        ? `<div class="mx-bar"><div class="mx-bar-fill" style="width:${r.pct}%"></div></div>
           <div class="mx-bar-txt">${r.masteredCount} / ${r.cardCount} mastered · ${r.pct}%</div>`
        : `<div class="mx-bar-txt">(content pack not loaded)</div>`;
      const act = r.ratings7
        ? `<div>${r.ratings7} ratings<br><b>${r.acc7 ?? 0}%</b> accuracy</div>`
        : `<div>no activity<br>in range</div>`;
      el.appendChild(h(`
        <div class="mx-tabrow">
          <div class="mx-tabname">${escapeHTML(r.label)}<small>${escapeHTML(r.course)}</small></div>
          <div class="mx-barwrap">${bar}</div>
          <div class="mx-tabrow-act">${act}</div>
          <a class="mx-tabrow-link" href="${r.href}">open →</a>
        </div>
      `));
    });
  }

  function renderWeakest(weak){
    const el = document.getElementById("mx-weaklist");
    el.innerHTML = "";
    if (!weak.length){
      el.innerHTML = `<div class="mx-empty">no misses yet — as you study, the terms you miss most will surface here.</div>`;
      return;
    }
    weak.forEach((w, i) => {
      const tabMeta = TABS.find(t => t.id === w.tab);
      const tabHref = tabMeta ? tabMeta.href : "/";
      const def = w.card ? (w.card.def || w.card.back || "") : "";
      el.appendChild(h(`
        <div class="mx-weakrow">
          <div class="mx-weakrow-n">${i + 1}</div>
          <div class="mx-weakrow-term" title="${escapeHTML(def)}">
            <div class="mx-weakrow-term-title">${escapeHTML(w.term)}</div>
            <div class="mx-weakrow-term-tab">${escapeHTML(tabMeta?.label || w.tab)}</div>
          </div>
          <div class="mx-weakrow-stat"><b>${w.wrong}</b> misses<br>${w.right}/${w.right + w.wrong} right</div>
          <a class="mx-weakrow-act" href="${tabHref}">open tab</a>
        </div>
      `));
    });
  }

  function renderMocks(mocks){
    const el = document.getElementById("mx-mocks");
    el.innerHTML = "";
    if (!mocks.length){
      el.innerHTML = `<div class="mx-empty">no mock interviews yet — run one from the Consulting tab's mock mode.</div>`;
      document.getElementById("mx-mocks-section").style.opacity = "0.7";
      return;
    }
    mocks
      .slice()
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .forEach(m => {
        const d = m.dimensions || {};
        const dim = (k, lbl) => {
          const s = Number(d[k]?.score) || 0;
          return `<div class="mx-dim"><div class="mx-dim-n">${s}<span>/5</span></div><div class="mx-dim-lbl">${lbl}</div></div>`;
        };
        el.appendChild(h(`
          <div class="mx-mockrow">
            <div>
              <div class="mx-mockrow-title">${escapeHTML(m.caseTitle || "case #" + (m.caseId || ""))}</div>
              <div class="mx-mockrow-meta">${escapeHTML(timeAgo(m.ts))} · ${escapeHTML(m.tab || "")}</div>
            </div>
            <div class="mx-mockrow-dims">
              ${dim("caseExecution", "Execution")}
              ${dim("communication", "Comms")}
              ${dim("behavioral", "Behavior")}
            </div>
            ${m.overall ? `<div class="mx-mockrow-overall">${escapeHTML(m.overall)}</div>` : ""}
          </div>
        `));
      });
  }

  /* ---------- utils ---------- */
  function escapeHTML(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function timeAgo(ts){
    const s = Math.floor((Date.now() - (ts || 0)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s/60) + " min ago";
    if (s < 86400) return Math.floor(s/3600) + " hr ago";
    const d = Math.floor(s/86400);
    if (d < 31) return d + " day" + (d===1 ? "" : "s") + " ago";
    const m = Math.floor(d/30);
    return m + " month" + (m===1 ? "" : "s") + " ago";
  }

  /* ---------- bootstrap ---------- */
  async function refresh(){
    const flash = readLog(FLASH_KEY);
    const quiz  = readLog(QUIZ_KEY);
    const mocks = readLog(MOCK_KEY);

    document.getElementById("mx-sub").textContent =
      `computed from ${flash.length} flashcard ratings · ${quiz.length} quiz answers · ${mocks.length} mocks`;

    const kpis = computeKPIs(flash, quiz, mocks);
    renderKPIs(kpis, flash.length, quiz.length, mocks.length);

    const cal = computeCalendar(flash, quiz);
    renderCalendar(cal);

    // fetch all tab content packs in parallel
    const packEntries = await Promise.all(TABS.map(async t => [t.id, await loadContent(t.id)]));
    const packs = Object.fromEntries(packEntries);

    const rows = computePerTab(packs, flash, quiz);
    renderTabTable(rows);

    const weak = computeWeakest(packs, flash, quiz, 10);
    renderWeakest(weak);

    renderMocks(mocks.filter(inRange));
  }

  document.querySelectorAll("#mx-range [data-range]").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#mx-range [data-range]").forEach(x => x.classList.remove("mx-chip--on"));
      b.classList.add("mx-chip--on");
      range = b.dataset.range === "all" ? "all" : Number(b.dataset.range);
      refresh();
    });
  });

  refresh();
})();
