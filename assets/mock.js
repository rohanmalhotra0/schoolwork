/* =========================================================
   rohan.lab — Mock Case Interview module
   Exposes: window.ChatLab.mock = { mount, unmount }
   Picker → stepper + chat → grade card. The same instance is used by the
   widget (stacked layout) and /chat.html (two-column on wide screens).
   ========================================================= */
(function(){
  "use strict";

  const BLOCKS = [
    { id: "clarify",    label: "Clarify",    full: "Clarifying Qs" },
    { id: "framework",  label: "Framework",  full: "Framework" },
    { id: "math",       label: "Math",       full: "Math & Exhibits" },
    { id: "brainstorm", label: "Brainstorm", full: "Brainstorming" },
    { id: "recommend",  label: "Recommend",  full: "Recommendation" },
  ];

  const MOCKS_LOG_KEY = "rohan.lab.mock.history"; // array of finished runs

  function mount(container, opts){
    if (!container) return null;
    const m = new MockRun(container, opts || {});
    m.begin();
    return m;
  }
  function unmount(instance){
    if (instance && typeof instance.teardown === "function") instance.teardown();
  }

  class MockRun {
    constructor(container, opts){
      this.root = container;
      this.tabId = opts.tabId || "consulting";
      this.tabLabel = opts.tabLabel || this.tabId;
      this.surface = opts.surface || "widget"; // "widget" | "page"
      this.onExit = typeof opts.onExit === "function" ? opts.onExit : () => {};
      this.streamClient = opts.streamClient || window.ChatLab?.client;
      this.initialCaseId = opts.initialCaseId != null ? String(opts.initialCaseId) : null;

      this.allCases = [];
      this.filter = { type: "all", difficulty: "all" };
      this.selected = null;
      this.blockIdx = 0;
      this.messages = [];       // visible chat messages
      this.streaming = false;
      this.streamCtrl = null;
      this.phase = "loading";   // loading | picker | running | done
      this.grade = null;

      /* ---------- voice state ---------- */
      this.voicePrefs = loadVoicePrefs();
      this.recorder = null;
      this.micState = "idle";   // idle | listening | processing | error
      this.micLevel = 0;
      this.recordElapsed = 0;   // seconds since recording started
      this.recordElapsedTimer = null;
      this.currentAudio = null; // Audio element for AI TTS playback
      this.lastTurnAudio = null; // { blob, durationMs, mimeType } for the last recorded user turn
      this.turnMeta = [];       // one entry per visible chat msg: { role, durationMs?, audioUrl?, audioBlob? }
      this.blockStartTimes = [Date.now()];
      this.blockDurations = []; // closed durations (ms) for completed blocks
      this.blockTickTimer = null;
    }

    async begin(){
      this.renderLoading();
      try {
        this.allCases = await loadCases(this.tabId);
      } catch (err) {
        this.renderError(err.message || String(err));
        return;
      }
      if (!this.allCases.length){
        this.renderError("no cases available for this tab — mock mode is built for Consulting cases.");
        return;
      }
      // If the caller pre-selected a case (askAI from a case header), jump
      // straight into it and skip the picker.
      if (this.initialCaseId){
        const preset = this.allCases.find(c => String(c.id) === this.initialCaseId);
        this.initialCaseId = null;
        if (preset){ this.startCase(preset); return; }
      }
      this.phase = "picker";
      this.renderPicker();
    }

    startCaseById(id){
      if (!this.allCases.length){
        // not loaded yet — remember it for begin() to pick up
        this.initialCaseId = String(id);
        return;
      }
      const c = this.allCases.find(x => String(x.id) === String(id));
      if (c) this.startCase(c);
    }

    teardown(){
      if (this.streamCtrl) try { this.streamCtrl.abort(); } catch {}
      this._stopRecording();
      this._stopAudio();
      if (this.blockTickTimer) { clearInterval(this.blockTickTimer); this.blockTickTimer = null; }
      // tear down any document listeners attached for the settings popover
      if (this._settingsDocHandler) {
        document.removeEventListener("mousedown", this._settingsDocHandler);
        this._settingsDocHandler = null;
      }
      if (this._settingsKeyHandler) {
        document.removeEventListener("keydown", this._settingsKeyHandler);
        this._settingsKeyHandler = null;
      }
      this.root.innerHTML = "";
      this.root.classList.remove("cw-mock--mounted");
    }

    /* ---------- screens ---------- */

    renderLoading(){
      this.root.innerHTML = `<div class="cw-mock-loading">loading cases…</div>`;
      this.root.classList.add("cw-mock--mounted");
    }

    renderError(msg){
      this.root.innerHTML = `
        <div class="cw-mock-err">${esc(msg)}</div>
        <div class="cw-mock-actions"><button class="cw-iconbtn" data-act="exit">back to chat</button></div>
      `;
      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => this.onExit());
    }

    renderPicker(){
      const types = uniq(this.allCases.map(c => c.type)).filter(Boolean).sort();
      const diffs = ["1 / 1 / 1","2 / 1 / 1","2 / 1 / 2","2 / 2 / 1","2 / 2 / 2","2 / 2 / 3","2 / 3 / 1","2 / 3 / 2","3 / 2 / 3","3 / 3 / 2","3 / 3 / 3"]; // overall
      // Build a coarse difficulty bucket (overall star only) from case.difficulty like "2 / 2 / 3"
      const filtered = this.allCases.filter(c => {
        if (this.filter.type !== "all" && c.type !== this.filter.type) return false;
        if (this.filter.difficulty !== "all"){
          const overall = overallStar(c.difficulty);
          if (String(overall) !== this.filter.difficulty) return false;
        }
        return true;
      });

      const chip = (on, val, label, name) => `
        <button class="cw-mock-chip${on ? " cw-mock-chip--on" : ""}" data-${name}="${esc(val)}">${esc(label)}</button>`;

      this.root.innerHTML = `
        <div class="cw-mock-picker">
          <div class="cw-mock-hdrrow">
            <div class="cw-mock-h1">pick a case</div>
            <button class="cw-iconbtn cw-iconbtn--ghost" data-act="exit">back to chat</button>
          </div>

          <div class="cw-mock-section">
            <div class="cw-mock-lbl">case type</div>
            <div class="cw-mock-chiprow">
              ${chip(this.filter.type === "all", "all", `all (${this.allCases.length})`, "type")}
              ${types.map(t => chip(this.filter.type === t, t, `${t} (${countIn(this.allCases, "type", t)})`, "type")).join("")}
            </div>
          </div>

          <div class="cw-mock-section">
            <div class="cw-mock-lbl">difficulty (overall ★)</div>
            <div class="cw-mock-chiprow">
              ${chip(this.filter.difficulty === "all", "all", "any", "diff")}
              ${["1","2","3"].map(d => chip(this.filter.difficulty === d, d, `${d}★ (${countByOverall(this.allCases, d)})`, "diff")).join("")}
            </div>
          </div>

          <div class="cw-mock-section">
            <div class="cw-mock-lbl">${filtered.length} cases</div>
            <div class="cw-mock-caselist">
              <button class="cw-mock-case cw-mock-case--rand" data-rand>
                <span class="cw-mock-case-num">?</span>
                <span class="cw-mock-case-body">
                  <span class="cw-mock-case-title">random from filter</span>
                  <span class="cw-mock-case-meta">interviewer picks · you don't peek</span>
                </span>
              </button>
              ${filtered.map(c => `
                <button class="cw-mock-case" data-case="${esc(String(c.id))}">
                  <span class="cw-mock-case-num">${esc(String(c.id).padStart(2,"0"))}</span>
                  <span class="cw-mock-case-body">
                    <span class="cw-mock-case-title">${esc(c.title)}</span>
                    <span class="cw-mock-case-meta">${esc(c.industry || "")} · ${esc(c.type || "")} · ${esc(c.difficulty || "")}</span>
                  </span>
                </button>`).join("")}
            </div>
          </div>
        </div>
      `;

      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => this.onExit());
      this.root.querySelectorAll('[data-type]').forEach(b => {
        b.addEventListener("click", () => { this.filter.type = b.dataset.type; this.renderPicker(); });
      });
      this.root.querySelectorAll('[data-diff]').forEach(b => {
        b.addEventListener("click", () => { this.filter.difficulty = b.dataset.diff; this.renderPicker(); });
      });
      this.root.querySelector('[data-rand]').addEventListener("click", () => {
        if (!filtered.length) return;
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        this.startCase(pick);
      });
      this.root.querySelectorAll('[data-case]').forEach(b => {
        b.addEventListener("click", () => {
          const id = b.dataset.case;
          const c = this.allCases.find(x => String(x.id) === id);
          if (c) this.startCase(c);
        });
      });
    }

    startCase(caseData){
      this.selected = caseData;
      this.blockIdx = 0;
      this.messages = [];
      this.turnMeta = [];
      this.grade = null;
      this.phase = "running";
      this.blockStartTimes = [Date.now()];
      this.blockDurations = [];
      this._startBlockTicker();
      this.renderRun();
      // kick off the interviewer: send a starter user message to prompt the AI to open the case
      this.sendControl("Ready when you are — give me the prompt and open the first block.");
    }

    renderRun(){
      const c = this.selected;
      const blk = BLOCKS[this.blockIdx];
      const voice = !!this.voicePrefs.voiceMode;

      this.root.innerHTML = `
        <div class="cw-mock-run cw-mock-run--${this.surface}${voice ? " cw-mock-run--voice" : ""}">
          <div class="cw-mock-stepper" id="cw-mock-stepper">${this._renderStepperHTML()}</div>

          <div class="cw-mock-split">
            <aside class="cw-mock-casepane">
              <div class="cw-mock-case-hdr">
                <div class="cw-mock-case-hdr-num">#${esc(String(c.id))}</div>
                <div>
                  <div class="cw-mock-case-hdr-title">${esc(c.title)}</div>
                  <div class="cw-mock-case-hdr-meta">${esc(c.industry || "")} · ${esc(c.type || "")} · diff ${esc(c.difficulty || "")}</div>
                </div>
              </div>
              <div class="cw-mock-case-section">
                <div class="cw-mock-case-lbl">prompt</div>
                <div class="cw-mock-case-body">${esc(c.prompt)}</div>
              </div>
              <div class="cw-mock-case-section">
                <div class="cw-mock-case-lbl">current block</div>
                <div class="cw-mock-case-body"><b id="cw-mock-cur-block">${esc(blk.full)}</b></div>
              </div>
              <div class="cw-mock-case-section cw-mock-tips">
                <div class="cw-mock-case-lbl">tips</div>
                <ul class="cw-mock-tips-list" id="cw-mock-tips-list">${tipsFor(blk.id).map(t => `<li>${esc(t)}</li>`).join("")}</ul>
              </div>
            </aside>

            <section class="cw-mock-chatpane">
              <div class="cw-mock-msgs" id="cw-mock-msgs"></div>

              <div class="cw-mock-input-zone" id="cw-mock-input-zone">
                ${voice ? this._renderVoiceInputHTML() : this._renderTextInputHTML()}
              </div>

              <div class="cw-mock-runbar">
                <button class="cw-iconbtn cw-iconbtn--ghost" data-act="exit">exit</button>
                <button class="cw-iconbtn" data-act="hint" title="ask for a nudge without giving the answer">?  hint</button>
                <button class="cw-iconbtn cw-mock-mode-toggle" data-act="mode" title="${voice ? "switch to typing" : "switch to voice"}">
                  ${voice ? "✎ type" : "🎙 voice"}
                </button>
                <button class="cw-iconbtn cw-mock-gear" data-act="settings" title="voice settings">⚙</button>
                <span class="cw-mock-runbar-spacer"></span>
                <button class="cw-iconbtn${this.blockIdx === BLOCKS.length - 1 ? " cw-iconbtn--primary" : ""}" data-act="advance">
                  ${this.blockIdx === BLOCKS.length - 1 ? "finish & grade →" : `next: ${esc(BLOCKS[this.blockIdx+1].label)} →`}
                </button>
              </div>

              <div class="cw-mock-settings-popover" id="cw-mock-settings" style="display:none"></div>
            </section>
          </div>
        </div>
      `;
      this.root.classList.add("cw-mock--mounted");

      this.renderMessages();
      this._wireInputZone();

      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => {
        if (confirm("exit the mock? your progress will be discarded.")) this.onExit();
      });
      this.root.querySelector('[data-act="hint"]').addEventListener("click", () => this.requestHint());
      this.root.querySelector('[data-act="advance"]').addEventListener("click", () => this.advanceBlock());
      this.root.querySelector('[data-act="mode"]').addEventListener("click", () => this.toggleVoiceMode());
      this.root.querySelector('[data-act="settings"]').addEventListener("click", () => this.toggleSettings());

      if (!voice) {
        const input = this.root.querySelector("#cw-mock-input");
        if (input) setTimeout(() => input.focus(), 50);
      }
    }

    _renderStepperHTML(){
      return BLOCKS.map((b, i) => {
        const state = i < this.blockIdx ? "done" : i === this.blockIdx ? "active" : "todo";
        let timerHTML = "";
        if (state === "done") {
          const dur = this.blockDurations[i];
          if (dur != null) timerHTML = `<span class="cw-mock-step-time">${fmtMMSS(dur)}</span>`;
        } else if (state === "active") {
          const start = this.blockStartTimes[i] || Date.now();
          const dur = Date.now() - start;
          timerHTML = `<span class="cw-mock-step-time cw-mock-step-time--live" data-live="1">${fmtMMSS(dur)}</span>`;
        }
        return `
          <div class="cw-mock-step cw-mock-step--${state}" data-step="${i}">
            <span class="cw-mock-step-n">${i+1}</span>
            <span class="cw-mock-step-lbl">${esc(b.label)}</span>
            ${timerHTML}
          </div>`;
      }).join('<span class="cw-mock-step-sep"></span>');
    }

    _renderTextInputHTML(){
      return `
        <div class="cw-mock-input-row">
          <textarea class="cw-textarea" id="cw-mock-input" rows="1" placeholder="your answer to the interviewer…"></textarea>
          <button class="cw-send" id="cw-mock-send">send</button>
        </div>
      `;
    }

    _renderVoiceInputHTML(){
      const state = this.micState;
      const levelBars = Array.from({ length: 32 }, () => `<span class="cw-mic-bar"></span>`).join("");
      const label =
        state === "listening"  ? "listening — tap to send" :
        state === "processing" ? "transcribing…" :
        state === "error"      ? (this._micErrorMsg || "mic error — tap to retry") :
                                 "tap to speak · auto-stops on 2s silence";
      const timer = state === "listening"
        ? `<span class="cw-mic-timer" id="cw-mic-timer">${fmtMMSS(this.recordElapsed * 1000)}</span>`
        : "";
      return `
        <div class="cw-mock-voice-row">
          <button class="cw-mic-btn cw-mic-btn--${state}" id="cw-mic-btn" type="button" aria-label="record">
            <span class="cw-mic-icon">${state === "listening" ? "●" : state === "processing" ? "…" : "🎙"}</span>
          </button>
          <div class="cw-mic-meter-wrap">
            <div class="cw-mic-meter" id="cw-mic-meter">${levelBars}</div>
            <div class="cw-mic-label">${esc(label)} ${timer}</div>
          </div>
        </div>
      `;
    }

    _wireInputZone(){
      const voice = !!this.voicePrefs.voiceMode;
      if (!voice) {
        const input = this.root.querySelector("#cw-mock-input");
        const sendBtn = this.root.querySelector("#cw-mock-send");
        if (!input || !sendBtn) return;
        const send = () => this.onUserSend();
        sendBtn.addEventListener("click", send);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(); }
        });
        input.addEventListener("input", () => {
          input.style.height = "auto";
          input.style.height = Math.min(160, input.scrollHeight) + "px";
        });
      } else {
        const btn = this.root.querySelector("#cw-mic-btn");
        if (btn) btn.addEventListener("click", () => this.onMicButton());
      }
    }

    renderMessages(){
      const box = this.root.querySelector("#cw-mock-msgs");
      if (!box) return;
      box.innerHTML = "";
      this.messages.forEach(m => this.appendMsgEl(m.role, m.content, m.hidden));
      this.scrollMsgsBottom();
    }

    appendMsgEl(role, content, hidden, meta){
      if (hidden) return null;  // control messages don't render
      const box = this.root.querySelector("#cw-mock-msgs");
      if (!box) return null;
      const wrap = document.createElement("div");
      wrap.className = "cw-msg cw-msg--" + (role === "user" ? "user" : (role === "error" ? "err" : "ai"));
      wrap.dataset.role = role;
      const roleTxt = role === "user" ? "you" : (role === "error" ? "error" : "interviewer");
      const chip =
        meta && meta.audioFromVoice && role === "user"
          ? `<span class="cw-msg-chip">🎙 ${fmtMMSS(meta.durationMs || 0)}</span>`
          : meta && meta.audioFromTTS && role !== "user"
          ? `<span class="cw-msg-chip">🔊 ${esc(meta.voice || "")}</span>`
          : "";
      wrap.innerHTML = `
        <div class="cw-msg-role">${roleTxt}${chip}</div>
        <div class="cw-msg-body"></div>
        <div class="cw-msg-actions" style="display:none"></div>
      `;
      wrap.querySelector(".cw-msg-body").textContent = content;
      box.appendChild(wrap);
      return wrap;
    }

    scrollMsgsBottom(){
      const box = this.root.querySelector("#cw-mock-msgs");
      if (box) box.scrollTop = box.scrollHeight;
    }

    /* ---------- conversation mechanics ---------- */

    pushVisible(role, content){
      this.messages.push({ role, content });
    }
    pushHidden(role, content){
      this.messages.push({ role, content, hidden: true });
    }

    onUserSend(){
      if (this.streaming) return;
      const input = this.root.querySelector("#cw-mock-input");
      const text = (input.value || "").trim();
      if (!text) return;
      input.value = "";
      input.style.height = "auto";
      this.pushVisible("user", text);
      this.appendMsgEl("user", text);
      this.runTurn();
    }

    sendControl(text){
      // A starter that looks like a user message from the student's side, used
      // to kick off the case without the student having to type.
      this.pushVisible("user", text);
      this.appendMsgEl("user", text);
      this.runTurn();
    }

    requestHint(){
      if (this.streaming) return;
      this.pushHidden("user", "[hint]");
      this.runTurn();
    }

    advanceBlock(){
      if (this.streaming) return;
      // close out current block timer
      const start = this.blockStartTimes[this.blockIdx] || Date.now();
      this.blockDurations[this.blockIdx] = Date.now() - start;

      if (this.blockIdx >= BLOCKS.length - 1){
        this.finishAndGrade();
        return;
      }
      const next = BLOCKS[this.blockIdx + 1];
      this.pushHidden("user", `[advance] The student is ready to move from ${BLOCKS[this.blockIdx].full} to ${next.full}. Give 2-3 sentences of feedback on the block we just finished, then open the next block with an opening prompt.`);
      this.blockIdx += 1;
      this.blockStartTimes[this.blockIdx] = Date.now();
      this.updateStepperAndCase();
      this.runTurn();
    }

    updateStepperAndCase(){
      const stepper = this.root.querySelector("#cw-mock-stepper");
      if (stepper) stepper.innerHTML = this._renderStepperHTML();
      const blk = BLOCKS[this.blockIdx];
      const currBlkEl = this.root.querySelector("#cw-mock-cur-block");
      if (currBlkEl) currBlkEl.textContent = blk.full;
      const tipsEl = this.root.querySelector("#cw-mock-tips-list");
      if (tipsEl) tipsEl.innerHTML = tipsFor(blk.id).map(t => `<li>${esc(t)}</li>`).join("");
      const advBtn = this.root.querySelector('[data-act="advance"]');
      if (advBtn){
        advBtn.textContent = this.blockIdx === BLOCKS.length - 1 ? "finish & grade →" : `next: ${BLOCKS[this.blockIdx+1].label} →`;
        advBtn.classList.toggle("cw-iconbtn--primary", this.blockIdx === BLOCKS.length - 1);
      }
    }

    _startBlockTicker(){
      if (this.blockTickTimer) clearInterval(this.blockTickTimer);
      this.blockTickTimer = setInterval(() => {
        if (this.phase !== "running") return;
        const liveEl = this.root.querySelector('.cw-mock-step--active .cw-mock-step-time--live');
        if (liveEl) {
          const start = this.blockStartTimes[this.blockIdx] || Date.now();
          liveEl.textContent = fmtMMSS(Date.now() - start);
        }
      }, 1000);
    }

    async runTurn(){
      if (this.streaming) return;
      this.streaming = true;
      this.streamCtrl = new AbortController();
      const aiMeta = this.voicePrefs.voiceMode && this.voicePrefs.speakReplies
        ? { audioFromTTS: true, voice: this.voicePrefs.voice }
        : null;
      const aiEl = this.appendMsgEl("assistant", "", false, aiMeta);
      if (aiEl) aiEl.classList.add("cw-msg--typing");
      const bodyEl = aiEl?.querySelector(".cw-msg-body");
      this.pushVisible("assistant", "");
      this.turnMeta.push(aiMeta || {});
      let buf = "";
      const send = this.root.querySelector("#cw-mock-send");
      if (send) send.disabled = true;
      let finishedOK = false;

      try {
        await this.streamClient.streamChat({
          tab: this.tabId,
          mode: "mock",
          mockCaseId: this.selected?.id,
          mockBlock: BLOCKS[this.blockIdx].id,
          messages: this.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          signal: this.streamCtrl.signal,
          onDelta: (t) => { buf += t; if (bodyEl) bodyEl.textContent = buf; this.scrollMsgsBottom(); },
          onDone: () => {
            if (aiEl) aiEl.classList.remove("cw-msg--typing");
            this.messages[this.messages.length - 1].content = buf;
            finishedOK = true;
          },
          onError: (err) => {
            if (aiEl){ aiEl.classList.remove("cw-msg--typing","cw-msg--ai"); aiEl.classList.add("cw-msg--err"); }
            if (bodyEl) bodyEl.textContent = err.message || "mock failed";
            this.messages[this.messages.length - 1].content = `[error: ${err.message || "mock failed"}]`;
          },
        });
      } finally {
        this.streaming = false;
        this.streamCtrl = null;
        if (send) send.disabled = false;
      }

      // Voice mode: optionally TTS the reply, then auto-arm the mic.
      // Auto-arm happens whether or not TTS is enabled — the user is in voice
      // mode for a reason and shouldn't have to manually tap to keep going.
      if (finishedOK && this.voicePrefs.voiceMode && buf.trim()) {
        if (this.voicePrefs.speakReplies) {
          await this._playAIReply(buf, aiEl);
        }
        if (this.voicePrefs.voiceMode && !this.streaming && this.phase === "running") {
          setTimeout(() => {
            if (this.phase === "running" && this.voicePrefs.voiceMode && this.micState === "idle") {
              this.startRecording();
            }
          }, 600);
        }
      }
    }

    async _playAIReply(text, aiEl){
      this._stopAudio();
      try {
        const audio = await window.ChatLab.voice.speak(text, this.voicePrefs.voice);
        this.currentAudio = audio;
        if (aiEl) {
          const actions = aiEl.querySelector(".cw-msg-actions");
          if (actions) {
            actions.style.display = "flex";
            actions.innerHTML = `
              <button class="cw-mock-msg-btn" data-act="pause">⏸ pause</button>
              <button class="cw-mock-msg-btn" data-act="replay">↻ replay</button>
            `;
            actions.querySelector('[data-act="pause"]').addEventListener("click", () => {
              if (audio.paused) { audio.play().catch(() => {}); }
              else { audio.pause(); }
            });
            actions.querySelector('[data-act="replay"]').addEventListener("click", () => {
              audio.currentTime = 0;
              audio.play().catch(() => {});
            });
          }
        }
        // Resolve when audio finishes naturally OR is stopped externally
        // (via _stopAudio dispatching a "lab:stopped" event). Without this,
        // pausing the audio would leave the awaiter hung indefinitely.
        await new Promise(resolve => {
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          audio.addEventListener("ended",      finish, { once: true });
          audio.addEventListener("error",      finish, { once: true });
          audio.addEventListener("lab:stopped", finish, { once: true });
          audio.play().catch(finish);
        });
      } catch (err) {
        console.warn("TTS failed:", err);
      } finally {
        this.currentAudio = null;
      }
    }

    _stopAudio(){
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          // notify any awaiter inside _playAIReply
          this.currentAudio.dispatchEvent(new Event("lab:stopped"));
        } catch {}
        this.currentAudio = null;
      }
    }

    /* ---------- voice mode controls ---------- */

    toggleVoiceMode(){
      this.voicePrefs.voiceMode = !this.voicePrefs.voiceMode;
      saveVoicePrefs(this.voicePrefs);
      this._stopRecording();
      this._stopAudio();
      this.renderRun();
    }

    toggleSettings(){
      const pop = this.root.querySelector("#cw-mock-settings");
      if (!pop) return;
      const showing = pop.style.display === "block";
      if (showing) { this._closeSettings(); return; }
      if (!window.ChatLab?.voice) {
        pop.style.display = "block";
        pop.innerHTML = `<div class="cw-mock-settings-h">voice unavailable — /assets/voice.js failed to load.</div>`;
        return;
      }
      pop.style.display = "block";
      pop.innerHTML = this._renderSettingsHTML();
      this._wireSettings();
      // Click-outside-to-close (use mousedown so the dropdown <select> still works)
      this._settingsDocHandler = (e) => {
        if (!pop.contains(e.target) && !e.target.closest(".cw-mock-gear")) {
          this._closeSettings();
        }
      };
      // Escape-to-close
      this._settingsKeyHandler = (e) => {
        if (e.key === "Escape") this._closeSettings();
      };
      setTimeout(() => {
        document.addEventListener("mousedown", this._settingsDocHandler);
        document.addEventListener("keydown",   this._settingsKeyHandler);
      }, 0);
    }

    _closeSettings(){
      const pop = this.root.querySelector("#cw-mock-settings");
      if (pop) { pop.style.display = "none"; pop.innerHTML = ""; }
      if (this._settingsDocHandler) {
        document.removeEventListener("mousedown", this._settingsDocHandler);
        this._settingsDocHandler = null;
      }
      if (this._settingsKeyHandler) {
        document.removeEventListener("keydown", this._settingsKeyHandler);
        this._settingsKeyHandler = null;
      }
    }

    _renderSettingsHTML(){
      const v = this.voicePrefs;
      const voiceOpts = window.ChatLab.voice.VOICES.map(x =>
        `<option value="${esc(x)}"${x === v.voice ? " selected" : ""}>${esc(x)}</option>`
      ).join("");
      return `
        <div class="cw-mock-settings-h">
          voice settings
          <button class="cw-mock-settings-close" type="button" id="cw-mock-settings-close" aria-label="close">×</button>
        </div>
        <label class="cw-mock-settings-row">
          <span>interviewer voice</span>
          <select id="cw-mock-voice-sel">${voiceOpts}</select>
        </label>
        <label class="cw-mock-settings-row">
          <span>auto-play replies</span>
          <input type="checkbox" id="cw-mock-speak-toggle" ${v.speakReplies ? "checked" : ""}>
        </label>
        <label class="cw-mock-settings-row">
          <span>auto-stop on silence (~2s)</span>
          <input type="checkbox" id="cw-mock-autostop-toggle" ${v.autoStop ? "checked" : ""}>
        </label>
        <div class="cw-mock-settings-foot">
          <button class="cw-iconbtn cw-iconbtn--ghost" id="cw-mock-preview-voice">preview voice</button>
        </div>
      `;
    }

    _wireSettings(){
      const sel = this.root.querySelector("#cw-mock-voice-sel");
      const speak = this.root.querySelector("#cw-mock-speak-toggle");
      const autoStop = this.root.querySelector("#cw-mock-autostop-toggle");
      const preview = this.root.querySelector("#cw-mock-preview-voice");
      const close = this.root.querySelector("#cw-mock-settings-close");
      if (sel) sel.addEventListener("change", e => {
        this.voicePrefs.voice = e.target.value;
        saveVoicePrefs(this.voicePrefs);
      });
      if (speak) speak.addEventListener("change", e => {
        this.voicePrefs.speakReplies = e.target.checked;
        saveVoicePrefs(this.voicePrefs);
      });
      if (autoStop) autoStop.addEventListener("change", e => {
        this.voicePrefs.autoStop = e.target.checked;
        saveVoicePrefs(this.voicePrefs);
      });
      if (preview) preview.addEventListener("click", async () => {
        try {
          this._stopAudio();
          const audio = await window.ChatLab.voice.speak("Hello — let's start with the case prompt.", this.voicePrefs.voice);
          this.currentAudio = audio;
          await audio.play();
        } catch (err) { console.warn("preview tts failed:", err); }
      });
      if (close) close.addEventListener("click", () => this._closeSettings());
    }

    /* ---------- mic recording ---------- */

    onMicButton(){
      if (this.micState === "listening") {
        this._stopRecording();
      } else if (this.micState === "idle" || this.micState === "error") {
        this.startRecording();
      }
    }

    async startRecording(){
      if (this.streaming) return;
      if (!window.ChatLab?.voice) {
        this._setMicState("error");
        return;
      }
      this._stopAudio();
      this.recordElapsed = 0;
      this.lastTurnAudio = null;

      this.recorder = new window.ChatLab.voice.Recorder({
        autoStop: this.voicePrefs.autoStop !== false,
        onLevel: (rms) => this._renderMicLevel(rms),
        onAutoStop: () => { /* triggered before stop event */ },
        onStop: ({ blob, durationMs }) => this._onRecordingStopped(blob, durationMs),
        onError: (err) => {
          console.warn("recorder error:", err);
          if (this.recordElapsedTimer) {
            clearInterval(this.recordElapsedTimer);
            this.recordElapsedTimer = null;
          }
          this.recorder = null;
          // surface a clearer message for the most common failure (mic permission)
          const msg = (err && err.name === "NotAllowedError")
            ? "mic permission denied — enable in your browser address bar, then tap to retry"
            : "mic error — tap to retry";
          this._micErrorMsg = msg;
          this._setMicState("error");
        },
      });

      this._setMicState("listening");
      this.recordElapsedTimer = setInterval(() => {
        this.recordElapsed += 1;
        const t = this.root.querySelector("#cw-mic-timer");
        if (t) t.textContent = fmtMMSS(this.recordElapsed * 1000);
      }, 1000);

      await this.recorder.start();
    }

    _stopRecording(){
      if (this.recorder) {
        try { this.recorder.stop(); } catch {}
      }
      if (this.recordElapsedTimer) {
        clearInterval(this.recordElapsedTimer);
        this.recordElapsedTimer = null;
      }
    }

    async _onRecordingStopped(blob, durationMs){
      if (this.recordElapsedTimer) { clearInterval(this.recordElapsedTimer); this.recordElapsedTimer = null; }
      this.recorder = null;
      if (!blob || blob.size < 1000) {
        this._setMicState("idle");
        return;
      }
      this.lastTurnAudio = { blob, durationMs };
      this._setMicState("processing");
      try {
        const text = await window.ChatLab.voice.transcribe(blob);
        if (!text || !text.trim()) {
          this._setMicState("idle");
          return;
        }
        this._setMicState("idle");
        // push as user message
        this.pushVisible("user", text);
        this.turnMeta.push({ audioFromVoice: true, durationMs, audioBlob: blob });
        const msgEl = this.appendMsgEl("user", text, false, { audioFromVoice: true, durationMs });
        if (msgEl) this._wireUserVoiceActions(msgEl);
        this.scrollMsgsBottom();
        this.runTurn();
      } catch (err) {
        console.warn("transcription failed:", err);
        this._setMicState("error");
      }
    }

    // Adds re-record / edit buttons to a user voice message. Re-record is
    // only useful for the LAST user message (otherwise we'd have to surgically
    // splice the conversation), so the first call to this on each new user
    // message also strips re-record from any prior ones.
    _wireUserVoiceActions(msgEl){
      // strip re-record from any prior user voice messages
      this.root.querySelectorAll('.cw-msg--user .cw-msg-actions [data-act="rerec"]').forEach(b => b.remove());
      const actions = msgEl.querySelector(".cw-msg-actions");
      if (!actions) return;
      actions.style.display = "flex";
      actions.innerHTML = `
        <button class="cw-mock-msg-btn" data-act="rerec">↻ re-record</button>
      `;
      actions.querySelector('[data-act="rerec"]').addEventListener("click", () => {
        if (this.streaming) return;
        // Pop the last user message (and the AI's empty placeholder if one exists yet)
        // and re-arm the mic. A guard: only if we're in voice mode.
        if (!this.voicePrefs.voiceMode) return;
        // If a turn is mid-stream, abort it.
        if (this.streamCtrl) try { this.streamCtrl.abort(); } catch {}
        // Drop the last user msg + any subsequent assistant entries
        while (this.messages.length && this.messages[this.messages.length - 1].role !== "user") {
          this.messages.pop();
          this.turnMeta.pop();
        }
        // Drop the user message itself
        if (this.messages.length && this.messages[this.messages.length - 1].role === "user") {
          this.messages.pop();
          this.turnMeta.pop();
        }
        // Re-render messages from state
        const box = this.root.querySelector("#cw-mock-msgs");
        if (box) {
          box.innerHTML = "";
          this.messages.forEach((m, i) => {
            if (m.hidden) return;
            const meta = this.turnMeta[i];
            const el = this.appendMsgEl(m.role, m.content, false, meta);
            if (el && m.role === "user" && meta?.audioFromVoice) this._wireUserVoiceActions(el);
          });
        }
        this.scrollMsgsBottom();
        this.startRecording();
      });
    }

    _setMicState(state){
      this.micState = state;
      if (!this.voicePrefs.voiceMode) return; // user toggled to text mode mid-recording
      const zone = this.root.querySelector("#cw-mock-input-zone");
      if (!zone) return;
      zone.innerHTML = this._renderVoiceInputHTML();
      this._wireInputZone();
      if (state !== "error") this._micErrorMsg = null;
    }

    _renderMicLevel(rms){
      const meter = this.root.querySelector("#cw-mic-meter");
      if (!meter) return;
      const bars = meter.querySelectorAll(".cw-mic-bar");
      // map rms (0..50ish) → bar count
      const pct = Math.min(1, rms / 30);
      const litCount = Math.floor(pct * bars.length);
      bars.forEach((b, i) => {
        b.classList.toggle("cw-mic-bar--lit", i < litCount);
      });
    }

    /* ---------- grading ---------- */
    async finishAndGrade(){
      if (this.streaming) return;
      // close out the final block timer
      const start = this.blockStartTimes[this.blockIdx] || Date.now();
      this.blockDurations[this.blockIdx] = Date.now() - start;
      if (this.blockTickTimer) { clearInterval(this.blockTickTimer); this.blockTickTimer = null; }
      this._stopRecording();
      this._stopAudio();
      this.phase = "done";
      this.renderGradingLoading();

      const transcript = this.messages
        .filter(m => !m.hidden)
        .map(m => (m.role === "user" ? "STUDENT" : "INTERVIEWER") + ": " + m.content)
        .join("\n");

      const gradeRequest = [
        { role: "user", content:
          `The mock interview is complete. Based on the transcript and the case ground truth you have, produce a grade as JSON with exactly this shape:
{
  "dimensions": {
    "caseExecution": { "score": 0-5, "note": "one sentence" },
    "communication": { "score": 0-5, "note": "one sentence" },
    "behavioral":    { "score": 0-5, "note": "one sentence" }
  },
  "blocks": {
    "clarify":    "one sentence of what happened",
    "framework":  "...",
    "math":       "...",
    "brainstorm": "...",
    "recommend":  "..."
  },
  "strengths":    ["bullet","bullet"],
  "improvements": ["specific actionable bullet","specific actionable bullet"],
  "overall":      "one short paragraph"
}

TRANSCRIPT
---
${transcript}
---
Only return the JSON object. No prose outside it.`
        }
      ];

      try {
        const grade = await this.streamClient.jsonChat({
          tab: this.tabId,
          mode: "mock",
          mockCaseId: this.selected?.id,
          mockBlock: "recommend",
          messages: gradeRequest,
        });
        this.grade = grade;
        logFinishedMock(this.tabId, this.selected, grade);
        this.renderDone();
      } catch (err) {
        this.renderError(`grading failed: ${err.message || err}`);
      }
    }

    renderGradingLoading(){
      this.root.innerHTML = `<div class="cw-mock-loading">grading your interview…</div>`;
    }

    renderDone(){
      const g = this.grade || {};
      const dims = g.dimensions || {};
      const blocks = g.blocks || {};
      const strengths = Array.isArray(g.strengths) ? g.strengths : [];
      const improvements = Array.isArray(g.improvements) ? g.improvements : [];

      const dimCard = (key, label) => {
        const d = dims[key] || {};
        const score = Math.max(0, Math.min(5, Number(d.score) || 0));
        const pct = (score / 5) * 100;
        return `
          <div class="cw-mock-dim">
            <div class="cw-mock-dim-lbl">${esc(label)}</div>
            <div class="cw-mock-dim-score">${score}<span>/5</span></div>
            <div class="cw-mock-dim-bar"><div class="cw-mock-dim-fill" style="width:${pct}%"></div></div>
            ${d.note ? `<div class="cw-mock-dim-note">${esc(d.note)}</div>` : ""}
          </div>`;
      };

      // Voice analytics — aggregate across all user voice turns
      const voiceTurns = this.turnMeta
        .map((m, i) => ({ meta: m, msg: this.messages[i] }))
        .filter(x => x.meta?.audioFromVoice && x.msg?.role === "user");
      let voiceAnalytics = null;
      if (voiceTurns.length && window.ChatLab?.voice?.analyze) {
        let totalWords = 0, totalDur = 0, totalFillers = 0;
        const fillerBreakdown = {};
        const sigSet = new Set();
        voiceTurns.forEach(({ meta, msg }) => {
          const a = window.ChatLab.voice.analyze(msg.content || "", meta.durationMs || 0);
          totalWords += a.wordCount;
          totalDur += (meta.durationMs || 0);
          totalFillers += a.fillerTotal;
          Object.entries(a.fillers).forEach(([k, n]) => {
            fillerBreakdown[k] = (fillerBreakdown[k] || 0) + n;
          });
          a.signposts.forEach(s => sigSet.add(s));
        });
        const minutes = Math.max(0.05, totalDur / 60000);
        const wpm = Math.round(totalWords / minutes);
        const band = wpm < 110 ? "too slow" : wpm > 175 ? "too fast" : "in target range";
        voiceAnalytics = {
          turns: voiceTurns.length,
          totalDurMs: totalDur,
          wpm,
          band,
          totalFillers,
          fillerBreakdown,
          signposts: Array.from(sigSet),
        };
      }
      // Block timing summary
      const timingHTML = (this.blockDurations.length ? `
        <div class="cw-mock-listblock">
          <div class="cw-mock-listblock-h">block timing</div>
          <ul class="cw-mock-blocknotes">
            ${BLOCKS.map((b, i) => {
              const d = this.blockDurations[i];
              if (d == null) return "";
              return `<li><b>${esc(b.full)}</b> — ${fmtMMSS(d)}</li>`;
            }).join("")}
          </ul>
        </div>` : "");
      const voiceHTML = (voiceAnalytics ? `
        <div class="cw-mock-listblock">
          <div class="cw-mock-listblock-h">voice performance</div>
          <ul class="cw-mock-blocknotes">
            <li><b>pace</b> — ${voiceAnalytics.wpm} wpm (${voiceAnalytics.band}; target 130–160)</li>
            <li><b>filler words</b> — ${voiceAnalytics.totalFillers} total${voiceAnalytics.totalFillers ? ` (${Object.entries(voiceAnalytics.fillerBreakdown).slice(0, 5).map(([k, n]) => `${esc(k)} ×${n}`).join(", ")})` : ""}</li>
            <li><b>structure signposts</b> — ${voiceAnalytics.signposts.length}${voiceAnalytics.signposts.length ? ` (${voiceAnalytics.signposts.slice(0,5).map(esc).join(", ")})` : ""}</li>
            <li><b>airtime</b> — ${fmtMMSS(voiceAnalytics.totalDurMs)} across ${voiceAnalytics.turns} voice turns</li>
          </ul>
        </div>` : "");

      this.root.innerHTML = `
        <div class="cw-mock-donecard">
          <div class="cw-mock-done-hdr">
            <div class="cw-mock-done-title">interview complete</div>
            <div class="cw-mock-done-sub">${esc(this.selected?.title || "")}</div>
          </div>

          <div class="cw-mock-dimrow">
            ${dimCard("caseExecution", "Case execution")}
            ${dimCard("communication", "Communication")}
            ${dimCard("behavioral",    "Behavioral")}
          </div>

          ${g.overall ? `<div class="cw-mock-overall">${esc(g.overall)}</div>` : ""}

          ${strengths.length ? `
            <div class="cw-mock-listblock">
              <div class="cw-mock-listblock-h">strengths</div>
              <ul>${strengths.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
            </div>` : ""}

          ${improvements.length ? `
            <div class="cw-mock-listblock">
              <div class="cw-mock-listblock-h">practice focus</div>
              <ul>${improvements.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
            </div>` : ""}

          ${Object.keys(blocks).length ? `
            <div class="cw-mock-listblock">
              <div class="cw-mock-listblock-h">per-block notes</div>
              <ul class="cw-mock-blocknotes">
                ${BLOCKS.map(b => blocks[b.id] ? `<li><b>${esc(b.full)}</b> — ${esc(blocks[b.id])}</li>` : "").join("")}
              </ul>
            </div>` : ""}

          ${timingHTML}
          ${voiceHTML}

          <div class="cw-mock-actions">
            <button class="cw-iconbtn cw-iconbtn--ghost" data-act="exit">back to chat</button>
            <button class="cw-iconbtn" data-act="another">run another case →</button>
          </div>
        </div>
      `;
      this.root.querySelector('[data-act="exit"]').addEventListener("click", () => this.onExit());
      this.root.querySelector('[data-act="another"]').addEventListener("click", () => {
        this.selected = null;
        this.blockIdx = 0;
        this.messages = [];
        this.grade = null;
        this.phase = "picker";
        this.renderPicker();
      });
    }
  }

  /* =========================================================
     Helpers
     ========================================================= */
  async function loadCases(tabId){
    try {
      // eslint-disable-next-line no-undef
      if (typeof CASES !== "undefined" && Array.isArray(CASES) && CASES.length){
        // eslint-disable-next-line no-undef
        return CASES.slice();
      }
    } catch (_) {}
    const res = await fetch(`/api/content?tab=${encodeURIComponent(tabId)}`);
    if (!res.ok) throw new Error(`content ${res.status}`);
    const pack = await res.json();
    return Array.isArray(pack.CASES) ? pack.CASES : [];
  }

  function uniq(a){ return Array.from(new Set(a)); }
  function countIn(arr, key, v){ return arr.filter(x => x[key] === v).length; }
  function countByOverall(arr, digit){
    return arr.filter(c => String(overallStar(c.difficulty)) === digit).length;
  }
  function overallStar(diff){
    // "2 / 3 / 1" → 2
    const m = String(diff || "").match(/^\s*(\d)/);
    return m ? Number(m[1]) : 0;
  }
  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function tipsFor(blockId){
    return ({
      clarify:    ["Repeat the goal in your own words.", "Ask about constraints: time horizon, budget, success metric.", "Keep it to 2–3 questions — interviewers mark structure over breadth."],
      framework:  ["Pick 3–4 top-level buckets that are MECE.", "Say out loud: 'Here's my structure — then I'll drill into each.'", "Match the case type (profitability vs market entry vs M&A)."],
      math:       ["Ask for exhibits or numbers you need.", "Set up the formula BEFORE you plug numbers in.", "Sanity-check the order of magnitude before announcing."],
      brainstorm: ["Use a quick mini-framework (internal/external, short/long, risks/opportunities).", "Aim for 4–6 distinct ideas.", "Call out the top 2 and why."],
      recommend:  ["Lead with the recommendation in one sentence.", "Support with 2–3 data points from earlier.", "Name 1–2 risks and one next step."],
    })[blockId] || [];
  }
  function fmtMMSS(ms){
    const s = Math.max(0, Math.floor((ms || 0) / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  const VOICE_PREFS_KEY = "rohan.lab.mock.voice.prefs";
  function loadVoicePrefs(){
    try {
      const v = JSON.parse(localStorage.getItem(VOICE_PREFS_KEY) || "{}");
      return Object.assign({
        voiceMode: false,
        speakReplies: true,
        autoStop: true,
        voice: "onyx",
      }, v);
    } catch {
      return { voiceMode: false, speakReplies: true, autoStop: true, voice: "onyx" };
    }
  }
  function saveVoicePrefs(prefs){
    try { localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs)); } catch {}
  }

  function logFinishedMock(tabId, caseData, grade){
    try {
      const log = JSON.parse(localStorage.getItem(MOCKS_LOG_KEY) || "[]");
      log.push({
        tab: tabId,
        caseId: caseData?.id,
        caseTitle: caseData?.title,
        ts: Date.now(),
        dimensions: grade?.dimensions || null,
        overall: grade?.overall || "",
      });
      if (log.length > 200) log.splice(0, log.length - 200);
      localStorage.setItem(MOCKS_LOG_KEY, JSON.stringify(log));
    } catch {}
  }

  window.ChatLab = window.ChatLab || {};
  window.ChatLab.mock = { mount, unmount };
})();
