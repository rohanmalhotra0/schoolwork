/* =========================================================
   rohan.lab — in-notebook AI chat widget + shared store + API client
   Exposes window.ChatLab = { store, client, TABS } so the full-page
   /chat.html can reuse the same session state.
   ========================================================= */
(function(){
  "use strict";

  /* ---------- tab detection ---------- */
  // hasCases flags which tabs have a CASES array in their content pack
  // (→ show the "mock" pill in the chat widget). Only Consulting currently
  // does; if you add cases to another tab, flip the flag here.
  const TABS = {
    "":           { id: "home",       label: "rohan.lab",       scope: "cross-course help",           hasCases: false },
    "consulting": { id: "consulting", label: "darden.lab",      scope: "consulting / case interviews", hasCases: true  },
    "politics":   { id: "politics",   label: "pol500.lab",      scope: "pol-ua 500 exam #2",          hasCases: false },
    "oracle":     { id: "oracle",     label: "epm1080.lab",     scope: "oracle planning cert",        hasCases: false },
    "german":     { id: "german",     label: "deutsch.lab",     scope: "german II k5–k8",             hasCases: false },
    "studytool":  { id: "studytool",  label: "cs202.lab",       scope: "operating systems",           hasCases: false },
  };

  function detectTab(){
    const p = window.location.pathname.toLowerCase();
    if (p.includes("/consulting")) return TABS.consulting;
    if (p.includes("/politics"))   return TABS.politics;
    if (p.includes("/oracle"))     return TABS.oracle;
    if (p.includes("/german"))     return TABS.german;
    if (p.includes("/studytool"))  return TABS.studytool;
    return TABS[""];
  }

  const CURRENT_TAB = detectTab();

  /* ---------- starter prompts per tab + mode ----------
     Only chat and explain show starters. Quiz and mock mount their own
     structured UIs (picker → session), so their starter arrays are dead
     code and have been removed. */
  const STARTERS = {
    consulting: {
      chat:    ["What's the difference between a profitability and growth case?", "Walk me through the 5 building blocks of a case.", "When do I use perpetuity vs simple payback?"],
      explain: ["Explain the M&A framework.", "Explain NPV of a perpetuity.", "Explain the Ansoff growth matrix."],
    },
    politics: {
      chat:    ["Why do people bother to vote at all?", "What's the difference between ethnic fractionalization and polarization?", "Running tally vs partisan identity — how do they differ?"],
      explain: ["Explain Duverger's Law.", "Explain cross-cutting vs reinforcing cleavages.", "Explain the collective action problem."],
    },
    oracle: {
      chat:    ["What's the difference between dimensions and members?", "When should I use a calculation rule vs a business rule?"],
      explain: ["Explain approvals workflow.", "Explain data map vs smart push."],
    },
    german: {
      chat:    ["When do I use Dativ vs Akkusativ with two-way prepositions?", "Perfekt vs Präteritum — when is each used?"],
      explain: ["Explain Relativpronomen case rules.", "Explain Passiv vs Aktiv."],
    },
    studytool: {
      chat:    ["Walk me through fork/exec/pipe.", "How does x86-64 paging work?"],
      explain: ["Explain crash recovery.", "Explain TLB misses."],
    },
    home: {
      chat:    ["What's on rohan.lab?", "Which course should I study first today?"],
      explain: ["Explain how this site is organized."],
    },
  };

  /* =========================================================
     STORE — sessions persisted to localStorage
     Schema:
       sessions: [{ id, tab, mode, title, messages:[{role,content,ts}], createdAt, updatedAt }]
       currentByTab: { [tab]: sessionId }
     ========================================================= */
  const SESSIONS_KEY = "rohan.lab.chat.sessions";
  const CURRENT_KEY  = "rohan.lab.chat.currentByTab";

  const store = {
    listeners: new Set(),
    onChange(fn){ this.listeners.add(fn); return () => this.listeners.delete(fn); },
    _emit(){ this.listeners.forEach(fn => { try { fn(); } catch(e){ console.error(e); } }); },

    _readAll(){
      try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"); }
      catch { return []; }
    },
    _writeAll(arr){
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
      this._emit();
    },
    _readCurrent(){
      try { return JSON.parse(localStorage.getItem(CURRENT_KEY) || "{}"); }
      catch { return {}; }
    },
    _writeCurrent(obj){
      localStorage.setItem(CURRENT_KEY, JSON.stringify(obj));
    },

    allSessions(){
      return this._readAll().sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
    },
    sessionsForTab(tabId){
      return this.allSessions().filter(s => s.tab === tabId);
    },
    getSession(id){
      return this._readAll().find(s => s.id === id) || null;
    },
    currentSessionId(tabId){
      return this._readCurrent()[tabId] || null;
    },
    setCurrentSessionId(tabId, id){
      const cur = this._readCurrent();
      if (id) cur[tabId] = id; else delete cur[tabId];
      this._writeCurrent(cur);
    },

    createSession(tabId, mode){
      const id = "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7);
      const s = {
        id, tab: tabId, mode: mode || "chat",
        title: "new chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const all = this._readAll();
      all.push(s);
      this._writeAll(all);
      this.setCurrentSessionId(tabId, id);
      return s;
    },
    updateSession(id, patch){
      const all = this._readAll();
      const i = all.findIndex(s => s.id === id);
      if (i < 0) return null;
      all[i] = Object.assign({}, all[i], patch, { updatedAt: Date.now() });
      this._writeAll(all);
      return all[i];
    },
    appendMessage(id, msg){
      const s = this.getSession(id);
      if (!s) return null;
      const messages = (s.messages || []).concat([Object.assign({ ts: Date.now() }, msg)]);
      // auto-title from first user message
      let title = s.title;
      if (title === "new chat" && msg.role === "user"){
        title = msg.content.slice(0, 42).replace(/\s+/g, " ").trim() || title;
      }
      return this.updateSession(id, { messages, title });
    },
    replaceLastAssistant(id, content){
      const s = this.getSession(id);
      if (!s) return null;
      const msgs = (s.messages || []).slice();
      for (let i = msgs.length - 1; i >= 0; i--){
        if (msgs[i].role === "assistant"){ msgs[i] = Object.assign({}, msgs[i], { content }); break; }
      }
      return this.updateSession(id, { messages: msgs });
    },
    deleteSession(id){
      const all = this._readAll().filter(s => s.id !== id);
      this._writeAll(all);
      const cur = this._readCurrent();
      for (const t of Object.keys(cur)) if (cur[t] === id) delete cur[t];
      this._writeCurrent(cur);
    },
    clearAll(){
      this._writeAll([]);
      this._writeCurrent({});
    },

    // Ensure a session exists for this tab and return it. If one exists, return it.
    getOrCreateForTab(tabId, mode){
      const existing = this.currentSessionId(tabId);
      if (existing){
        const s = this.getSession(existing);
        if (s) return s;
      }
      return this.createSession(tabId, mode);
    },
  };

  /* =========================================================
     CLIENT — streams from /api/chat via SSE
     ========================================================= */
  const client = {
    async streamChat({ tab, messages, mode, focus, mockCaseId, mockBlock, onDelta, onDone, onError, signal }){
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab, messages, mode, focus, mockCaseId, mockBlock }),
        signal,
      });
      if (!res.ok){
        const txt = await res.text().catch(() => "");
        onError && onError(new Error(`HTTP ${res.status}: ${txt || "chat failed"}`));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true){
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        // parse SSE: lines, blank line terminates event
        const parts = buf.split("\n\n");
        buf = parts.pop(); // keep incomplete tail
        for (const block of parts){
          const lines = block.split("\n");
          let evt = "message", data = "";
          for (const ln of lines){
            if (ln.startsWith("event:")) evt = ln.slice(6).trim();
            else if (ln.startsWith("data:")) data += ln.slice(5).trim();
          }
          if (!data) continue;
          let parsed; try { parsed = JSON.parse(data); } catch { continue; }
          if (evt === "delta" && parsed.text) onDelta && onDelta(parsed.text);
          else if (evt === "done") onDone && onDone(parsed);
          else if (evt === "error") onError && onError(new Error(parsed.message || "server error"));
        }
      }
      onDone && onDone({ ok: true });
    },

    async jsonChat({ tab, messages, mode, focus, mockCaseId, mockBlock, signal }){
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab, messages, mode, focus, mockCaseId, mockBlock, format: "json" }),
        signal,
      });
      if (!res.ok){
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt || "json chat failed"}`);
      }
      return res.json();
    },
  };

  /* =========================================================
     WIDGET — floating button + popup panel
     ========================================================= */
  let el = {};      // cached dom refs
  let session = null;
  let streaming = false;
  let streamCtrl = null;

  function initWidget(){
    // don't double-init
    if (document.getElementById("cw-fab")) return;
    // skip on full chat page (it owns the whole viewport)
    if (document.body.dataset.chatMode === "full") return;

    const fab = document.createElement("button");
    fab.id = "cw-fab";
    fab.className = "cw-fab";
    fab.title = "study assistant";
    fab.setAttribute("aria-label", "open study assistant");
    fab.innerHTML = `<span class="cw-fab-tape"></span><span>AI</span>`;
    document.body.appendChild(fab);

    const panel = document.createElement("div");
    panel.className = "cw-panel";
    panel.innerHTML = `
      <div class="cw-head">
        <div style="flex:1;min-width:0">
          <div class="cw-title" id="cw-title">${CURRENT_TAB.label} · study assistant</div>
          <span class="cw-scope">${CURRENT_TAB.scope}</span>
        </div>
        <button class="cw-iconbtn" id="cw-new" title="new chat">+ new</button>
        <button class="cw-iconbtn" id="cw-expand" title="open full page">⤢</button>
        <button class="cw-iconbtn" id="cw-close" title="close">×</button>
      </div>
      <div class="cw-modes" id="cw-modes"></div>
      <div class="cw-msgs" id="cw-msgs"></div>
      <div class="cw-quiz" id="cw-quiz"></div>
      <div class="cw-mock" id="cw-mock"></div>
      <div class="cw-suggest" id="cw-suggest"></div>
      <div class="cw-input-row" id="cw-input-row">
        <textarea class="cw-textarea" id="cw-input" rows="1" placeholder="ask about ${escapeHtml(CURRENT_TAB.scope)}…"></textarea>
        <button class="cw-send" id="cw-send">send</button>
      </div>
      <div class="cw-foot" id="cw-foot">enter · send  ·  shift-enter · newline</div>
    `;
    document.body.appendChild(panel);

    el = {
      fab,
      panel,
      title:   panel.querySelector("#cw-title"),
      newBtn:  panel.querySelector("#cw-new"),
      expand:  panel.querySelector("#cw-expand"),
      close:   panel.querySelector("#cw-close"),
      modes:   panel.querySelector("#cw-modes"),
      msgs:    panel.querySelector("#cw-msgs"),
      quiz:    panel.querySelector("#cw-quiz"),
      mock:    panel.querySelector("#cw-mock"),
      suggest: panel.querySelector("#cw-suggest"),
      inputRow:panel.querySelector("#cw-input-row"),
      input:   panel.querySelector("#cw-input"),
      send:    panel.querySelector("#cw-send"),
      foot:    panel.querySelector("#cw-foot"),
    };

    renderModeBar();

    fab.addEventListener("click", openPanel);
    el.close.addEventListener("click", closePanel);
    el.newBtn.addEventListener("click", () => {
      session = store.createSession(CURRENT_TAB.id, session?.mode || "chat");
      renderSession();
    });
    el.expand.addEventListener("click", () => {
      // pass session + tab via URL params
      const q = new URLSearchParams({ tab: CURRENT_TAB.id });
      if (session) q.set("s", session.id);
      window.location.href = "/chat.html?" + q.toString();
    });
    el.send.addEventListener("click", onSend);
    el.input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey){
        e.preventDefault();
        onSend();
      }
    });
    el.input.addEventListener("input", autosize);

    // sync across tabs/pages via storage events
    window.addEventListener("storage", e => {
      if (e.key === SESSIONS_KEY && session){
        session = store.getSession(session.id) || session;
        renderSession();
      }
    });

    // load session on demand (lazy — don't create until user opens)
  }

  function openPanel(){
    el.fab.classList.add("cw-fab--open");
    el.panel.classList.add("cw-panel--open");
    if (!session){
      session = store.getOrCreateForTab(CURRENT_TAB.id, "chat");
    }
    renderSession();
    setTimeout(() => { if (!isStructuredMode()) el.input?.focus(); }, 50);
  }
  function closePanel(){
    el.fab.classList.remove("cw-fab--open");
    el.panel.classList.remove("cw-panel--open");
    if (streamCtrl) streamCtrl.abort();
  }

  function renderModeBar(){
    const modes = [
      ["chat",    "chat"],
      ["quiz",    "quiz me"],
      ["explain", "explain"],
      ["mock",    "mock"],
    ];
    el.modes.innerHTML = "";
    modes.forEach(([id, label]) => {
      // Mock only makes sense on tabs that have cases — hide it elsewhere.
      if (id === "mock" && !CURRENT_TAB.hasCases) return;
      const b = document.createElement("button");
      b.className = "cw-mode" + (session?.mode === id ? " cw-mode--active" : "");
      b.textContent = label;
      b.addEventListener("click", () => switchMode(id));
      el.modes.appendChild(b);
    });
  }

  let quizInstance = null;
  let mockInstance = null;

  function isQuizMode(){ return session?.mode === "quiz"; }
  function isMockMode(){ return session?.mode === "mock"; }
  function isStructuredMode(){ return isQuizMode() || isMockMode(); }

  function setSurfaceForMode(){
    const quiz = isQuizMode();
    const mock = isMockMode();
    const structured = quiz || mock;
    // swap visible sections
    el.msgs.style.display    = structured ? "none" : "";
    el.suggest.style.display = structured ? "none" : "";
    el.inputRow.style.display= structured ? "none" : "";
    el.foot.style.display    = structured ? "none" : "";

    // Quiz
    if (quiz){
      if (!quizInstance) mountQuiz();
    } else if (quizInstance){
      window.ChatLab?.quiz?.unmount?.(quizInstance);
      quizInstance = null;
      el.quiz.classList.remove("cw-quiz--mounted");
      el.quiz.innerHTML = "";
    }

    // Mock
    if (mock){
      if (!mockInstance) mountMock();
    } else if (mockInstance){
      window.ChatLab?.mock?.unmount?.(mockInstance);
      mockInstance = null;
      el.mock.classList.remove("cw-mock--mounted");
      el.mock.innerHTML = "";
    }
  }

  function mountQuiz(){
    if (!window.ChatLab?.quiz){
      el.quiz.classList.add("cw-quiz--mounted");
      el.quiz.innerHTML = `<div class="cw-quiz-err">quiz module didn't load — check that /assets/quiz.js is included on this page.</div>`;
      return;
    }
    quizInstance = window.ChatLab.quiz.mount(el.quiz, {
      tabId:    CURRENT_TAB.id,
      tabLabel: CURRENT_TAB.label,
      surface:  "widget",
      onExit:   () => switchMode("chat"),
      onAskExplain: (term) => {
        switchMode("explain");
        // pre-fill a request
        el.input.value = `Explain "${term}" in depth — definition, intuition, one example, and common traps.`;
        onSend();
      },
    });
  }

  function mountMock(){
    if (!window.ChatLab?.mock){
      el.mock.classList.add("cw-mock--mounted");
      el.mock.innerHTML = `<div class="cw-mock-err">mock module didn't load — check that /assets/mock.js is included on this page.</div>`;
      return;
    }
    mockInstance = window.ChatLab.mock.mount(el.mock, {
      tabId:    CURRENT_TAB.id,
      tabLabel: CURRENT_TAB.label,
      surface:  "widget",
      streamClient: client,
      onExit:   () => switchMode("chat"),
      // Honor any case pre-selected by askAI() before mount.
      initialCaseId: window.ChatLab?._consumePendingMockCaseId?.(),
    });
  }

  function switchMode(id){
    if (!session) session = store.getOrCreateForTab(CURRENT_TAB.id, id);
    store.updateSession(session.id, { mode: id });
    session = store.getSession(session.id);
    renderSession();
    setTimeout(() => { if (!isStructuredMode()) el.input?.focus(); }, 50);
  }

  function renderSession(){
    renderModeBar();
    setSurfaceForMode();
    if (!isStructuredMode()){
      renderMessages();
      renderSuggestions();
    }
  }

  function renderMessages(){
    el.msgs.innerHTML = "";
    if (!session || !session.messages?.length){ return; }
    session.messages.forEach(m => appendMsgEl(m.role, m.content));
    scrollToBottom();
  }

  function renderSuggestions(){
    el.suggest.innerHTML = "";
    if (!session || session.messages?.length) return;
    const mode = session.mode || "chat";
    const tabKey = CURRENT_TAB.id in STARTERS ? CURRENT_TAB.id : "home";
    const picks = (STARTERS[tabKey]?.[mode] || STARTERS.home.chat).slice(0, 3);
    const h = document.createElement("div");
    h.className = "cw-suggest-h";
    h.textContent = "try";
    el.suggest.appendChild(h);
    picks.forEach(txt => {
      const b = document.createElement("button");
      b.className = "cw-suggest-btn";
      b.textContent = txt;
      b.addEventListener("click", () => {
        el.input.value = txt;
        onSend();
      });
      el.suggest.appendChild(b);
    });
  }

  function appendMsgEl(role, content){
    const wrap = document.createElement("div");
    wrap.className = "cw-msg cw-msg--" + (role === "user" ? "user" : (role === "error" ? "err" : "ai"));
    const roleTxt = role === "user" ? "you" : (role === "error" ? "error" : "tutor");
    wrap.innerHTML = `<div class="cw-msg-role">${roleTxt}</div><div class="cw-msg-body"></div>`;
    wrap.querySelector(".cw-msg-body").textContent = content;
    el.msgs.appendChild(wrap);
    return wrap;
  }

  function scrollToBottom(){ el.msgs.scrollTop = el.msgs.scrollHeight; }
  function autosize(){
    el.input.style.height = "auto";
    el.input.style.height = Math.min(160, el.input.scrollHeight) + "px";
  }

  async function onSend(){
    if (streaming) return;
    const text = el.input.value.trim();
    if (!text) return;
    if (!session) session = store.getOrCreateForTab(CURRENT_TAB.id, "chat");

    store.appendMessage(session.id, { role: "user", content: text });
    session = store.getSession(session.id);
    el.input.value = ""; autosize();
    el.suggest.innerHTML = "";
    appendMsgEl("user", text);
    scrollToBottom();

    // placeholder AI bubble
    const aiEl = appendMsgEl("assistant", "");
    aiEl.classList.add("cw-msg--typing");
    const bodyEl = aiEl.querySelector(".cw-msg-body");
    let buf = "";
    streaming = true;
    el.send.disabled = true;
    streamCtrl = new AbortController();

    // reserve AI slot in store
    store.appendMessage(session.id, { role: "assistant", content: "" });
    session = store.getSession(session.id);

    try {
      await client.streamChat({
        tab: CURRENT_TAB.id,
        mode: session.mode || "chat",
        messages: session.messages.slice(0, -1), // omit the reserved empty assistant slot
        signal: streamCtrl.signal,
        onDelta: (txt) => {
          buf += txt;
          bodyEl.textContent = buf;
          scrollToBottom();
        },
        onDone: () => {
          aiEl.classList.remove("cw-msg--typing");
          store.replaceLastAssistant(session.id, buf);
          session = store.getSession(session.id);
        },
        onError: (err) => {
          aiEl.classList.remove("cw-msg--typing");
          aiEl.classList.remove("cw-msg--ai");
          aiEl.classList.add("cw-msg--err");
          aiEl.querySelector(".cw-msg-role").textContent = "error";
          bodyEl.textContent = err.message || "something broke — check the /api/chat logs on Vercel";
          store.replaceLastAssistant(session.id, `[error: ${err.message}]`);
          session = store.getSession(session.id);
        },
      });
    } finally {
      streaming = false;
      streamCtrl = null;
      el.send.disabled = false;
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  /* =========================================================
     askAI() — one-call entry point used by content pages to jump the
     student into the chat widget pre-populated. Called by small
     "ask AI" icons scattered across vocab cards, cases, frameworks, etc.
     Shapes:
       askAI({ mode: "explain", focus: "NPV", prompt: "Explain NPV…" })
       askAI({ mode: "mock",    caseId: 7 })
       askAI({ mode: "chat",    prompt: "open a discussion about…" })
     ========================================================= */
  let pendingMockCaseId = null;

  function askAI(opts){
    const o = opts || {};
    const mode = o.mode || "chat";

    // Ensure panel + session exist
    if (!el.panel) return; // widget not initialized (e.g., on /chat.html)
    if (!session) session = store.getOrCreateForTab(CURRENT_TAB.id, mode);
    if (session.mode !== mode){
      store.updateSession(session.id, { mode });
      session = store.getSession(session.id);
    }
    openPanel();

    if (mode === "mock"){
      // If mock is already mounted, tell it to start this case now; otherwise
      // stash the id so mountMock() picks it up.
      pendingMockCaseId = o.caseId || null;
      if (mockInstance && typeof mockInstance.startCaseById === "function" && pendingMockCaseId){
        const id = pendingMockCaseId;
        pendingMockCaseId = null;
        mockInstance.startCaseById(id);
      }
      return;
    }

    // explain / chat: pre-fill the input, auto-send if a prompt was given
    const promptText = o.prompt || (o.focus ? `Explain "${o.focus}" in depth — definition, intuition, one example, and common traps.` : "");
    if (!promptText) return;
    // wait for renderSession to have swapped to chat UI, then send
    setTimeout(() => {
      if (!el.input) return;
      el.input.value = promptText;
      onSend();
    }, 60);
  }

  /* ---------- expose for full-page + init ---------- */
  window.ChatLab = Object.assign(window.ChatLab || {}, {
    store, client, TABS, CURRENT_TAB, STARTERS, escapeHtml,
    askAI,
    // expose a getter so mock mount can consume the pending caseId
    _consumePendingMockCaseId(){ const id = pendingMockCaseId; pendingMockCaseId = null; return id; },
  });

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
