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
// Used by flashcards (below) AND by the Learn tab.
function filterPool(filter, cards){
  const src = cards || CARDS;
  if (filter === 'all') return src.slice();
  if (filter === 'GR' || filter === 'VO') return src.filter(c => c.type === filter);
  return src.filter(c => c.ch === filter);
}

/* ========================= FLASHCARDS (linear) =========================
   Plain prev/flip/next deck — no mastery, no requeue, no undo. The
   shared StudyLab.flashcards module added a K/D/U flow that read as
   confusing here, so this tab uses its own minimal loop. */
const fcEls = {
  card:    document.getElementById('flashcard'),
  front:   document.getElementById('card-front'),
  back:    document.getElementById('card-back'),
  tag:     document.getElementById('card-tag'),
  note:    document.getElementById('card-note'),
  prev:    document.getElementById('prev-card'),
  flip:    document.getElementById('flip-card'),
  next:    document.getElementById('next-card'),
  counter: document.getElementById('card-counter'),
  shuffle: document.getElementById('shuffle'),
};
let fcDeck = [];
let fcIdx = 0;

function fcCurrentFilter(){
  const r = document.querySelector('input[name="deck"]:checked');
  return r ? r.value : 'all';
}
function fcShuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fcRebuild(){
  fcDeck = fcShuffle(filterPool(fcCurrentFilter()));
  fcIdx = 0;
  fcRender();
}
function fcRender(){
  if (fcEls.card) fcEls.card.classList.remove('flipped');
  if (!fcDeck.length) {
    if (fcEls.front)   fcEls.front.textContent = 'no cards in this filter';
    if (fcEls.back)    fcEls.back.textContent  = '';
    if (fcEls.note)    fcEls.note.textContent  = '';
    if (fcEls.tag)     fcEls.tag.style.display = 'none';
    if (fcEls.counter) fcEls.counter.textContent = '0 / 0';
    return;
  }
  const c = fcDeck[fcIdx];
  if (fcEls.front) fcEls.front.textContent = c.front || '';
  if (fcEls.back)  fcEls.back.textContent  = c.back  || '';
  if (fcEls.note)  fcEls.note.textContent  = c.note  || '';
  if (fcEls.tag) {
    const label = c.ch + ' · ' + (c.type === 'GR' ? 'grammar' : 'vocab');
    fcEls.tag.textContent = label;
    fcEls.tag.style.display = 'inline-block';
  }
  if (fcEls.counter) fcEls.counter.textContent = (fcIdx + 1) + ' / ' + fcDeck.length;
}
function fcAdvance(step){
  if (!fcDeck.length) return;
  fcIdx = (fcIdx + step + fcDeck.length) % fcDeck.length;
  fcRender();
}
function fcFlip(){ if (fcEls.card) fcEls.card.classList.toggle('flipped'); }

if (fcEls.card)    fcEls.card.addEventListener('click', fcFlip);
if (fcEls.flip)    fcEls.flip.addEventListener('click',    e => { e.stopPropagation(); fcFlip(); });
if (fcEls.prev)    fcEls.prev.addEventListener('click',    e => { e.stopPropagation(); fcAdvance(-1); });
if (fcEls.next)    fcEls.next.addEventListener('click',    e => { e.stopPropagation(); fcAdvance(1); });
if (fcEls.shuffle) fcEls.shuffle.addEventListener('click', fcRebuild);
document.querySelectorAll('input[name="deck"]').forEach(r => {
  r.addEventListener('change', fcRebuild);
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.sheet--active')?.id !== 'cards') return;
  if (e.target.matches('input, textarea')) return;
  if (e.code === 'Space')      { e.preventDefault(); fcFlip(); }
  else if (e.key === 'ArrowLeft')  fcAdvance(-1);
  else if (e.key === 'ArrowRight') fcAdvance(1);
});
fcRebuild();

/* ============================= LEARN (unified) =============================
   One MC engine that drills three sources — flashcards, verb conjugations,
   and quiz items — and normalizes each into {prompt, label, answer,
   distractors, note}. Pick a mode, pick a filter, click through. Right →
   mastered. Wrong → requeue + show explanation.
*/
const LEARN_MODE_LABEL = {
  cards: 'pick the meaning',
  kj:    'pick the form',
  quiz:  'pick the answer',
};
let learnMode = 'cards';
const learnFilters = { cards:'all', kj:'all', quiz:'all' };
let learnItems = [];
let learnQueue = [];
let learnCurrent = null;
let learnAnswered = false;
let learnMastered = 0;

const learnStartBtn = document.getElementById('learn-start-btn');
const learnRestart  = document.getElementById('learn-restart');
const learnNext     = document.getElementById('learn-mc-next');
const lfRows = {
  cards: document.getElementById('lf-cards'),
  kj:    document.getElementById('lf-kj'),
  quiz:  document.getElementById('lf-quiz'),
};

document.querySelectorAll('input[name="lmode"]').forEach(r => {
  r.addEventListener('change', () => {
    learnMode = r.value;
    Object.entries(lfRows).forEach(([k, el]) => {
      if (el) el.style.display = (k === learnMode) ? 'flex' : 'none';
    });
  });
});
document.querySelectorAll('input[name="lf-cards-r"]').forEach(r => {
  r.addEventListener('change', () => { learnFilters.cards = r.value; });
});
document.querySelectorAll('input[name="lf-kj-r"]').forEach(r => {
  r.addEventListener('change', () => { learnFilters.kj = r.value; });
});
document.querySelectorAll('input[name="lf-quiz-r"]').forEach(r => {
  r.addEventListener('change', () => { learnFilters.quiz = r.value; });
});

learnStartBtn.addEventListener('click', startLearn);
learnRestart.addEventListener('click', () => {
  document.getElementById('learn-done').style.display = 'none';
  document.getElementById('learn-start').style.display = 'block';
});
learnNext.addEventListener('click', serveLearn);

function buildLearnItems(){
  const filter = learnFilters[learnMode];
  if (learnMode === 'cards') {
    return filterPool(filter).map(c => normalizeCard(c));
  }
  if (learnMode === 'kj') {
    const src = (filter === 'all') ? KONJUGATION : KONJUGATION.filter(x => x.mode === filter);
    return src.map(it => normalizeKj(it));
  }
  // quiz
  const src = (filter === 'all') ? QUIZ : QUIZ.filter(q => q.set === filter);
  return src.map(q => normalizeQuiz(q));
}

function normalizeCard(c){
  const sameBucket = CARDS.filter(x => x.back !== c.back && x.ch === c.ch && x.type === c.type);
  const fallback   = CARDS.filter(x => x.back !== c.back);
  const pool = sameBucket.length >= 3 ? sameBucket : fallback;
  const distractors = pickDistinct(pool.map(x => x.back), 3, [c.back]);
  return {
    prompt:      c.front,
    label:       c.ch + ' · ' + (c.type === 'GR' ? 'grammar' : 'vocab'),
    answer:      c.back,
    distractors,
    note:        c.note || '',
  };
}

function normalizeKj(it){
  const sameMode = KONJUGATION.filter(x => x.mode === it.mode && x.a !== it.a);
  const fallback = KONJUGATION.filter(x => x.a !== it.a);
  const pool = sameMode.length >= 3 ? sameMode : fallback;
  const distractors = pickDistinct(pool.map(x => x.a), 3, [it.a]);
  return {
    prompt:      it.q,
    label:       it.mode,
    answer:      it.a,
    distractors,
    note:        it.note || '',
  };
}

function normalizeQuiz(q){
  // Multi-select questions get collapsed to "pick the most-correct option" —
  // QUIZ stores the indices of every right answer in q.a; we use the first
  // as the canonical correct answer and treat the rest as distractors that
  // happen to also be defensible (the explanation tells the full story).
  const correctIdx = (q.type === 'multi') ? q.a[0] : q.a;
  const answer = q.opts[correctIdx];
  const distractors = q.opts.filter((_, i) => i !== correctIdx);
  return {
    prompt:      q.q,
    label:       q.tag,
    answer,
    distractors: distractors.slice(0, 3),
    note:        q.explain || '',
  };
}

function pickDistinct(pool, n, exclude){
  const seen = new Set(exclude);
  const out = [];
  const src = pool.slice();
  while (out.length < n && src.length) {
    const i = Math.floor(Math.random() * src.length);
    const v = src.splice(i, 1)[0];
    if (!seen.has(v)) { out.push(v); seen.add(v); }
  }
  return out;
}

function startLearn(){
  const items = buildLearnItems();
  if (!items.length) return;
  learnItems = items.map(it => ({ data: it, mastered: false }));
  for (let i = learnItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [learnItems[i], learnItems[j]] = [learnItems[j], learnItems[i]];
  }
  learnQueue = [...learnItems];
  learnMastered = 0;
  document.getElementById('learn-start').style.display = 'none';
  document.getElementById('learn-done').style.display = 'none';
  document.getElementById('learn-session').style.display = 'block';
  document.getElementById('learn-mode-label').textContent = LEARN_MODE_LABEL[learnMode];
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
  showLearnMC();
}

function showLearnMC(){
  const it = learnCurrent.data;
  document.getElementById('learn-mc-ch').textContent = it.label;
  document.getElementById('learn-mc-q').textContent = it.prompt;
  const opts = [it.answer, ...it.distractors].sort(() => Math.random() - 0.5);
  const div = document.getElementById('learn-mc-opts');
  div.innerHTML = '';
  opts.forEach(text => {
    const b = document.createElement('button');
    b.className = 'learn-opt';
    b.textContent = text;
    b.onclick = () => checkLearnMC(b, text === it.answer, it.answer);
    div.appendChild(b);
  });
  const fb = document.getElementById('learn-mc-fb');
  fb.className = 'check-feedback';
  fb.textContent = '';
  document.getElementById('learn-mc-note').textContent = '';
  learnNext.style.display = 'none';
}

function checkLearnMC(btn, correct, right){
  if (learnAnswered) return;
  learnAnswered = true;
  document.querySelectorAll('#learn-mc-opts .learn-opt').forEach(b => {
    if (b.textContent === right) b.classList.add(correct ? 'correct' : 'reveal');
    b.disabled = true;
  });
  const fb = document.getElementById('learn-mc-fb');
  if (correct) {
    btn.classList.add('correct');
    if (!learnCurrent.mastered) {
      learnCurrent.mastered = true;
      learnMastered++;
      updateLearnProg();
    }
    fb.className = 'check-feedback ok';
    fb.textContent = '✓ richtig — gemeistert.';
  } else {
    btn.classList.add('wrong');
    learnQueue.push(learnCurrent);
    fb.className = 'check-feedback bad';
    fb.textContent = '✗ falsch — richtig: ' + right + '. Karte kommt zurück.';
  }
  const noteEl = document.getElementById('learn-mc-note');
  noteEl.textContent = learnCurrent.data.note || '';
  learnNext.style.display = 'inline-block';
}

function endLearn(){
  document.getElementById('learn-session').style.display = 'none';
  document.getElementById('learn-done').style.display = 'block';
  document.getElementById('learn-done-txt').textContent =
    'Du hast alle ' + learnItems.length + ' Karten gemeistert. Viel Erfolg auf der Prüfung!';
}

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

/* ============================= GRAMMAR ============================= */
const grammarList = document.getElementById('grammar-list');
let grammarFilter = 'all';

function renderGrammar(){
  const items = grammarFilter === 'all'
    ? GRAMMAR
    : GRAMMAR.filter(g => g.ch === grammarFilter);

  if (!items.length){
    grammarList.innerHTML = `<p style="font-family:'Spectral',serif;color:var(--pencil);font-style:italic;margin-top:14px">No tables for this filter.</p>`;
    return;
  }

  grammarList.innerHTML = items.map(g => {
    const header = g.rows[0];
    const body = g.rows.slice(1);
    return `
      <div class="gr-block">
        <div class="gr-title">
          ${g.ch ? `<span class="gr-ch gr-ch--${g.ch.toLowerCase()}">${escapeHtml(g.ch)}</span>` : ''}
          ${escapeHtml(g.title)}
        </div>
        ${g.sub ? `<div class="gr-sub">${escapeHtml(g.sub)}</div>` : ''}
        <table>
          <tr>${header.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
          ${body.map(row => `<tr>${row.map((cell, i) => {
            const isHl = i > 0 && cell && /^[-a-zäöüßA-ZÄÖÜ]{1,20}$/.test(cell) && !/ /.test(cell);
            const isEx = cell && / /.test(cell) && /[.!?]/.test(cell);
            const cls = isEx ? 'ex' : (isHl && i === 1 ? 'hl' : '');
            return `<td${cls ? ` class="${cls}"` : ''}>${escapeHtml(cell)}</td>`;
          }).join('')}</tr>`).join('')}
        </table>
      </div>
    `;
  }).join('');
}
document.querySelectorAll('input[name="gfilter"]').forEach(r => {
  r.addEventListener('change', () => { grammarFilter = r.value; renderGrammar(); });
});
renderGrammar();

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
