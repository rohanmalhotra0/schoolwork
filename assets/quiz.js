/* =========================================================
   rohan.lab — Structured Quiz (client-generated MC from CARDS)
   Exposes: window.ChatLab.quiz = { mount, unmount }
   ========================================================= */
(function(){
  "use strict";

  const RESULTS_KEY = "rohan.lab.quiz.results"; // shared across tabs
  const WEIGHT_KEYS = {
    consulting: "darden.card.weights",
    politics:   "pol500.card.weights",
    oracle:     "epm1080.card.weights",
    german:     "deutsch.card.weights",
    studytool:  "cs202.card.weights",
  };

  /* ---------- instance factory ---------- */
  // Each mounted quiz owns its own state; multiple instances (widget + fullpage)
  // are possible but we just tear down + re-mount.
  function mount(container, opts){
    if (!container) return null;
    const instance = new Quiz(container, opts || {});
    instance.begin();
    return instance;
  }

  function unmount(instance){
    if (instance && typeof instance.teardown === "function") instance.teardown();
  }

  class Quiz {
    constructor(container, opts){
      this.root = container;
      this.tabId = opts.tabId || "consulting";
      this.tabLabel = opts.tabLabel || this.tabId;
      this.onExit = typeof opts.onExit === "function" ? opts.onExit : () => {};
      this.onAskExplain = typeof opts.onAskExplain === "function" ? opts.onAskExplain : null;
      this.surface = opts.surface || "widget"; // "widget" | "page" — tweaks sizing

      this.allCards = [];
      this.pool = [];
      this.queue = [];
      this.asked = [];     // {card, correct:bool}
      this.currentQ = null;
      this.config = { category: "all", count: 10, direction: "mixed", format: "mc" };
      this.phase = "loading";
    }

    async begin(){
      this.renderLoading();
      try {
        this.allCards = await loadCards(this.tabId);
      } catch (err) {
        this.renderError(err.message || String(err));
        return;
      }
      if (!this.allCards.length){
        this.renderError("no vocabulary cards available for this tab yet.");
        return;
      }
      this.phase = "config";
      this.renderConfig();
    }

    teardown(){
      this.root.innerHTML = "";
      this.root.classList.remove("cw-quiz--mounted");
    }

    /* -------- state transitions -------- */
    startRun(){
      this.pool = filterPool(this.allCards, this.config.category);
      if (this.pool.length < 4){
        this.renderError(`need at least 4 cards to run MC. "${this.config.category}" only has ${this.pool.length}. pick a broader filter.`);
        return;
      }
      const n = Math.min(this.config.count, this.pool.length);
      this.queue = shuffle(this.pool.slice()).slice(0, n);
      this.asked = [];
      this.phase = "question";
      this.renderQuestion();
    }

    answer(idx){
      if (!this.currentQ || this.currentQ.answered) return;
      this.currentQ.answered = true;
      const chosen = this.currentQ.options[idx];
      const correct = !!chosen.correct;
      this.currentQ.chosenIdx = idx;
      this.asked.push({ card: this.currentQ.card, correct });
      writeResult(this.tabId, this.currentQ.card.term, correct);
      bumpWeight(this.tabId, this.currentQ.card.term, correct);
      this.renderQuestion(); // re-renders in feedback state
    }

    next(){
      if (!this.queue.length){
        this.phase = "recap";
        this.renderRecap();
        return;
      }
      this.phase = "question";
      this.currentQ = null;
      this.renderQuestion();
    }

    retryMissed(){
      const missed = this.asked.filter(a => !a.correct).map(a => a.card);
      if (!missed.length){ this.renderRecap(); return; }
      this.queue = shuffle(missed);
      this.asked = [];
      this.phase = "question";
      this.renderQuestion();
    }

    restart(){
      this.phase = "config";
      this.renderConfig();
    }

    /* -------- renderers -------- */
    renderLoading(){
      this.root.innerHTML = `<div class="cw-quiz-loading">loading cards…</div>`;
      this.root.classList.add("cw-quiz--mounted");
    }

    renderError(msg){
      this.root.innerHTML = `
        <div class="cw-quiz-err">${esc(msg)}</div>
        <div class="cw-quiz-actions">
          <button class="cw-iconbtn" data-act="exit">back to chat</button>
        </div>
      `;
      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => this.onExit());
    }

    renderConfig(){
      const cats = uniqueCats(this.allCards);
      const chip = (val, label) => `
        <label class="cw-quiz-chip${this.config.category === val ? " cw-quiz-chip--on" : ""}">
          <input type="radio" name="cw-quiz-cat" value="${esc(val)}"${this.config.category === val ? " checked" : ""}>${esc(label)}
        </label>`;
      const countBtn = (n) => `
        <button class="cw-quiz-chip${this.config.count === n ? " cw-quiz-chip--on" : ""}" data-count="${n}">${n}</button>`;
      const dirBtn = (val, label) => `
        <button class="cw-quiz-chip${this.config.direction === val ? " cw-quiz-chip--on" : ""}" data-dir="${val}">${esc(label)}</button>`;

      this.root.innerHTML = `
        <div class="cw-quiz-cfg">
          <div class="cw-quiz-section">
            <div class="cw-quiz-lbl">category</div>
            <div class="cw-quiz-chiprow">
              ${chip("all", `all (${this.allCards.length})`)}
              ${cats.map(c => chip(c, `${c} (${countIn(this.allCards, c)})`)).join("")}
            </div>
          </div>
          <div class="cw-quiz-section">
            <div class="cw-quiz-lbl">questions</div>
            <div class="cw-quiz-chiprow">
              ${countBtn(5)}${countBtn(10)}${countBtn(20)}
            </div>
          </div>
          <div class="cw-quiz-section">
            <div class="cw-quiz-lbl">direction</div>
            <div class="cw-quiz-chiprow">
              ${dirBtn("def", "pick the term")}
              ${dirBtn("term", "pick the definition")}
              ${dirBtn("mixed", "mixed")}
            </div>
          </div>
          <div class="cw-quiz-actions">
            <button class="cw-iconbtn cw-iconbtn--ghost" data-act="exit">back to chat</button>
            <button class="cw-iconbtn cw-iconbtn--primary" data-act="start">start quiz →</button>
          </div>
        </div>
      `;
      this.root.classList.add("cw-quiz--mounted");

      // wire events
      this.root.querySelectorAll('input[name="cw-quiz-cat"]').forEach(r => {
        r.addEventListener("change", e => {
          this.config.category = e.target.value;
          this.renderConfig();
        });
      });
      this.root.querySelectorAll('[data-count]').forEach(b => {
        b.addEventListener("click", () => {
          this.config.count = Number(b.dataset.count);
          this.renderConfig();
        });
      });
      this.root.querySelectorAll('[data-dir]').forEach(b => {
        b.addEventListener("click", () => {
          this.config.direction = b.dataset.dir;
          this.renderConfig();
        });
      });
      this.root.querySelector('[data-act="start"]').addEventListener("click", () => this.startRun());
      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => this.onExit());
    }

    renderQuestion(){
      if (!this.currentQ){
        const card = this.queue.shift();
        if (!card){ this.phase = "recap"; this.renderRecap(); return; }
        this.currentQ = makeQuestion(card, this.pool, this.config.direction);
      }
      const q = this.currentQ;
      const total = this.asked.length + this.queue.length + 1;
      const done  = this.asked.length;
      const correctCount = this.asked.filter(a => a.correct).length;
      const pct = Math.round(100 * done / total);
      const answered = !!q.answered;

      this.root.innerHTML = `
        <div class="cw-quiz-top">
          <div class="cw-quiz-progress">
            <div class="cw-quiz-bar"><div class="cw-quiz-fill" style="width:${pct}%"></div></div>
            <span class="cw-quiz-prog-txt">${done} / ${total}</span>
          </div>
          <div class="cw-quiz-score"><span>score</span> <b>${correctCount}</b> / ${done}</div>
        </div>
        <div class="cw-quiz-stem">
          <div class="cw-quiz-stem-kick">${esc(q.dir === "def" ? "which term matches this?" : "which definition matches?")}</div>
          <div class="cw-quiz-stem-body">${esc(q.dir === "def" ? q.card.def : q.card.term)}</div>
          ${q.card.cat ? `<div class="cw-quiz-stem-cat">${esc(q.card.cat)}</div>` : ""}
        </div>
        <div class="cw-quiz-opts">
          ${q.options.map((o,i) => {
            const cls = [
              "cw-quiz-opt",
              answered && o.correct ? "cw-quiz-opt--correct" : "",
              answered && i === q.chosenIdx && !o.correct ? "cw-quiz-opt--wrong" : "",
            ].filter(Boolean).join(" ");
            return `
              <button class="${cls}" data-idx="${i}" ${answered ? "disabled" : ""}>
                <span class="cw-quiz-letter">${String.fromCharCode(65 + i)}</span>
                <span class="cw-quiz-opt-body">${esc(o.label)}</span>
              </button>`;
          }).join("")}
        </div>
        ${answered ? this.renderFeedback(q) : ""}
        <div class="cw-quiz-actions">
          <button class="cw-iconbtn cw-iconbtn--ghost" data-act="exit">exit</button>
          ${answered ? `<button class="cw-iconbtn cw-iconbtn--primary" data-act="next">${this.queue.length ? "next →" : "see results →"}</button>` : ""}
        </div>
      `;

      this.root.querySelectorAll(".cw-quiz-opt").forEach(b => {
        b.addEventListener("click", () => this.answer(Number(b.dataset.idx)));
      });
      const exitBtn = this.root.querySelector('[data-act="exit"]');
      if (exitBtn) exitBtn.addEventListener("click", () => {
        if (confirm("exit quiz? your progress will be discarded.")) this.onExit();
      });
      const nextBtn = this.root.querySelector('[data-act="next"]');
      if (nextBtn) nextBtn.addEventListener("click", () => this.next());
    }

    renderFeedback(q){
      const picked = q.options[q.chosenIdx];
      const right = picked?.correct;
      const correctLabel = q.options.find(o => o.correct)?.label || "";
      const head = right ? "✓ correct" : "✗ not quite";
      const body = right
        ? (q.card.hint ? esc(q.card.hint) : "nice — moving on.")
        : `it's <b>${esc(correctLabel)}</b>${q.card.hint ? `<br><em>${esc(q.card.hint)}</em>` : ""}`;
      return `
        <div class="cw-quiz-fb cw-quiz-fb--${right ? "ok" : "bad"}">
          <div class="cw-quiz-fb-h">${head}</div>
          <div class="cw-quiz-fb-body">${body}</div>
        </div>
      `;
    }

    renderRecap(){
      const total = this.asked.length;
      const correctCount = this.asked.filter(a => a.correct).length;
      const missed = this.asked.filter(a => !a.correct).map(a => a.card);
      const pct = total ? Math.round(100 * correctCount / total) : 0;
      const tone = pct >= 85 ? "good" : pct >= 60 ? "ok" : "bad";

      this.root.innerHTML = `
        <div class="cw-quiz-recap">
          <div class="cw-quiz-score-big cw-quiz-score-big--${tone}">
            <div class="cw-quiz-score-num">${correctCount}<span>/${total}</span></div>
            <div class="cw-quiz-score-pct">${pct}%</div>
          </div>
          <div class="cw-quiz-recap-sub">${this.tabLabel} · ${esc(this.config.category)} · ${this.config.direction}</div>
          ${missed.length ? `
            <div class="cw-quiz-missed">
              <div class="cw-quiz-lbl">review missed (${missed.length})</div>
              <div class="cw-quiz-missed-list">
                ${missed.map(c => `
                  <div class="cw-quiz-missed-row">
                    <div class="cw-quiz-missed-term">${esc(c.term)}</div>
                    <div class="cw-quiz-missed-def">${esc(truncate(c.def, 140))}</div>
                    ${this.onAskExplain ? `<button class="cw-iconbtn cw-iconbtn--ghost" data-ask="${esc(c.term)}">explain →</button>` : ""}
                  </div>
                `).join("")}
              </div>
            </div>
          ` : `<div class="cw-quiz-perfect">clean sweep. 🎯</div>`}
          <div class="cw-quiz-actions">
            <button class="cw-iconbtn cw-iconbtn--ghost" data-act="exit">back to chat</button>
            <button class="cw-iconbtn" data-act="restart">new quiz</button>
            ${missed.length ? `<button class="cw-iconbtn cw-iconbtn--primary" data-act="retry">retry missed</button>` : ""}
          </div>
        </div>
      `;

      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => this.onExit());
      this.root.querySelector('[data-act="restart"]').addEventListener("click", () => this.restart());
      const retryBtn = this.root.querySelector('[data-act="retry"]');
      if (retryBtn) retryBtn.addEventListener("click", () => this.retryMissed());
      this.root.querySelectorAll("[data-ask]").forEach(b => {
        b.addEventListener("click", () => this.onAskExplain && this.onAskExplain(b.dataset.ask));
      });
    }
  }

  /* =========================================================
     Helpers
     ========================================================= */
  async function loadCards(tabId){
    // The tab's content.js declares `const CARDS = [...]` at the top level of a
    // classic script. That lives in script-scope (shared across scripts on the
    // same page) but is NOT attached to `window`, so we probe it by name.
    try {
      // eslint-disable-next-line no-undef
      if (typeof CARDS !== "undefined" && Array.isArray(CARDS) && CARDS.length) {
        // eslint-disable-next-line no-undef
        return CARDS.slice();
      }
    } catch (_) { /* CARDS not defined on this page — fall through to API */ }

    // fallback: fetch via /api/content (used by /chat.html which doesn't
    // load the tab's content.js)
    const res = await fetch(`/api/content?tab=${encodeURIComponent(tabId)}`);
    if (!res.ok) throw new Error(`content ${res.status}`);
    const pack = await res.json();
    return Array.isArray(pack.CARDS) ? pack.CARDS : [];
  }

  function filterPool(all, cat){
    if (cat === "all") return all.slice();
    return all.filter(c => c.cat === cat);
  }

  function uniqueCats(all){
    const seen = new Set();
    const out = [];
    all.forEach(c => { if (c.cat && !seen.has(c.cat)){ seen.add(c.cat); out.push(c.cat); } });
    return out;
  }

  function countIn(all, cat){
    return all.filter(c => c.cat === cat).length;
  }

  function shuffle(a){
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickDistractors(correct, pool, n){
    const others = pool.filter(c => c.term !== correct.term);
    return shuffle(others).slice(0, n);
  }

  function makeQuestion(card, pool, direction){
    const dir = direction === "mixed" ? (Math.random() < 0.5 ? "def" : "term") : direction;
    const distractors = pickDistractors(card, pool, 3);
    const opts = shuffle([card, ...distractors]).map(c => ({
      label: dir === "def" ? c.term : c.def,
      correct: c.term === card.term,
    }));
    return { card, dir, options: opts, answered: false, chosenIdx: -1 };
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function truncate(s, n){
    s = String(s || "");
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }

  /* ---------- persistence: results log + flashcard weights ---------- */
  function writeResult(tabId, term, correct){
    try {
      const log = JSON.parse(localStorage.getItem(RESULTS_KEY) || "[]");
      log.push({ tab: tabId, term, correct, ts: Date.now() });
      if (log.length > 5000) log.splice(0, log.length - 5000);
      localStorage.setItem(RESULTS_KEY, JSON.stringify(log));
    } catch {}
  }

  function bumpWeight(tabId, term, correct){
    const key = WEIGHT_KEYS[tabId];
    if (!key) return;
    try {
      const w = JSON.parse(localStorage.getItem(key) || "{}");
      const prev = w[term] || 1;
      w[term] = correct
        ? Math.max(0.25, prev * 0.7)
        : Math.min(5, prev * 1.7);
      localStorage.setItem(key, JSON.stringify(w));
    } catch {}
  }

  window.ChatLab = window.ChatLab || {};
  window.ChatLab.quiz = { mount, unmount };
})();
