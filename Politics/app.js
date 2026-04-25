/* =========================================================
   pol500.lab — app.js
   flashcards · learn (MC) · match (timed) · essays
   ========================================================= */

const CAT_SLUG = {
  "Voting & Participation": "voting",
  "Ethnicity & Identity":   "ethnicity",
  "Parties & Systems":      "parties",
};
const catClass = c => "cat--" + (CAT_SLUG[c] || "parties");

/* ---------- tabs ---------- */
const tabs   = document.querySelectorAll(".file-tabs .tab");
const sheets = document.querySelectorAll(".sheet");

function activateTab(name){
  tabs.forEach(t => {
    if (t.dataset.target === "home") return;
    t.classList.toggle("tab--active", t.dataset.target === name);
  });
  sheets.forEach(s => s.classList.toggle("sheet--active", s.id === name));
}
tabs.forEach(t => {
  if (t.dataset.target === "home") return;
  t.addEventListener("click", () => activateTab(t.dataset.target));
});

function cycleTab(dir){
  const order = Array.from(tabs).filter(t => t.dataset.target !== "home").map(t => t.dataset.target);
  const cur   = order.findIndex(id => document.getElementById(id).classList.contains("sheet--active"));
  const next  = (cur + dir + order.length) % order.length;
  activateTab(order[next]);
}

/* ---------- global keys ---------- */
document.addEventListener("keydown", e => {
  if (e.target.matches("input, textarea")) return;
  // ignore while typing in learn MC (none currently, but safe)
  const active = document.querySelector(".sheet--active")?.id;
  if (e.key === "ArrowLeft"  && active !== "cards") cycleTab(-1);
  if (e.key === "ArrowRight" && active !== "cards") cycleTab(+1);
});

/* =========================================================
   FLASHCARDS — delegated to the shared session module
   ========================================================= */
function filterCards(filter){
  // Reused by the Learn tab below.
  if (filter === "all") return CARDS.slice();
  return CARDS.filter(c => c.cat === filter);
}

window.StudyLab?.flashcards?.init({
  cards:       CARDS,
  fields:      { term: "term", def: "def", hint: "hint", cat: "cat" },
  weightKey:   "pol500.card.weights",
  masteredKey: "pol500.card.mastered",
  catClass:    c => catClass(c.cat || ""),
});

/* =========================================================
   LEARN (4-option MC, requeue misses)
   ========================================================= */
let lnQueue = [];
let lnMastered = new Set();
let lnTotal = 0;
let lnCurrent = null;

function pickDistractors(correct, pool, n){
  const others = pool.filter(c => c.term !== correct.term);
  // shuffle
  for (let i = others.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return others.slice(0, n);
}

function startLearn(){
  const filter = document.querySelector('input[name="lfilter"]:checked').value;
  const pool = filterCards(filter);
  lnQueue = pool.slice();
  // shuffle queue
  for (let i = lnQueue.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [lnQueue[i], lnQueue[j]] = [lnQueue[j], lnQueue[i]];
  }
  lnMastered = new Set();
  lnTotal = pool.length;
  document.getElementById("learn-start").style.display = "none";
  document.getElementById("learn-done").style.display  = "none";
  document.getElementById("learn-session").style.display = "block";
  updateLearnProgress();
  serveLearn();
}

function updateLearnProgress(){
  const pct = lnTotal ? Math.round(100 * lnMastered.size / lnTotal) : 0;
  document.getElementById("learn-prog-fill").style.width = pct + "%";
  document.getElementById("learn-prog-txt").textContent = `${lnMastered.size} / ${lnTotal} mastered`;
}

function serveLearn(){
  if (!lnQueue.length){ endLearn(); return; }
  lnCurrent = lnQueue.shift();
  document.getElementById("learn-mc-cat").textContent = lnCurrent.cat;
  document.getElementById("learn-mc-q").textContent   = lnCurrent.def;
  const distract = pickDistractors(lnCurrent, CARDS, 3);
  const opts = [...distract, lnCurrent];
  for (let i = opts.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const wrap = document.getElementById("learn-mc-opts");
  wrap.innerHTML = "";
  opts.forEach(o => {
    const b = document.createElement("button");
    b.className = "learn-opt";
    b.textContent = o.term;
    b.addEventListener("click", () => checkMC(b, o));
    wrap.appendChild(b);
  });
  const fb = document.getElementById("learn-mc-fb");
  fb.textContent = ""; fb.className = "check-feedback";
  document.getElementById("learn-mc-next").style.display = "none";
}

function checkMC(btn, chosen){
  const all = document.querySelectorAll("#learn-mc-opts .learn-opt");
  all.forEach(b => b.style.pointerEvents = "none");
  const fb = document.getElementById("learn-mc-fb");
  if (chosen.term === lnCurrent.term){
    btn.classList.add("correct");
    fb.textContent = "✓ Right.";
    fb.className = "check-feedback ok";
    lnMastered.add(lnCurrent.term);
  } else {
    btn.classList.add("wrong");
    all.forEach(b => { if (b.textContent === lnCurrent.term) b.classList.add("correct"); });
    fb.textContent = `✗ It's "${lnCurrent.term}".`;
    fb.className = "check-feedback bad";
    // requeue: insert 2-3 slots ahead
    const ins = Math.min(lnQueue.length, 3);
    lnQueue.splice(ins, 0, lnCurrent);
  }
  updateLearnProgress();
  document.getElementById("learn-mc-next").style.display = "inline-block";
}

function endLearn(){
  document.getElementById("learn-session").style.display = "none";
  document.getElementById("learn-done").style.display    = "block";
  document.getElementById("learn-done-txt").textContent  = `${lnMastered.size} / ${lnTotal} terms.`;
}

document.getElementById("learn-start-btn").addEventListener("click", startLearn);
document.getElementById("learn-mc-next").addEventListener("click", serveLearn);
document.getElementById("learn-restart").addEventListener("click", () => {
  document.getElementById("learn-done").style.display  = "none";
  document.getElementById("learn-start").style.display = "block";
});

/* =========================================================
   MATCH — 6 pairs timed
   ========================================================= */
const MATCH_PAIRS = 6;
let matchState = null;
let matchTimer = null;

function shuffled(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startMatch(){
  clearInterval(matchTimer);
  const picks = shuffled(CARDS).slice(0, MATCH_PAIRS);
  const tiles = [];
  picks.forEach((c, i) => {
    tiles.push({ id: "t" + i, pair: i, kind: "term", text: c.term });
    tiles.push({ id: "d" + i, pair: i, kind: "def",  text: c.def });
  });
  matchState = {
    tiles: shuffled(tiles),
    selected: null,
    solved: 0,
    start: performance.now(),
    elapsed: 0,
    finished: false,
  };
  document.getElementById("match-pairs").textContent = `0 / ${MATCH_PAIRS}`;
  document.getElementById("match-win").classList.remove("show");
  renderMatch();
  matchTimer = setInterval(() => {
    if (matchState.finished) return;
    const t = (performance.now() - matchState.start) / 1000;
    document.getElementById("match-time").textContent = t.toFixed(1) + "s";
  }, 100);
}

function renderMatch(){
  const grid = document.getElementById("match-grid");
  grid.innerHTML = "";
  matchState.tiles.forEach(t => {
    const b = document.createElement("button");
    b.className = "match-tile" + (t.kind === "term" ? " is-term" : "");
    b.dataset.id = t.id;
    b.dataset.pair = t.pair;
    b.textContent = t.text;
    b.addEventListener("click", () => onMatchClick(b, t));
    grid.appendChild(b);
  });
}

function onMatchClick(btn, tile){
  if (btn.classList.contains("correct")) return;
  if (matchState.selected && matchState.selected.btn === btn){
    btn.classList.remove("selected");
    matchState.selected = null;
    return;
  }
  if (!matchState.selected){
    btn.classList.add("selected");
    matchState.selected = { btn, tile };
    return;
  }
  const prev = matchState.selected;
  matchState.selected = null;
  if (prev.tile.pair === tile.pair && prev.tile.kind !== tile.kind){
    prev.btn.classList.remove("selected");
    prev.btn.classList.add("correct");
    btn.classList.add("correct");
    matchState.solved += 1;
    document.getElementById("match-pairs").textContent = `${matchState.solved} / ${MATCH_PAIRS}`;
    if (matchState.solved === MATCH_PAIRS) finishMatch();
  } else {
    prev.btn.classList.remove("selected");
    btn.classList.add("wrong");
    prev.btn.classList.add("wrong");
    setTimeout(() => {
      btn.classList.remove("wrong");
      prev.btn.classList.remove("wrong");
    }, 350);
  }
}

function finishMatch(){
  matchState.finished = true;
  clearInterval(matchTimer);
  const t = (performance.now() - matchState.start) / 1000;
  document.getElementById("match-time").textContent = t.toFixed(1) + "s";
  const win = document.getElementById("match-win");
  win.textContent = `✓ all 6 matched in ${t.toFixed(1)}s — click "new round" for a fresh draw`;
  win.classList.add("show");
}

document.getElementById("match-new").addEventListener("click", startMatch);
startMatch();

/* =========================================================
   ESSAYS — accordion
   ========================================================= */
function renderEssays(){
  const list = document.getElementById("essay-list");
  list.innerHTML = "";
  ESSAYS.forEach((e, i) => {
    const item = document.createElement("div");
    item.className = "essay-item";
    const head = document.createElement("button");
    head.className = "essay-head";
    head.innerHTML = `
      <span class="essay-num">${String(i+1).padStart(2,"0")}</span>
      <span class="essay-q">${e.q}</span>
      <span class="essay-toggle">show hint ▾</span>
    `;
    const body = document.createElement("div");
    body.className = "essay-body";
    const hint = document.createElement("div");
    hint.className = "essay-hint";
    hint.textContent = e.hint;
    body.appendChild(hint);
    head.addEventListener("click", () => {
      const open = body.classList.toggle("open");
      head.querySelector(".essay-toggle").textContent = open ? "hide hint ▴" : "show hint ▾";
    });
    item.appendChild(head);
    item.appendChild(body);
    list.appendChild(item);
  });
}
renderEssays();

/* =========================================================
   ESSAY QUIZ — two-step active recall then MC selection
   step 1: type an outline from memory (self-graded)
   step 2: pick the central argument from 4 options
   requeues missed cards until all 10 are mastered
   ========================================================= */
let eqQueue = [];
let eqMastered = new Set();
let eqTotal = 0;
let eqCurrent = null;

function shuffleArr(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildEqDeck(){
  // pair each ESSAY prompt with its matching ESSAY_MC entry by index
  return ESSAYS.map((e, i) => ({
    idx: i,
    prompt: e.q,
    hint: e.hint,
    topic: ESSAY_MC[i]?.topic || e.q,
    mc: ESSAY_MC[i],
  })).filter(x => x.mc);
}

function startEssayQuiz(){
  const order = document.querySelector('input[name="eqorder"]:checked').value;
  const deck = buildEqDeck();
  eqQueue = order === "shuffle" ? shuffleArr(deck) : deck.slice();
  eqMastered = new Set();
  eqTotal = deck.length;
  document.getElementById("eq-start").style.display = "none";
  document.getElementById("eq-done").style.display  = "none";
  document.getElementById("eq-session").style.display = "block";
  updateEqProgress();
  serveEssayQuiz();
}

function updateEqProgress(){
  const pct = eqTotal ? Math.round(100 * eqMastered.size / eqTotal) : 0;
  document.getElementById("eq-prog-fill").style.width = pct + "%";
  document.getElementById("eq-prog-txt").textContent = `${eqMastered.size} / ${eqTotal} mastered`;
}

function serveEssayQuiz(){
  if (!eqQueue.length){ endEssayQuiz(); return; }
  eqCurrent = eqQueue.shift();

  // show recall, hide selection
  document.getElementById("eq-recall").style.display = "block";
  document.getElementById("eq-select").style.display = "none";
  document.getElementById("eq-reveal").style.display = "none";
  document.getElementById("eq-next").style.display   = "none";

  document.getElementById("eq-topic").textContent   = "topic: " + eqCurrent.topic;
  document.getElementById("eq-topic-2").textContent = "topic: " + eqCurrent.topic;
  document.getElementById("eq-prompt").textContent  = eqCurrent.prompt;
  document.getElementById("eq-recall-text").value   = "";

  const fb = document.getElementById("eq-fb");
  fb.textContent = ""; fb.className = "check-feedback";
}

function revealEssayChoices(){
  document.getElementById("eq-recall").style.display = "none";
  document.getElementById("eq-select").style.display = "block";

  const mc = eqCurrent.mc;
  document.getElementById("eq-mc-q").textContent = mc.q;
  const wrap = document.getElementById("eq-opts");
  wrap.innerHTML = "";
  // shuffle option order but remember the correct index
  const indexed = mc.opts.map((text, i) => ({ text, i }));
  const shuffled = shuffleArr(indexed);
  shuffled.forEach(o => {
    const b = document.createElement("button");
    b.className = "learn-opt";
    b.textContent = o.text;
    b.addEventListener("click", () => checkEssayMC(b, o.i));
    wrap.appendChild(b);
  });
}

function checkEssayMC(btn, chosenIdx){
  const all = document.querySelectorAll("#eq-opts .learn-opt");
  all.forEach(b => b.style.pointerEvents = "none");
  const fb = document.getElementById("eq-fb");
  const mc = eqCurrent.mc;
  const correctText = mc.opts[mc.correct];

  if (chosenIdx === mc.correct){
    btn.classList.add("correct");
    fb.textContent = "✓ Right.";
    fb.className = "check-feedback ok";
    eqMastered.add(eqCurrent.idx);
  } else {
    btn.classList.add("wrong");
    all.forEach(b => { if (b.textContent === correctText) b.classList.add("correct"); });
    fb.textContent = `✗ Central argument: "${correctText}".`;
    fb.className = "check-feedback bad";
    // requeue 2-3 slots ahead
    const ins = Math.min(eqQueue.length, 3);
    eqQueue.splice(ins, 0, eqCurrent);
  }

  document.getElementById("eq-explain").textContent    = mc.explain;
  document.getElementById("eq-full-hint").textContent  = eqCurrent.hint;
  document.getElementById("eq-reveal").style.display   = "block";
  document.getElementById("eq-next").style.display     = "inline-block";
  updateEqProgress();
}

function endEssayQuiz(){
  document.getElementById("eq-session").style.display = "none";
  document.getElementById("eq-done").style.display    = "block";
  document.getElementById("eq-done-txt").textContent  =
    `${eqMastered.size} / ${eqTotal} essay topics recalled cleanly.`;
}

/* =========================================================
   CHEATSHEET — render the structured walk-through.
   Each "section" entry produces a header + intro and starts a
   new TOC anchor; each "term" entry is a card with definition,
   underlying mechanism, application rule, and trap-to-watch.
   ========================================================= */
(function renderCheatsheet(){
  const list = document.getElementById("cheat-list");
  const toc  = document.getElementById("cheat-toc");
  if (!list || typeof CHEATSHEET === "undefined") return;

  const sectionAnchors = [];
  let buf = "";
  let inSection = false;
  CHEATSHEET.forEach((entry, i) => {
    if (entry.kind === "section"){
      if (inSection) buf += `</div>`;
      const id = "cheat-sec-" + i;
      sectionAnchors.push({ id, title: entry.title });
      buf += `
        <section class="cheat-section" id="${id}">
          <h3 class="cheat-h">${escapeHtml(entry.title)}</h3>
          ${entry.intro ? `<p class="cheat-intro">${escapeHtml(entry.intro)}</p>` : ""}
          <div class="cheat-cards">`;
      inSection = true;
      return;
    }
    if (entry.kind === "term"){
      buf += `
        <article class="cheat-card">
          <h4 class="cheat-term">${escapeHtml(entry.term)}</h4>
          <div class="cheat-row"><span class="cheat-label">def</span><span class="cheat-body">${escapeHtml(entry.def)}</span></div>
          ${entry.means ? `<div class="cheat-row"><span class="cheat-label">means</span><span class="cheat-body">${escapeHtml(entry.means)}</span></div>` : ""}
          ${entry.apply ? `<div class="cheat-row"><span class="cheat-label">apply</span><span class="cheat-body">${escapeHtml(entry.apply)}</span></div>` : ""}
          ${entry.watch ? `<div class="cheat-row cheat-row--watch"><span class="cheat-label">watch</span><span class="cheat-body">${escapeHtml(entry.watch)}</span></div>` : ""}
        </article>`;
    }
  });
  if (inSection) buf += `</div></section>`;
  list.innerHTML = buf;

  toc.innerHTML = sectionAnchors.map(s =>
    `<a class="cheat-toc-link" href="#${s.id}">${escapeHtml(s.title)}</a>`
  ).join("");
  // intercept TOC clicks so they scroll inside the sheet without
  // confusing the tab system (we're already on the cheat tab).
  toc.querySelectorAll(".cheat-toc-link").forEach(a => {
    a.addEventListener("click", ev => {
      ev.preventDefault();
      const id = a.getAttribute("href").slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
})();

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

/* =========================================================
   STUDY GUIDE — verbatim handout + structured walkthrough.
   Each "question to grapple with" gets a card with:
     · bottom line     — the headline answer
     · terms           — concepts to cite explicitly
     · outline         — 4–6 bullets you could write on the exam
     · trap            — most common mistake on this question
   ========================================================= */
(function renderStudyGuide(){
  const list  = document.getElementById("guide-list");
  const oTerms = document.getElementById("guide-orig-terms");
  const oQs    = document.getElementById("guide-orig-qs");
  if (!list || typeof STUDY_GUIDE_QUESTIONS === "undefined") return;

  if (oTerms && Array.isArray(STUDY_GUIDE_TERMS)){
    oTerms.innerHTML = STUDY_GUIDE_TERMS.map(t =>
      `<li>${escapeHtml(t)}</li>`
    ).join("");
  }
  if (oQs){
    oQs.innerHTML = STUDY_GUIDE_QUESTIONS.map(q =>
      `<li>${escapeHtml(q.q)}</li>`
    ).join("");
  }

  list.innerHTML = STUDY_GUIDE_QUESTIONS.map(q => `
    <article class="guide-card" id="guide-q-${q.n}">
      <header class="guide-card-h">
        <span class="guide-card-n">Q${q.n}</span>
        <p class="guide-card-q">${escapeHtml(q.q)}</p>
      </header>
      <div class="guide-row guide-row--bl">
        <span class="guide-label">bottom line</span>
        <span class="guide-body">${escapeHtml(q.bottomLine)}</span>
      </div>
      <div class="guide-row guide-row--terms">
        <span class="guide-label">cite</span>
        <span class="guide-body">
          ${q.keyTerms.map(t => `<span class="guide-term-pill">${escapeHtml(t)}</span>`).join("")}
        </span>
      </div>
      <div class="guide-row guide-row--outline">
        <span class="guide-label">outline</span>
        <ol class="guide-body guide-outline">
          ${q.outline.map(b => `<li>${escapeHtml(b)}</li>`).join("")}
        </ol>
      </div>
      <div class="guide-row guide-row--trap">
        <span class="guide-label">trap</span>
        <span class="guide-body">${escapeHtml(q.trap)}</span>
      </div>
    </article>
  `).join("");
})();

// Wire essay-quiz event listeners defensively so a missing element (stale
// cached HTML, etc.) can never halt execution of earlier init code.
const eqOn = (id, handler) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", handler);
};
eqOn("eq-start-btn",    startEssayQuiz);
eqOn("eq-recall-done",  revealEssayChoices);
eqOn("eq-skip-recall",  revealEssayChoices);
eqOn("eq-next",         serveEssayQuiz);
eqOn("eq-restart",      () => {
  const done  = document.getElementById("eq-done");
  const start = document.getElementById("eq-start");
  if (done)  done.style.display  = "none";
  if (start) start.style.display = "block";
});
