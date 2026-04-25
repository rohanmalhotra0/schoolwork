/* =====================================================================
   deutsch.lab — interactions
   ===================================================================== */

/* ---------- tab switching ---------- */
const tabs = document.querySelectorAll('.file-tabs .tab');
const sheets = document.querySelectorAll('.sheet');
tabs.forEach(t => {
  if (t.dataset.target === 'home') return;
  t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('tab--active'));
    sheets.forEach(s => s.classList.remove('sheet--active'));
    t.classList.add('tab--active');
    const sec = document.getElementById(t.dataset.target);
    if (sec) sec.classList.add('sheet--active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight' && !isCardsActive()) cycleTab(1);
  else if (e.key === 'ArrowLeft' && !isCardsActive()) cycleTab(-1);
});
function cycleTab(dir){
  const navTabs = [...tabs].filter(t => t.dataset.target !== 'home');
  const active = document.querySelector('.tab--active');
  const i = navTabs.indexOf(active);
  const next = (i + dir + navTabs.length) % navTabs.length;
  navTabs[next].click();
}
function isCardsActive(){ return document.getElementById('cards').classList.contains('sheet--active'); }

/* =========================== FLASHCARDS ===========================
   Delegated to the shared session module. German has a custom filter
   (chapters K5-K8 plus GR/VO categories) and uses front/back/note/ch
   instead of term/def/hint/cat, so we pass field mappings.
*/
// Shared filter helper: chapter chips (K5-K8) + GR/VO type filters.
// Reused by the flashcards module (via filterToPool) AND by the Learn
// tab below — Learn previously called an undefined `filterPool` and
// silently ReferenceError'd, freezing the start button.
function filterPool(filter, cards){
  const src = cards || CARDS;
  if (filter === 'all') return src.slice();
  if (filter === 'GR' || filter === 'VO') return src.filter(c => c.type === filter);
  return src.filter(c => c.ch === filter);
}

window.StudyLab?.flashcards?.init({
  cards:       CARDS,
  fields:      { term: 'front', def: 'back', hint: 'note', cat: 'ch' },
  weightKey:   'deutsch.card.weights',
  masteredKey: 'deutsch.card.mastered',
  weightKeyFor: c => c.ch + ':' + c.front,
  catLabel:     c => c.ch + ' · ' + (c.type === 'GR' ? 'grammar' : 'vocab'),
  filterToPool: (filter, cards) => filterPool(filter, cards),
});

/* ============================= LEARN ============================= */
let learnFilter = 'all';
let learnItems = [];
let learnQueue = [];
let learnCurrent = null;
let learnAnswered = false;
let learnMastered = 0;

document.querySelectorAll('input[name="lfilter"]').forEach(r => {
  r.addEventListener('change', () => { learnFilter = r.value; });
});

document.getElementById('learn-start-btn').addEventListener('click', startLearn);
document.getElementById('learn-restart').addEventListener('click', () => {
  document.getElementById('learn-done').style.display = 'none';
  document.getElementById('learn-start').style.display = 'block';
});

function startLearn(){
  const src = filterPool(learnFilter);
  if (!src.length) return;
  learnItems = src.map(c => ({ card:c, stage:0, mastered:false }));
  for (let i = learnItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [learnItems[i], learnItems[j]] = [learnItems[j], learnItems[i]];
  }
  learnQueue = [...learnItems];
  learnMastered = 0;
  document.getElementById('learn-start').style.display = 'none';
  document.getElementById('learn-done').style.display = 'none';
  document.getElementById('learn-session').style.display = 'block';
  updateLearnProg();
  serveLearn();
}

function updateLearnProg(){
  const t = learnItems.length;
  const pct = t ? Math.round(learnMastered / t * 100) : 0;
  document.getElementById('learn-prog-fill').style.width = pct + '%';
  document.getElementById('learn-prog-txt').textContent = learnMastered + ' / ' + t + ' mastered';
}

function serveLearn(){
  if (!learnQueue.length) {
    if (learnItems.every(x => x.mastered)) { endLearn(); return; }
    learnQueue = learnItems.filter(x => !x.mastered);
    for (let i = learnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [learnQueue[i], learnQueue[j]] = [learnQueue[j], learnQueue[i]];
    }
  }
  learnCurrent = learnQueue.shift();
  learnAnswered = false;
  if (learnCurrent.stage === 0) showLearnMC(); else showLearnWrite();
}

function showLearnMC(){
  document.getElementById('learn-mc').style.display = 'block';
  document.getElementById('learn-write').style.display = 'none';
  const c = learnCurrent.card;
  document.getElementById('learn-mc-ch').textContent = c.ch + ' · ' + (c.type === 'GR' ? 'grammar' : 'vocab');
  document.getElementById('learn-mc-q').textContent = c.front;
  // Prefer distractors from same chapter+type so options stay topical.
  const sameBucket = CARDS.filter(x => x.back !== c.back && x.ch === c.ch && x.type === c.type);
  const fallback   = CARDS.filter(x => x.back !== c.back);
  const pool = sameBucket.length >= 3 ? sameBucket : fallback;
  const wrongs = [];
  while (wrongs.length < 3 && pool.length > wrongs.length) {
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (!wrongs.find(w => w.back === r.back)) wrongs.push(r);
  }
  const opts = [c, ...wrongs].sort(() => Math.random() - 0.5);
  const div = document.getElementById('learn-mc-opts');
  div.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'learn-opt';
    b.textContent = o.back;
    b.onclick = () => checkMC(b, o.back === c.back, c.back);
    div.appendChild(b);
  });
  const fb = document.getElementById('learn-mc-fb');
  fb.className = 'check-feedback';
  fb.textContent = '';
  document.getElementById('learn-mc-next').style.display = 'none';
}

function checkMC(btn, correct, right){
  if (learnAnswered) return;
  learnAnswered = true;
  document.querySelectorAll('#learn-mc-opts .learn-opt').forEach(b => {
    if (b.textContent === right) b.classList.add(correct ? 'correct' : 'reveal');
  });
  const fb = document.getElementById('learn-mc-fb');
  if (correct) {
    btn.classList.add('correct');
    learnCurrent.stage = 1;
    fb.className = 'check-feedback ok';
    fb.textContent = '✓ richtig. Jetzt bitte eintippen.';
  } else {
    btn.classList.add('wrong');
    learnQueue.push(learnCurrent);
    fb.className = 'check-feedback bad';
    fb.textContent = '✗ falsch — richtig: ' + right + '. Card kommt zurück.';
  }
  document.getElementById('learn-mc-next').style.display = 'inline-block';
}

document.getElementById('learn-mc-next').addEventListener('click', serveLearn);

function showLearnWrite(){
  document.getElementById('learn-mc').style.display = 'none';
  document.getElementById('learn-write').style.display = 'block';
  const c = learnCurrent.card;
  document.getElementById('learn-wr-ch').textContent = c.ch + ' · ' + (c.type === 'GR' ? 'grammar' : 'vocab');
  document.getElementById('learn-wr-q').textContent = c.front;
  const inp = document.getElementById('learn-wr-input');
  inp.value = '';
  inp.style.borderColor = '';
  const fb = document.getElementById('learn-wr-fb');
  fb.className = 'check-feedback';
  fb.textContent = '';
  document.getElementById('learn-wr-next').style.display = 'none';
  setTimeout(() => inp.focus(), 50);
}

document.getElementById('learn-wr-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkWrite();
});
document.getElementById('learn-wr-check').addEventListener('click', checkWrite);
document.getElementById('learn-wr-skip').addEventListener('click', () => {
  learnQueue.push(learnCurrent);
  serveLearn();
});
document.getElementById('learn-wr-next').addEventListener('click', serveLearn);

function checkWrite(){
  if (learnAnswered) return;
  const inp = document.getElementById('learn-wr-input');
  const typed = inp.value.trim().toLowerCase();
  const right = learnCurrent.card.back.toLowerCase();
  const core = right.replace(/\(.*?\)/g, '').trim();
  const ok = !!typed && (
    typed === right ||
    typed === core ||
    (core.includes(typed) && typed.length > 3) ||
    (typed.length >= 4 && core.split(/[ ,/]+/).some(w => w && typed.includes(w) && w.length > 3))
  );
  learnAnswered = true;
  const fb = document.getElementById('learn-wr-fb');
  if (ok) {
    learnCurrent.mastered = true;
    learnMastered++;
    inp.style.borderColor = 'var(--olive)';
    fb.className = 'check-feedback ok';
    fb.textContent = '✓ richtig. Karte gemeistert.';
    updateLearnProg();
  } else {
    learnCurrent.stage = 0;
    learnQueue.push(learnCurrent);
    inp.style.borderColor = 'var(--red)';
    fb.className = 'check-feedback bad';
    fb.textContent = '✗ Antwort: ' + learnCurrent.card.back + '. Card kommt zurück.';
  }
  document.getElementById('learn-wr-next').style.display = 'inline-block';
}

function endLearn(){
  document.getElementById('learn-session').style.display = 'none';
  document.getElementById('learn-done').style.display = 'block';
  document.getElementById('learn-done-txt').textContent =
    'Du hast alle ' + learnItems.length + ' Karten gemeistert. Viel Erfolg auf der Prüfung!';
}

/* ============================= QUIZ ============================= */
const quizArea = document.getElementById('quiz-area');
const quizScore = document.getElementById('quiz-score');

function renderQuiz(setKey){
  const items = (setKey === 'all') ? QUIZ : QUIZ.filter(q => q.set === setKey);
  quizArea.innerHTML = items.map((q, idx) => renderQuizItem(q, idx)).join('');
  quizScore.classList.add('hidden');

  quizArea.querySelectorAll('.q-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      gradeOne(items[id], id);
    });
  });

  const gradeAll = document.createElement('button');
  gradeAll.className = 'mini-btn';
  gradeAll.textContent = 'grade all';
  gradeAll.style.marginBottom = '20px';
  gradeAll.addEventListener('click', () => {
    let correct = 0;
    items.forEach((q, i) => { if (gradeOne(q, i)) correct++; });
    quizScore.classList.remove('hidden');
    const total = items.length;
    quizScore.innerHTML = `grade: <b>${correct} / ${total}</b> · ${Math.round(100*correct/total)}%<br>
      <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--pencil)">
      red = missed — reread the explanations under each item.</span>`;
    quizScore.scrollIntoView({ behavior: 'smooth' });
  });
  quizArea.prepend(gradeAll);
}

function renderQuizItem(q, id){
  const name = `q-${id}`;
  let opts;
  if (q.type === 'multi') {
    opts = q.opts.map((o,i) => `
      <label><input type="checkbox" name="${name}" value="${i}"> ${escapeHtml(o)}</label>
    `).join('');
  } else {
    opts = q.opts.map((o,i) => `
      <label><input type="radio" name="${name}" value="${i}"> ${escapeHtml(o)}</label>
    `).join('');
  }
  return `
    <div class="q-item" id="q-item-${id}">
      <div class="q-head">
        <span class="q-tag">${escapeHtml(q.tag)}</span>
        <span>Q${id + 1}</span>
      </div>
      <div class="q-prompt">${escapeHtml(q.q)}</div>
      <div class="q-opts">${opts}</div>
      <button class="mini-btn q-submit" data-id="${id}" style="margin-top:10px">submit</button>
      <div class="q-feedback" id="q-fb-${id}"></div>
      <div class="q-explain" id="q-ex-${id}" style="display:none">${escapeHtml(q.explain || '')}</div>
    </div>
  `;
}

function gradeOne(q, id){
  const fb = document.getElementById('q-fb-' + id);
  const ex = document.getElementById('q-ex-' + id);
  let correct = false;

  if (q.type === 'multi') {
    const picked = [...document.querySelectorAll(`input[name="q-${id}"]:checked`)]
      .map(x => parseInt(x.value, 10)).sort((a,b)=>a-b);
    const want = [...q.a].sort((a,b)=>a-b);
    correct = picked.length === want.length && picked.every((v,i) => v === want[i]);
  } else {
    const p = document.querySelector(`input[name="q-${id}"]:checked`);
    if (p) correct = parseInt(p.value, 10) === q.a;
  }

  fb.className = 'q-feedback show ' + (correct ? 'ok' : 'bad');
  fb.textContent = correct ? '✓ richtig' : '✗ falsch';
  ex.style.display = 'block';
  return correct;
}

document.querySelectorAll('.quiz-picker .tabline').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.quiz-picker .tabline').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderQuiz(b.dataset.qset);
  });
});
document.querySelector('.quiz-picker .tabline[data-qset="all"]').classList.add('active');
renderQuiz('all');

/* ========================= ACTIVE RECALL =========================
   Open-ended prompts grouped by topic — accordion w/ revealable hint.
   Mirrors the Politics "Essays" tab pattern. */
const recallList = document.getElementById('recall-list');
const recallFilters = document.getElementById('recall-filters');
let recallFilter = 'all';

function recallTopic(cat){
  // Group by leading "K8 · …" / "Verben · …" / "Schreiben · …" etc.
  return (cat.split('·')[0] || cat).trim();
}

function renderRecall(){
  const items = (recallFilter === 'all')
    ? ACTIVE_RECALL
    : ACTIVE_RECALL.filter(r => recallTopic(r.cat) === recallFilter);
  recallList.innerHTML = '';
  items.forEach((e, i) => {
    const item = document.createElement('div');
    item.className = 'essay-item';
    const head = document.createElement('button');
    head.className = 'essay-head';
    head.innerHTML = `
      <span class="essay-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="essay-q">
        <span class="essay-cat">${escapeHtml(e.cat)}</span>
        ${escapeHtml(e.q)}
      </span>
      <span class="essay-toggle">show hint ▾</span>
    `;
    const body = document.createElement('div');
    body.className = 'essay-body';
    const hint = document.createElement('div');
    hint.className = 'essay-hint';
    hint.textContent = e.hint;
    body.appendChild(hint);
    head.addEventListener('click', () => {
      const open = body.classList.toggle('open');
      head.querySelector('.essay-toggle').textContent = open ? 'hide hint ▴' : 'show hint ▾';
    });
    item.appendChild(head);
    item.appendChild(body);
    recallList.appendChild(item);
  });
}

function renderRecallFilters(){
  const topics = ['all', ...new Set(ACTIVE_RECALL.map(r => recallTopic(r.cat)))];
  recallFilters.innerHTML = '';
  topics.forEach(t => {
    const id = 'rf-' + t.replace(/\s+/g, '-').toLowerCase();
    const wrap = document.createElement('label');
    wrap.className = 'deck-chip';
    wrap.innerHTML = `<input type="radio" name="rfilter" id="${id}" value="${escapeHtml(t)}"${t === 'all' ? ' checked' : ''}>${t === 'all' ? 'All' : escapeHtml(t)}`;
    wrap.querySelector('input').addEventListener('change', () => {
      recallFilter = t;
      renderRecall();
    });
    recallFilters.appendChild(wrap);
  });
}
renderRecallFilters();
renderRecall();

/* ========================= KONJUGATION DRILL =========================
   One-prompt-at-a-time multiple-choice drill, queue-based.
   Filter by mode (Perfekt / Konj II / Modal Konj II / Partizip I / Futur).
   Distractors are pulled from items in the same mode so every wrong
   option is itself a real conjugated form — the contrast is what teaches.
   Card is mastered after one correct click; misses requeue. */
const kjEls = {
  start:    document.getElementById('kj-start'),
  startBtn: document.getElementById('kj-start-btn'),
  session:  document.getElementById('kj-session'),
  done:     document.getElementById('kj-done'),
  doneTxt:  document.getElementById('kj-done-txt'),
  restart:  document.getElementById('kj-restart'),
  progFill: document.getElementById('kj-prog-fill'),
  progTxt:  document.getElementById('kj-prog-txt'),
  mode:     document.getElementById('kj-mode'),
  prompt:   document.getElementById('kj-prompt'),
  opts:     document.getElementById('kj-opts'),
  skip:     document.getElementById('kj-skip'),
  fb:       document.getElementById('kj-fb'),
  note:     document.getElementById('kj-note'),
  next:     document.getElementById('kj-next'),
};
let kjMode = 'all';
let kjItems = [];
let kjQueue = [];
let kjCurrent = null;
let kjAnswered = false;
let kjMastered = 0;

document.querySelectorAll('input[name="kjmode"]').forEach(r => {
  r.addEventListener('change', () => { kjMode = r.value; });
});
kjEls.startBtn.addEventListener('click', startKj);
kjEls.restart.addEventListener('click', () => {
  kjEls.done.style.display = 'none';
  kjEls.start.style.display = 'block';
});
kjEls.skip.addEventListener('click', () => {
  if (!kjCurrent) return;
  kjQueue.push(kjCurrent);
  serveKj();
});
kjEls.next.addEventListener('click', serveKj);

function startKj(){
  const src = (kjMode === 'all')
    ? KONJUGATION.slice()
    : KONJUGATION.filter(x => x.mode === kjMode);
  if (!src.length) return;
  kjItems = src.map(it => ({ item: it, mastered: false }));
  for (let i = kjItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kjItems[i], kjItems[j]] = [kjItems[j], kjItems[i]];
  }
  kjQueue = [...kjItems];
  kjMastered = 0;
  kjEls.start.style.display = 'none';
  kjEls.done.style.display = 'none';
  kjEls.session.style.display = 'block';
  updateKjProg();
  serveKj();
}

function updateKjProg(){
  const t = kjItems.length;
  const pct = t ? Math.round(kjMastered / t * 100) : 0;
  kjEls.progFill.style.width = pct + '%';
  kjEls.progTxt.textContent = kjMastered + ' / ' + t + ' mastered';
}

function serveKj(){
  if (!kjQueue.length) {
    if (kjItems.every(x => x.mastered)) { endKj(); return; }
    kjQueue = kjItems.filter(x => !x.mastered);
    for (let i = kjQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kjQueue[i], kjQueue[j]] = [kjQueue[j], kjQueue[i]];
    }
  }
  kjCurrent = kjQueue.shift();
  kjAnswered = false;
  const it = kjCurrent.item;
  kjEls.mode.textContent = it.mode;
  kjEls.prompt.textContent = it.q;
  kjEls.fb.className = 'check-feedback';
  kjEls.fb.textContent = '';
  kjEls.note.textContent = '';
  kjEls.next.style.display = 'none';
  renderKjOpts(it);
}

function renderKjOpts(it){
  // Same-mode distractors first; fall back to any other item if the mode is small.
  const sameMode = KONJUGATION.filter(x => x.mode === it.mode && x.a !== it.a);
  const fallback = KONJUGATION.filter(x => x.a !== it.a);
  const pool = sameMode.length >= 3 ? sameMode : fallback;
  const wrongs = [];
  const guard = new Set([it.a]);
  while (wrongs.length < 3 && pool.length) {
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (!guard.has(r.a)) { wrongs.push(r.a); guard.add(r.a); }
    if (guard.size > pool.length + 1) break;
  }
  const opts = [it.a, ...wrongs].sort(() => Math.random() - 0.5);
  kjEls.opts.innerHTML = '';
  opts.forEach(text => {
    const b = document.createElement('button');
    b.className = 'learn-opt';
    b.textContent = text;
    b.addEventListener('click', () => checkKjMC(b, text === it.a, it.a));
    kjEls.opts.appendChild(b);
  });
}

function checkKjMC(btn, correct, right){
  if (kjAnswered || !kjCurrent) return;
  kjAnswered = true;
  const it = kjCurrent.item;
  kjEls.opts.querySelectorAll('.learn-opt').forEach(b => {
    if (b.textContent === right) b.classList.add(correct ? 'correct' : 'reveal');
    b.disabled = true;
  });
  if (correct) {
    btn.classList.add('correct');
    if (!kjCurrent.mastered) {
      kjCurrent.mastered = true;
      kjMastered++;
      updateKjProg();
    }
    kjEls.fb.className = 'check-feedback ok';
    kjEls.fb.textContent = '✓ richtig — gemeistert.';
  } else {
    btn.classList.add('wrong');
    kjQueue.push(kjCurrent);
    kjEls.fb.className = 'check-feedback bad';
    kjEls.fb.textContent = '✗ falsch — richtig: ' + right + '. Karte kommt zurück.';
  }
  if (it.note) kjEls.note.textContent = it.note;
  kjEls.next.style.display = 'inline-block';
}

function endKj(){
  kjEls.session.style.display = 'none';
  kjEls.done.style.display = 'block';
  kjEls.doneTxt.textContent =
    'Du hast alle ' + kjItems.length + ' Formen gemeistert. Gut gemacht!';
}

/* ============================= GRAMMAR ============================= */
const grammarList = document.getElementById('grammar-list');
grammarList.innerHTML = GRAMMAR.map(g => {
  const header = g.rows[0];
  const body = g.rows.slice(1);
  return `
    <div class="gr-block">
      <div class="gr-title">${escapeHtml(g.title)}</div>
      ${g.sub ? `<div class="gr-sub">${escapeHtml(g.sub)}</div>` : ''}
      <table>
        <tr>${header.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        ${body.map(row => `<tr>${row.map((cell, i) => {
          // highlight first column of header-like tables, and middle columns that look like forms
          const isHl = i > 0 && cell && /^[-a-zäöüßA-ZÄÖÜ]{1,20}$/.test(cell) && !/ /.test(cell);
          const isEx = cell && / /.test(cell) && /[.!?]/.test(cell);
          const cls = isEx ? 'ex' : (isHl && i === 1 ? 'hl' : '');
          return `<td${cls ? ` class="${cls}"` : ''}>${escapeHtml(cell)}</td>`;
        }).join('')}</tr>`).join('')}
      </table>
    </div>
  `;
}).join('');

/* ============================= VOCAB ============================= */
const vocabGrid = document.getElementById('vocab-grid');
const vocabSearch = document.getElementById('vocab-search');
let vocabFilter = 'all';

function renderVocab(){
  const f = (vocabSearch.value || '').trim().toLowerCase();
  const items = VOCAB.filter(v => {
    if (vocabFilter !== 'all' && v.ch !== vocabFilter) return false;
    if (!f) return true;
    return v.de.toLowerCase().includes(f) ||
           v.en.toLowerCase().includes(f) ||
           (v.note || '').toLowerCase().includes(f);
  });
  vocabGrid.innerHTML = items.map(v => `
    <div class="vocab-card">
      <div class="vocab-de">${escapeHtml(v.de)}</div>
      <div class="vocab-en">${escapeHtml(v.en)}</div>
      ${v.note ? `<div class="vocab-note">${escapeHtml(v.note)}</div>` : ''}
    </div>
  `).join('');
}
document.querySelectorAll('input[name="vfilter"]').forEach(r => {
  r.addEventListener('change', () => { vocabFilter = r.value; renderVocab(); });
});
vocabSearch.addEventListener('input', renderVocab);
renderVocab();

/* ============================= K8 ============================= */
const k8 = document.getElementById('k8-content');
k8.innerHTML = K8_SECTIONS.map(s => `
  <div class="k8-section">
    <h3>${escapeHtml(s.title)}</h3>
    <div class="k8-grid">
      ${s.items.map(it => `
        <div class="k8-item${s.flavor === 'purple' ? ' purple' : ''}">
          <div class="k8-de">${escapeHtml(it.de)}</div>
          <div class="k8-en">${escapeHtml(it.en)}</div>
          ${it.note ? `<div class="k8-note">${escapeHtml(it.note)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
`).join('');

/* ============================= util ============================= */
function escapeHtml(s){
  return (s ?? '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
