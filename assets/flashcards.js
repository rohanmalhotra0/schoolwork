/* =========================================================
   rohan.lab — shared flashcards module (session model)
   Every tab's app.js delegates to this instead of re-implementing
   the same queue + K/D/U/H/undo logic with slightly different bugs.

   Usage:
     StudyLab.flashcards.init({
       cards: CARDS,
       fields: { term: "term", def: "def", hint: "hint", cat: "cat" },
       weightKey:   "darden.card.weights",
       masteredKey: "darden.card.mastered",
       weightKeyFor: (c) => c.term,          // how a card is keyed (default: fields.term)
       catLabel:     (c) => c.cat,           // label shown on the front chip
       filterInputSelector: 'input[name="deck"]',  // optional
       getCurrentFilter: () => "all",        // optional override
     });
   ========================================================= */
(function () {
  "use strict";

  const SHARED_RESULTS_KEY = "rohan.lab.quiz.results"; // shared with quiz.js metrics
  const SHARED_FLASH_KEY   = "rohan.lab.flash.results"; // per-rating log for metrics

  const DEFAULT_FIELDS = { term: "term", def: "def", hint: "hint", cat: "cat" };

  function init(opts){
    return new Session(opts).start();
  }

  class Session {
    constructor(opts){
      if (!opts || !Array.isArray(opts.cards)) throw new Error("flashcards: opts.cards required");
      if (!opts.weightKey)   throw new Error("flashcards: opts.weightKey required");
      if (!opts.masteredKey) throw new Error("flashcards: opts.masteredKey required");

      this.cards       = opts.cards;
      this.fields      = Object.assign({}, DEFAULT_FIELDS, opts.fields || {});
      this.weightKey   = opts.weightKey;
      this.masteredKey = opts.masteredKey;
      this.weightKeyFor = typeof opts.weightKeyFor === "function"
        ? opts.weightKeyFor
        : (c) => this.termOf(c);
      this.catLabel = typeof opts.catLabel === "function" ? opts.catLabel : (c) => this.catOf(c) || "";
      this.catClass = typeof opts.catClass === "function" ? opts.catClass : (c) => "cat--" + slugify(this.catOf(c) || "misc");

      this.filterInputSelector = opts.filterInputSelector || 'input[name="deck"]';
      this.getCurrentFilter = typeof opts.getCurrentFilter === "function"
        ? opts.getCurrentFilter
        : () => {
            const r = document.querySelector(`${this.filterInputSelector}:checked`);
            return r ? r.value : "all";
          };
      this.filterToPool = typeof opts.filterToPool === "function"
        ? opts.filterToPool
        : (f, cards) => f === "all" ? cards.slice() : cards.filter(c => this.catOf(c) === f);

      this.tabTag = opts.tabTag || deriveTabTag(this.weightKey);

      this.weights  = safeJSON(localStorage.getItem(this.weightKey), {});
      this.mastered = safeJSON(localStorage.getItem(this.masteredKey), {});
      this.active   = null;       // { queue, total, masteredCount, missed, history, hintShown, phase }

      // DOM refs filled in setupDOM
      this.el = {};
    }

    termOf(c) { return c[this.fields.term]; }
    defOf(c)  { return c[this.fields.def]; }
    hintOf(c) { return c[this.fields.hint]; }
    catOf(c)  { return c[this.fields.cat]; }
    wkey(c)   { return this.weightKeyFor(c); }

    saveWeights(){  localStorage.setItem(this.weightKey,   JSON.stringify(this.weights));  }
    saveMastered(){ localStorage.setItem(this.masteredKey, JSON.stringify(this.mastered)); }

    logRating(card, correct){
      try {
        const log = JSON.parse(localStorage.getItem(SHARED_FLASH_KEY) || "[]");
        log.push({ tab: this.tabTag, term: this.termOf(card), correct, ts: Date.now() });
        if (log.length > 5000) log.splice(0, log.length - 5000);
        localStorage.setItem(SHARED_FLASH_KEY, JSON.stringify(log));
      } catch {}
    }

    /* ---------- lifecycle ---------- */
    start(){
      this.setupDOM();
      this.wireFilterInputs();
      this.wireButtons();
      this.wireKeyboard();
      this.startRun();
      return this;
    }

    startRun(pool){
      const currentFilter = this.getCurrentFilter();
      const base = pool && pool.length
        ? pool
        : this.filterToPool(currentFilter, this.cards);
      const shuffled = pool && pool.length ? pool.slice() : this.weightedShuffle(base);
      this.active = {
        queue: shuffled,
        total: shuffled.length,
        masteredCount: 0,
        missed: [],
        history: [],
        hintShown: false,
        phase: shuffled.length ? "active" : "done",
      };
      this.render();
    }

    weightedShuffle(pool){
      return pool
        .map(c => ({ c, w: (this.weights[this.wkey(c)] || 1) * (0.5 + Math.random()) }))
        .sort((a, b) => b.w - a.w)
        .map(x => x.c);
    }

    /* ---------- DOM setup (idempotent) ---------- */
    setupDOM(){
      const cardsSheet = document.getElementById("cards");
      if (!cardsSheet) return;

      // Replace "prev" with "undo", drop "next" (session model has no next)
      const prev = document.getElementById("prev-card");
      if (prev) {
        prev.id = "undo-card";
        prev.textContent = "↶ undo";
        prev.title = "undo last rating (U)";
        prev.disabled = true;
      }
      const next = document.getElementById("next-card");
      if (next) next.remove();

      // Wrap card + controls in fc-stage-active (only if not already there)
      if (!document.getElementById("fc-stage-active")) {
        const cardStage = cardsSheet.querySelector(".card-stage");
        const controls  = cardsSheet.querySelector(".card-controls");
        if (cardStage && controls) {
          const wrap = document.createElement("div");
          wrap.id = "fc-stage-active";
          cardStage.parentElement.insertBefore(wrap, cardStage);
          wrap.appendChild(cardStage);
          wrap.appendChild(controls);
        }
      }

      // Inject progress bar above the stage
      if (!document.getElementById("fc-prog")) {
        const prog = document.createElement("div");
        prog.className = "fc-prog";
        prog.id = "fc-prog";
        prog.innerHTML = `
          <div class="fc-prog-bar"><div class="fc-prog-fill" id="fc-prog-fill" style="width:0%"></div></div>
          <span class="fc-prog-txt" id="fc-prog-txt">0 / 0 mastered</span>
          <span class="fc-prog-queue" id="fc-prog-queue"></span>
        `;
        const active = document.getElementById("fc-stage-active");
        if (active && active.parentElement) active.parentElement.insertBefore(prog, active);
      }

      // Inject session-complete stage
      if (!document.getElementById("fc-stage-done")) {
        const done = document.createElement("div");
        done.id = "fc-stage-done";
        done.className = "fc-done";
        done.style.display = "none";
        done.innerHTML = `
          <div class="fc-done-icon">✓</div>
          <div class="fc-done-title">session complete</div>
          <div class="fc-done-stats" id="fc-done-stats"></div>
          <div class="fc-done-actions">
            <button class="mini-btn mini-btn--ok" id="fc-retry-missed">retry missed</button>
            <button class="mini-btn" id="fc-new-run">new session</button>
          </div>
        `;
        const active = document.getElementById("fc-stage-active");
        if (active && active.parentElement) active.parentElement.insertBefore(done, active.nextSibling);
      }

      // Inject hint-toggle button on the back of the card
      if (!document.getElementById("card-hint-toggle")) {
        const back = cardsSheet.querySelector(".card-back");
        const note = document.getElementById("card-note");
        if (back && note) {
          const btn = document.createElement("button");
          btn.id = "card-hint-toggle";
          btn.className = "fc-hint-toggle";
          btn.type = "button";
          btn.style.display = "none";
          btn.textContent = "show hint";
          back.insertBefore(btn, note);
          note.hidden = true;
        }
      }

      // Inject "ask AI" button on the back of the card (only if the widget is
      // present — i.e., not on /chat.html). Hidden until the card is flipped
      // so it doesn't distract from active recall.
      if (!document.getElementById("card-ask-ai")) {
        const back = cardsSheet.querySelector(".card-back");
        if (back) {
          const btn = document.createElement("button");
          btn.id = "card-ask-ai";
          btn.className = "fc-ask-ai";
          btn.type = "button";
          btn.textContent = "ask AI ↗";
          btn.title = "open the tutor pre-loaded with this term";
          back.appendChild(btn);
        }
      }

      // cache refs
      this.el = {
        card:        document.getElementById("flashcard"),
        front:       document.getElementById("card-front"),
        back:        document.getElementById("card-back"),
        tag:         document.getElementById("card-tag"),
        note:        document.getElementById("card-note"),
        hintToggle:  document.getElementById("card-hint-toggle"),
        askAiBtn:    document.getElementById("card-ask-ai"),
        counter:     document.getElementById("card-counter"),
        undoBtn:     document.getElementById("undo-card"),
        flipBtn:     document.getElementById("flip-card"),
        knewBtn:     document.getElementById("knew"),
        missedBtn:   document.getElementById("missed"),
        shuffleBtn:  document.getElementById("shuffle"),
        stageActive: document.getElementById("fc-stage-active"),
        stageDone:   document.getElementById("fc-stage-done"),
        doneStats:   document.getElementById("fc-done-stats"),
        retryBtn:    document.getElementById("fc-retry-missed"),
        newRunBtn:   document.getElementById("fc-new-run"),
        progFill:    document.getElementById("fc-prog-fill"),
        progTxt:     document.getElementById("fc-prog-txt"),
        progQueue:   document.getElementById("fc-prog-queue"),
      };
    }

    wireFilterInputs(){
      document.querySelectorAll(this.filterInputSelector).forEach(r => {
        r.addEventListener("change", () => this.startRun());
      });
    }

    wireButtons(){
      const { card, flipBtn, undoBtn, knewBtn, missedBtn, shuffleBtn, retryBtn, newRunBtn, hintToggle, askAiBtn } = this.el;
      if (card) card.addEventListener("click", (e) => {
        if (e.target.closest(".fc-hint-toggle")) return;
        if (e.target.closest(".fc-ask-ai")) return;
        this.flip();
      });
      if (flipBtn)    flipBtn.addEventListener("click",    (e) => { e.stopPropagation(); this.flip(); });
      if (undoBtn)    undoBtn.addEventListener("click",    (e) => { e.stopPropagation(); this.actUndo(); });
      if (knewBtn)    knewBtn.addEventListener("click",    (e) => { e.stopPropagation(); this.actKnew(); });
      if (missedBtn)  missedBtn.addEventListener("click",  (e) => { e.stopPropagation(); this.actMissed(); });
      if (shuffleBtn) shuffleBtn.addEventListener("click", () => this.startRun());
      if (retryBtn)   retryBtn.addEventListener("click",   () => this.retryMissed());
      if (newRunBtn)  newRunBtn.addEventListener("click",  () => this.startRun());
      if (hintToggle) hintToggle.addEventListener("click", (e) => { e.stopPropagation(); this.toggleHint(); });
      if (askAiBtn)   askAiBtn.addEventListener("click",   (e) => {
        e.stopPropagation();
        const s = this.active;
        const card = s?.queue?.[0];
        if (!card || !window.ChatLab?.askAI) return;
        const term = this.termOf(card);
        window.ChatLab.askAI({
          mode: "explain",
          focus: term,
          prompt: `Explain "${term}" in depth — definition, intuition, one concrete example, and 1-2 common traps a student might fall into.`,
        });
      });
    }

    wireKeyboard(){
      document.addEventListener("keydown", (e) => {
        if (document.querySelector(".sheet--active")?.id !== "cards") return;
        if (e.target.matches("input, textarea")) return;
        if (this.active?.phase === "done") return;
        if (e.code === "Space") { e.preventDefault(); this.flip(); }
        else if (e.key === "k" || e.key === "K") this.actKnew();
        else if (e.key === "d" || e.key === "D") this.actMissed();
        else if (e.key === "u" || e.key === "U") this.actUndo();
        else if (e.key === "h" || e.key === "H") this.toggleHint();
      });
    }

    /* ---------- render ---------- */
    render(){
      const s = this.active; if (!s) return;
      if (this.el.stageActive) this.el.stageActive.style.display = s.phase === "done" ? "none" : "";
      if (this.el.stageDone)   this.el.stageDone.style.display   = s.phase === "done" ? "flex" : "none";
      this.renderProgress();
      if (s.phase === "done") this.renderDone();
      else this.renderCard();
      if (this.el.undoBtn) this.el.undoBtn.disabled = !s.history.length;
    }

    renderProgress(){
      const { masteredCount, total, queue } = this.active;
      const pct = total ? Math.round(100 * masteredCount / total) : 0;
      if (this.el.progFill)  this.el.progFill.style.width = pct + "%";
      if (this.el.progTxt)   this.el.progTxt.textContent  = `${masteredCount} / ${total} mastered`;
      if (this.el.progQueue) this.el.progQueue.textContent = queue.length ? `· ${queue.length} in queue` : "";
    }

    renderCard(){
      const s = this.active;
      const card = s.queue[0];
      if (this.el.card) this.el.card.classList.remove("flipped");
      if (!card) { s.phase = "done"; this.render(); return; }

      if (this.el.front) this.el.front.textContent = this.termOf(card) || "";
      if (this.el.back)  this.el.back.textContent  = this.defOf(card)  || "";

      if (this.el.tag) {
        const cat = this.catLabel(card);
        if (cat) {
          this.el.tag.textContent = cat;
          this.el.tag.className   = "fc-badge cat-badge " + this.catClass(card);
          this.el.tag.style.display = "inline-block";
        } else {
          this.el.tag.style.display = "none";
        }
      }

      const hint = this.hintOf(card);
      if (this.el.note) this.el.note.textContent = hint || "";
      if (this.el.note) this.el.note.hidden = !s.hintShown || !hint;
      if (this.el.hintToggle) {
        if (hint) {
          this.el.hintToggle.style.display = "inline-block";
          this.el.hintToggle.textContent = s.hintShown ? "hide hint" : "show hint";
        } else {
          this.el.hintToggle.style.display = "none";
        }
      }

      // counter = position in the session, 1-indexed
      const pos = Math.min(s.total, s.masteredCount + 1);
      if (this.el.counter) this.el.counter.textContent = `${pos} / ${s.total}`;

      this.decorateMasteryBadge(card);
    }

    decorateMasteryBadge(card){
      const existing = document.getElementById("card-mastery-badge");
      if (existing) existing.remove();
      const key = this.wkey(card);
      if (!this.mastered[key]) return;
      const front = document.querySelector(".card-front");
      if (!front) return;
      const badge = document.createElement("div");
      badge.id = "card-mastery-badge";
      badge.className = "fc-mastery-badge";
      badge.textContent = "seen before ✓";
      front.appendChild(badge);
    }

    renderDone(){
      const s = this.active;
      const pct = s.total ? Math.round(100 * s.masteredCount / s.total) : 0;
      if (!this.el.doneStats) return;
      this.el.doneStats.innerHTML = `
        <span class="fc-done-score">${s.masteredCount}<span>/${s.total}</span></span>
        <span class="fc-done-pct">${pct}%</span>
        ${s.missed.length
          ? `<span class="fc-done-missed">${s.missed.length} needed another pass</span>`
          : `<span class="fc-done-missed fc-done-missed--clean">no re-tries needed</span>`}
      `;
      if (this.el.retryBtn) this.el.retryBtn.style.display = s.missed.length ? "inline-block" : "none";
    }

    /* ---------- actions ---------- */
    flip(){ if (this.el.card) this.el.card.classList.toggle("flipped"); }

    actKnew(){
      const s = this.active; if (!s || s.phase === "done") return;
      const card = s.queue.shift(); if (!card) return;
      const key = this.wkey(card);
      const priorW = this.weights[key] || 1;
      const wasMasteredBefore = !!this.mastered[key];
      this.weights[key]  = Math.max(0.25, priorW * 0.6);
      this.mastered[key] = Date.now();
      this.saveWeights(); this.saveMastered();
      this.logRating(card, true);
      s.masteredCount++;
      s.history.push({ card, action: "knew", wasMasteredBefore, priorWeight: priorW });
      s.hintShown = false;
      if (!s.queue.length) s.phase = "done";
      this.render();
    }

    actMissed(){
      const s = this.active; if (!s || s.phase === "done") return;
      const card = s.queue.shift(); if (!card) return;
      const key = this.wkey(card);
      const priorW = this.weights[key] || 1;
      this.weights[key] = Math.min(5, priorW * 1.8);
      this.saveWeights();
      this.logRating(card, false);
      const insertAt = Math.min(s.queue.length, 3 + Math.floor(Math.random() * 3));
      s.queue.splice(insertAt, 0, card);
      s.missed.push(card);
      s.history.push({ card, action: "missed", priorWeight: priorW, insertAt });
      s.hintShown = false;
      this.render();
    }

    actUndo(){
      const s = this.active; if (!s) return;
      const last = s.history.pop(); if (!last) return;
      const key = this.wkey(last.card);
      if (last.action === "knew") {
        s.queue.unshift(last.card);
        s.masteredCount = Math.max(0, s.masteredCount - 1);
        if (!last.wasMasteredBefore) delete this.mastered[key];
      } else if (last.action === "missed") {
        const insertedAt = last.insertAt ?? 0;
        const idx = s.queue.findIndex((c, i) => c === last.card && i >= Math.max(0, insertedAt - 1));
        if (idx >= 0) s.queue.splice(idx, 1);
        s.queue.unshift(last.card);
        const popIdx = s.missed.lastIndexOf(last.card);
        if (popIdx >= 0) s.missed.splice(popIdx, 1);
      }
      this.weights[key] = last.priorWeight;
      this.saveWeights(); this.saveMastered();
      s.phase = "active";
      s.hintShown = false;
      this.render();
    }

    toggleHint(){
      const s = this.active; if (!s) return;
      s.hintShown = !s.hintShown;
      if (this.el.note) this.el.note.hidden = !s.hintShown;
      if (this.el.hintToggle) this.el.hintToggle.textContent = s.hintShown ? "hide hint" : "show hint";
    }

    retryMissed(){
      const seen = new Set(); const uniq = [];
      (this.active?.missed || []).forEach(c => {
        const k = this.wkey(c);
        if (!seen.has(k)) { seen.add(k); uniq.push(c); }
      });
      this.startRun(uniq);
    }
  }

  /* ---------- utils ---------- */
  function safeJSON(s, fallback){
    try { return JSON.parse(s || ""); } catch { return fallback; }
  }
  function slugify(s){
    return String(s || "").toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  function deriveTabTag(weightKey){
    // "darden.card.weights" → "darden"
    return String(weightKey).split(".")[0];
  }

  window.StudyLab = window.StudyLab || {};
  window.StudyLab.flashcards = { init };
})();
