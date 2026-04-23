/* =========================================================
   rohan.lab — /chat.html full-page controller
   Reuses window.ChatLab.store + .client from chat-widget.js.
   URL params: ?tab=<id>&s=<sessionId>
   ========================================================= */
(function(){
  "use strict";

  const { store, client, TABS, STARTERS, escapeHtml } = window.ChatLab;

  // DOM refs
  const el = {
    newBtn:  document.getElementById("cp-new"),
    tabPick: document.getElementById("cp-tab-pick"),
    list:    document.getElementById("cp-list"),
    title:   document.getElementById("cp-title"),
    scope:   document.getElementById("cp-scope"),
    modes:   document.getElementById("cp-modes"),
    msgs:    document.getElementById("cp-msgs"),
    quiz:    document.getElementById("cp-quiz"),
    mock:    document.getElementById("cp-mock"),
    inputWrap:document.getElementById("cp-input-wrap"),
    input:   document.getElementById("cp-input"),
    send:    document.getElementById("cp-send"),
    clearAll:document.getElementById("cp-clear-all"),
  };

  // State
  const TAB_LIST = Object.values(TABS);
  const qs = new URLSearchParams(window.location.search);
  let activeTab = resolveTab(qs.get("tab")) || TAB_LIST[0];
  let activeSession = qs.get("s") ? store.getSession(qs.get("s")) : null;

  let streaming = false;
  let streamCtrl = null;
  let quizInstance = null;
  let mockInstance = null;

  function isQuizMode(){ return activeSession?.mode === "quiz"; }
  function isMockMode(){ return activeSession?.mode === "mock"; }
  function isStructuredMode(){ return isQuizMode() || isMockMode(); }

  function setSurfaceForMode(){
    const quiz = isQuizMode();
    const mock = isMockMode();
    const structured = quiz || mock;

    el.msgs.style.display      = structured ? "none" : "";
    el.inputWrap.style.display = structured ? "none" : "";

    // Quiz lifecycle
    if (quizInstance && (!quiz || quizInstance._tabId !== activeTab.id)){
      window.ChatLab?.quiz?.unmount?.(quizInstance);
      quizInstance = null;
      el.quiz.classList.remove("cw-quiz--mounted");
      el.quiz.innerHTML = "";
    }
    if (quiz && !quizInstance){
      mountQuiz();
      if (quizInstance) quizInstance._tabId = activeTab.id;
    }

    // Mock lifecycle
    if (mockInstance && (!mock || mockInstance._tabId !== activeTab.id)){
      window.ChatLab?.mock?.unmount?.(mockInstance);
      mockInstance = null;
      el.mock.classList.remove("cw-mock--mounted");
      el.mock.innerHTML = "";
    }
    if (mock && !mockInstance){
      mountMock();
      if (mockInstance) mockInstance._tabId = activeTab.id;
    }
  }

  function mountQuiz(){
    if (!window.ChatLab?.quiz){
      el.quiz.classList.add("cw-quiz--mounted");
      el.quiz.innerHTML = `<div class="cw-quiz-err">quiz module didn't load.</div>`;
      return;
    }
    quizInstance = window.ChatLab.quiz.mount(el.quiz, {
      tabId: activeTab.id,
      tabLabel: activeTab.label,
      surface: "page",
      onExit: () => switchModeFromStructured("chat"),
      onAskExplain: (term) => {
        switchModeFromStructured("explain");
        el.input.value = `Explain "${term}" in depth — definition, intuition, one example, and common traps.`;
        onSend();
      },
    });
  }

  function mountMock(){
    if (!window.ChatLab?.mock){
      el.mock.classList.add("cw-mock--mounted");
      el.mock.innerHTML = `<div class="cw-mock-err">mock module didn't load.</div>`;
      return;
    }
    mockInstance = window.ChatLab.mock.mount(el.mock, {
      tabId: activeTab.id,
      tabLabel: activeTab.label,
      surface: "page",
      streamClient: client,
      onExit: () => switchModeFromStructured("chat"),
    });
  }

  function switchModeFromStructured(id){
    if (!activeSession) activeSession = store.createSession(activeTab.id, id);
    store.updateSession(activeSession.id, { mode: id });
    activeSession = store.getSession(activeSession.id);
    renderAll();
    setTimeout(() => el.input?.focus(), 50);
  }

  function resolveTab(id){
    if (!id) return null;
    return TAB_LIST.find(t => t.id === id) || null;
  }

  /* ---------- render: sidebar pieces ---------- */
  function renderTabPicker(){
    el.tabPick.innerHTML = "";
    TAB_LIST.forEach(t => {
      const b = document.createElement("button");
      b.className = "cp-tab-chip" + (t.id === activeTab.id ? " cp-tab-chip--active" : "");
      b.textContent = t.label.replace(".lab", "");
      b.title = t.scope;
      b.addEventListener("click", () => {
        activeTab = t;
        renderTabPicker();
        renderSessionList();
      });
      el.tabPick.appendChild(b);
    });
  }

  function renderSessionList(){
    el.list.innerHTML = "";
    const sessions = store.sessionsForTab(activeTab.id);
    if (!sessions.length){
      const empty = document.createElement("div");
      empty.className = "cp-group-h";
      empty.style.opacity = "0.7";
      empty.textContent = "no chats yet for " + activeTab.label;
      el.list.appendChild(empty);
      return;
    }
    const groups = groupByRecency(sessions);
    for (const [label, arr] of groups){
      if (!arr.length) continue;
      const h = document.createElement("div");
      h.className = "cp-group-h";
      h.textContent = label;
      el.list.appendChild(h);
      arr.forEach(s => el.list.appendChild(renderItem(s)));
    }
  }

  function groupByRecency(arr){
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const yStart = todayStart.getTime() - day;
    const wStart = todayStart.getTime() - 7 * day;
    const today=[], yest=[], week=[], older=[];
    arr.forEach(s => {
      const t = s.updatedAt || s.createdAt || now;
      if (t >= todayStart.getTime()) today.push(s);
      else if (t >= yStart) yest.push(s);
      else if (t >= wStart) week.push(s);
      else older.push(s);
    });
    return [["today", today], ["yesterday", yest], ["this week", week], ["older", older]];
  }

  function renderItem(s){
    const wrap = document.createElement("div");
    wrap.className = "cp-item" + (activeSession?.id === s.id ? " cp-item--active" : "");
    wrap.innerHTML = `
      <div class="cp-item-title">${escapeHtml(s.title || "new chat")}</div>
      <div class="cp-item-meta">${escapeHtml(s.mode || "chat")} · ${(s.messages || []).length} msg</div>
      <button class="cp-item-del" title="delete session">×</button>
    `;
    wrap.addEventListener("click", e => {
      if (e.target.classList.contains("cp-item-del")) return;
      activeSession = s;
      store.setCurrentSessionId(s.tab, s.id);
      const t = TAB_LIST.find(x => x.id === s.tab);
      if (t) activeTab = t;
      renderAll();
    });
    wrap.querySelector(".cp-item-del").addEventListener("click", e => {
      e.stopPropagation();
      if (!confirm("Delete this chat?")) return;
      store.deleteSession(s.id);
      if (activeSession?.id === s.id) activeSession = null;
      renderAll();
    });
    return wrap;
  }

  /* ---------- render: main pane ---------- */
  function renderHead(){
    const label = activeSession
      ? (activeSession.title || "new chat")
      : "pick or start a chat";
    el.title.textContent = label;
    el.scope.textContent = activeTab.label + " · " + activeTab.scope;
    renderModeBar();
  }

  function renderModeBar(){
    const modes = [["chat","chat"],["quiz","quiz me"],["explain","explain"],["mock","mock"]];
    el.modes.innerHTML = "";
    modes.forEach(([id,label]) => {
      if (id === "mock" && !activeTab.hasCases) return; // hide mock pill on case-less tabs
      const b = document.createElement("button");
      b.className = "cw-mode" + ((activeSession?.mode || "chat") === id ? " cw-mode--active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        if (!activeSession) activeSession = store.createSession(activeTab.id, id);
        store.updateSession(activeSession.id, { mode: id });
        activeSession = store.getSession(activeSession.id);
        renderAll();
      });
      el.modes.appendChild(b);
    });
  }

  function renderMessages(){
    el.msgs.innerHTML = "";
    if (!activeSession || !activeSession.messages?.length){
      renderEmpty();
      return;
    }
    activeSession.messages.forEach(m => appendMsgEl(m.role, m.content));
    scrollToBottom();
  }

  function renderEmpty(){
    const wrap = document.createElement("div");
    wrap.className = "cp-empty";
    const mode = activeSession?.mode || "chat";
    const tabKey = STARTERS[activeTab.id] ? activeTab.id : "home";
    const picks = (STARTERS[tabKey]?.[mode] || STARTERS.home.chat).slice(0, 6);
    wrap.innerHTML = `
      <h1>start a chat — ${escapeHtml(activeTab.label)}</h1>
      <p>tutor mode: <b>${escapeHtml(mode)}</b> · ${escapeHtml(activeTab.scope)}</p>
      <div class="cp-starter-grid"></div>
    `;
    const grid = wrap.querySelector(".cp-starter-grid");
    picks.forEach(txt => {
      const b = document.createElement("button");
      b.className = "cp-starter";
      b.textContent = txt;
      b.addEventListener("click", () => {
        el.input.value = txt;
        onSend();
      });
      grid.appendChild(b);
    });
    el.msgs.appendChild(wrap);
  }

  function appendMsgEl(role, content){
    const m = document.createElement("div");
    m.className = "cw-msg cw-msg--" + (role === "user" ? "user" : (role === "error" ? "err" : "ai"));
    const roleTxt = role === "user" ? "you" : (role === "error" ? "error" : "tutor");
    m.innerHTML = `<div class="cw-msg-role">${roleTxt}</div><div class="cw-msg-body"></div>`;
    m.querySelector(".cw-msg-body").textContent = content;
    el.msgs.appendChild(m);
    return m;
  }

  function scrollToBottom(){ el.msgs.scrollTop = el.msgs.scrollHeight; }

  function renderAll(){
    renderTabPicker();
    renderSessionList();
    renderHead();
    setSurfaceForMode();
    if (!isStructuredMode()) renderMessages();
  }

  /* ---------- actions ---------- */
  function newChat(){
    activeSession = store.createSession(activeTab.id, activeSession?.mode || "chat");
    renderAll();
    setTimeout(() => el.input.focus(), 50);
  }

  async function onSend(){
    if (streaming) return;
    const text = el.input.value.trim();
    if (!text) return;
    if (!activeSession){
      activeSession = store.createSession(activeTab.id, "chat");
    }
    store.appendMessage(activeSession.id, { role: "user", content: text });
    activeSession = store.getSession(activeSession.id);
    el.input.value = ""; autosize();

    // replace empty state with persisted messages (includes the user msg we just added)
    renderMessages();
    const aiEl = appendMsgEl("assistant", "");
    aiEl.classList.add("cw-msg--typing");
    const bodyEl = aiEl.querySelector(".cw-msg-body");
    scrollToBottom();

    // reserve slot
    store.appendMessage(activeSession.id, { role: "assistant", content: "" });
    activeSession = store.getSession(activeSession.id);

    streaming = true;
    el.send.disabled = true;
    streamCtrl = new AbortController();
    let buf = "";
    try {
      await client.streamChat({
        tab: activeTab.id,
        mode: activeSession.mode || "chat",
        messages: activeSession.messages.slice(0, -1),
        signal: streamCtrl.signal,
        onDelta: (t) => { buf += t; bodyEl.textContent = buf; scrollToBottom(); },
        onDone: () => {
          aiEl.classList.remove("cw-msg--typing");
          store.replaceLastAssistant(activeSession.id, buf);
          activeSession = store.getSession(activeSession.id);
          renderHead();
          renderSessionList();
        },
        onError: (err) => {
          aiEl.classList.remove("cw-msg--typing", "cw-msg--ai");
          aiEl.classList.add("cw-msg--err");
          aiEl.querySelector(".cw-msg-role").textContent = "error";
          bodyEl.textContent = err.message || "chat failed";
          store.replaceLastAssistant(activeSession.id, `[error: ${err.message}]`);
          activeSession = store.getSession(activeSession.id);
        },
      });
    } finally {
      streaming = false;
      streamCtrl = null;
      el.send.disabled = false;
    }
  }

  function autosize(){
    el.input.style.height = "auto";
    el.input.style.height = Math.min(220, el.input.scrollHeight) + "px";
  }

  /* ---------- events ---------- */
  el.newBtn.addEventListener("click", newChat);
  el.send.addEventListener("click", onSend);
  el.input.addEventListener("input", autosize);
  el.input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); onSend(); }
  });
  el.clearAll.addEventListener("click", () => {
    if (!confirm("Delete ALL chat sessions across every course? This cannot be undone.")) return;
    store.clearAll();
    activeSession = null;
    renderAll();
  });

  // cross-tab sync
  window.addEventListener("storage", () => {
    if (activeSession) activeSession = store.getSession(activeSession.id);
    renderAll();
  });

  // kickoff: if no session picked, try current-for-tab; else show empty state
  if (!activeSession){
    const curId = store.currentSessionId(activeTab.id);
    if (curId) activeSession = store.getSession(curId);
  }
  renderAll();
})();
