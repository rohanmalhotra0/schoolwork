/* =====================================================================
   cs202.lab — interactions
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
    document.getElementById(t.dataset.target).classList.add('sheet--active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

/* arrow-key tab nav */
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight' && !isFlashActive() && !isCardFocus(e)) {
    cycleTab(1);
  } else if (e.key === 'ArrowLeft' && !isFlashActive() && !isCardFocus(e)) {
    cycleTab(-1);
  }
});
function cycleTab(dir){
  const navTabs = [...tabs].filter(t => t.dataset.target !== 'home');
  const active = document.querySelector('.tab--active');
  const i = navTabs.indexOf(active);
  const next = (i + dir + navTabs.length) % navTabs.length;
  navTabs[next].click();
}
function isFlashActive(){
  return document.getElementById('cards').classList.contains('sheet--active');
}
function isCardFocus(){ return false; }

/* ============================= LEARN ============================= */
const moduleGrid = document.querySelector('#learn .module-grid');
const learnStage = document.getElementById('learn-stage');
const learnDone = new Set(JSON.parse(localStorage.getItem('cs202.learn.done') || '[]'));

function renderModules(){
  moduleGrid.innerHTML = '';
  MODULES.forEach(m => {
    const card = document.createElement('div');
    card.className = 'mod-card' + (learnDone.has(m.id) ? ' mod--done' : '');
    card.innerHTML = `
      <div class="mod-num">module ${m.num}</div>
      <div class="mod-title">${m.title}</div>
      <div class="mod-est">${m.est}</div>
    `;
    card.addEventListener('click', () => openModule(m));
    moduleGrid.appendChild(card);
  });
}
renderModules();

function openModule(m){
  learnStage.classList.remove('hidden');
  learnStage.innerHTML = `
    <h3 style="font-family:Caveat,cursive;font-size:30px;margin:0 0 4px;color:var(--red);">
      ${m.num} · ${m.title}
    </h3>
    <p class="kicker" style="margin-top:0">${m.est}</p>
    ${m.steps.map(s => `
      <div class="learn-step">
        <h3>${escapeHtml(s.h)}</h3>
        ${(s.p||[]).map(pp => `<p>${escapeHtml(pp).replaceAll('\n','<br>')}</p>`).join('')}
        ${s.code ? `<pre>${escapeHtml(s.code)}</pre>` : ''}
      </div>
    `).join('')}
    <div class="check-box">
      <h4>self-check</h4>
      <p style="font-family:'IBM Plex Mono',monospace;font-size:14px;margin:0 0 6px">${escapeHtml(m.check.q)}</p>
      <div class="check-opts">
        ${m.check.opts.map((o,i) => `
          <label><input type="radio" name="check-${m.id}" value="${i}"> ${escapeHtml(o)}</label>
        `).join('')}
      </div>
      <button class="mini-btn" id="check-submit" style="margin-top:10px">submit</button>
      <div class="check-feedback" id="check-fb"></div>
    </div>
  `;
  learnStage.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('check-submit').addEventListener('click', () => {
    const picked = learnStage.querySelector(`input[name="check-${m.id}"]:checked`);
    const fb = document.getElementById('check-fb');
    if (!picked) { fb.textContent = '— pick one first —'; fb.className='check-feedback bad'; return; }
    const val = parseInt(picked.value, 10);
    if (val === m.check.a) {
      fb.innerHTML = '✓ correct. ' + escapeHtml(m.check.why);
      fb.className = 'check-feedback ok';
      learnDone.add(m.id);
      localStorage.setItem('cs202.learn.done', JSON.stringify([...learnDone]));
      renderModules();
    } else {
      fb.innerHTML = '✗ not quite. ' + escapeHtml(m.check.why);
      fb.className = 'check-feedback bad';
    }
  });
}

/* ============================= FLASHCARDS =============================
   Delegated to the shared session module. CS202 uses front/back/deck
   fields and keys weights by deck:front.
*/
window.StudyLab?.flashcards?.init({
  cards:       CARDS,
  fields:      { term: 'front', def: 'back', hint: 'note', cat: 'deck' },
  weightKey:   'cs202.card.weights',
  masteredKey: 'cs202.card.mastered',
  weightKeyFor: c => c.deck + ':' + c.front,
});

/* ============================= QUIZ ============================= */
const quizArea = document.getElementById('quiz-area');
const quizScore = document.getElementById('quiz-score');

function renderQuiz(setKey){
  const items = (setKey === 'all') ? QUIZ : QUIZ.filter(q => q.set === setKey);
  quizArea.innerHTML = items.map((q, idx) => renderQuizItem(q, idx)).join('');
  quizScore.classList.add('hidden');

  quizArea.querySelectorAll('.q-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      gradeOne(items[id], id);
    });
  });

  // grade-all button
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
      missed items now have red feedback — reread the explanations.</span>`;
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
    const picked = [...document.querySelectorAll(`input[name="q-${id}"]:checked`)].map(x => parseInt(x.value,10)).sort();
    const want = [...q.a].sort();
    correct = picked.length === want.length && picked.every((v,i) => v === want[i]);
  } else {
    const p = document.querySelector(`input[name="q-${id}"]:checked`);
    if (p) correct = parseInt(p.value,10) === q.a;
  }

  fb.className = 'q-feedback show ' + (correct ? 'ok' : 'bad');
  fb.textContent = correct ? '✓ correct' : '✗ not quite';
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
// default: all
const defaultQuiz = document.querySelector('.quiz-picker .tabline[data-qset="all"]');
defaultQuiz.classList.add('active');
renderQuiz('all');

/* ============================= PRACTICE ============================= */
const practiceList = document.getElementById('practice-list');
practiceList.innerHTML = PROBS.map((p, i) => `
  <div class="prob">
    <div class="prob-head">
      <span class="prob-num">${p.num}</span>
      <span class="prob-src">${escapeHtml(p.src)}</span>
    </div>
    <div class="prob-body">
      ${renderMixed(p.q)}
    </div>
    <div class="prob-tools">
      <button class="mini-btn" data-idx="${i}">show / hide solution</button>
    </div>
    <div class="prob-sol" id="sol-${i}">
      <h4>solution</h4>
      ${renderMixed(p.sol)}
    </div>
  </div>
`).join('');

practiceList.querySelectorAll('.mini-btn').forEach(b => {
  b.addEventListener('click', () => {
    const i = b.dataset.idx;
    document.getElementById('sol-' + i).classList.toggle('show');
  });
});

/* split a string into code and prose blocks (blank-line separated)
   a block is code if any line starts with ≥2 spaces/tab, or it contains
   `{`, `%rXX`, `0x...`, or a top-level C function call pattern. */
function renderMixed(text){
  return text.split(/\n\s*\n/).map(block => {
    const looksCode =
      /^[ \t]{2,}\S/m.test(block) ||
      /[{}]/.test(block) ||
      /%r[a-z0-9]+/i.test(block) ||
      /\b0x[0-9a-f]+\b/i.test(block) ||
      /^\s*(if|while|for|else)\s*\(/m.test(block);
    if (looksCode) return '<pre>' + escapeHtml(block) + '</pre>';
    return '<p>' + escapeHtml(block).replaceAll('\n', '<br>') + '</p>';
  }).join('');
}

/* ============================= GLOSSARY ============================= */
const glossaryEl = document.getElementById('glossary');
const alphaJump = document.getElementById('alpha-jump');
const defsSearch = document.getElementById('defs-search');

function renderGlossary(filter=''){
  const f = filter.trim().toLowerCase();
  const entries = GLOSS.filter(([k,v]) =>
    !f || k.toLowerCase().includes(f) || v.toLowerCase().includes(f)
  ).sort((a,b) => a[0].localeCompare(b[0]));

  glossaryEl.innerHTML = entries.map(([k,v]) => `
    <dt id="gl-${cssId(k)}">${escapeHtml(k)}</dt>
    <dd>${escapeHtml(v)}</dd>
  `).join('');

  // letters
  const seen = new Set(entries.map(e => firstLetter(e[0])));
  alphaJump.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(L => {
    const has = seen.has(L);
    return `<span class="${has ? '' : 'disabled'}" data-letter="${L}">${L}</span>`;
  }).join('');
  alphaJump.querySelectorAll('span').forEach(s => {
    s.addEventListener('click', () => {
      const L = s.dataset.letter;
      const match = entries.find(e => firstLetter(e[0]) === L);
      if (match) document.getElementById('gl-' + cssId(match[0]))?.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}
function firstLetter(s){ return (s[0] || '').toUpperCase(); }
function cssId(s){ return s.replace(/[^a-zA-Z0-9]/g,'-').toLowerCase(); }
defsSearch.addEventListener('input', e => renderGlossary(e.target.value));
renderGlossary();

/* ============================= FORMULAS ============================= */
const formulaList = document.getElementById('formula-list');
formulaList.innerHTML = `<div class="formula-grid">${
  FORMULAS.map(f => `
    <div class="formula-card">
      <h4>${escapeHtml(f.h)}</h4>
      <div class="eq">${escapeHtml(f.eq)}</div>
      ${f.note ? `<p>${escapeHtml(f.note)}</p>` : ''}
    </div>
  `).join('')
}</div>`;

/* ============================= CHEAT SHEET ============================= */
document.getElementById('cheat-printable').innerHTML = CHEAT_PAGES.join('');

/* ============================= util ============================= */
function escapeHtml(s){
  return (s ?? '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
