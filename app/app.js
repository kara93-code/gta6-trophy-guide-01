// Leonida Platinum — GTA VI trophy tracker. Plain module, no libraries, no network
// beyond this app's own files: it fetches data/trophies.json from beside itself
// and keeps every bit of progress in localStorage.

const STORE_KEY = 'leonida-platinum-v1';
const DATA_URL = 'data/trophies.json';

const ROADMAP_STAGES = [
  { stage: 1, title: 'First hours in Leonida', blurb: 'Learn the map and the partner systems before the story hardens. Grab the one-off moments while they are in front of you.' },
  { stage: 2, title: 'Chapters 1–2', blurb: 'Play the early story straight through. Named-mission trophies land here — finish each mission when it appears.' },
  { stage: 3, title: 'Chapters 3–4', blurb: 'The story widens. Keep the character strands moving alongside the chapters so their final missions do not get left behind.' },
  { stage: 4, title: 'Finale & 100% completion', blurb: 'Finish the final mission, then mop up the stranger strands and the last unique hunt on the way to 100%.' },
  { stage: 5, title: 'Activities & skills', blurb: 'The long grind, done after the story so nothing competes with it: stunts, ranges, races, challenges, robberies and the odd one-off events.' },
  { stage: 6, title: 'Collectibles & cleanup', blurb: 'Cards, WAiNK spots, vehicles, every corner of the map, garages and Scooter Bros registrations — then the platinum pops.' },
];

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPanel');
const searchBox = document.getElementById('searchBox');
const gradeFilter = document.getElementById('gradeFilter');
const spoilerToggle = document.getElementById('spoilerToggle');
const earnedOnlyToggle = document.getElementById('earnedOnlyToggle');
const spoilerNote = document.getElementById('spoilerNote');

let trophyData = [];
let selectedName = null;
let activeKind = 'all';

let savedState = loadSavedState();
let earnedSet = new Set(savedState.earned || []);
let trophyNotes = savedState.notes || {};

function loadSavedState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function persistState() {
  const state = {
    earned: [...earnedSet],
    notes: trophyNotes,
    spoiler: spoilerToggle.checked,
    targetDate: document.getElementById('targetDate')?.value || savedState.targetDate || '',
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  savedState = state;
}

async function loadTrophyData() {
  const response = await fetch(DATA_URL);
  const doc = await response.json();
  trophyData = Array.isArray(doc) ? doc : doc.trophies;
}

function trophyByName(name) {
  return trophyData.find((t) => t.name === name);
}

function isEarned(trophy) {
  return earnedSet.has(trophy.name);
}

function isSpoilerHidden(trophy) {
  return spoilerToggle.checked && trophy.hidden && !isEarned(trophy);
}

function toggleEarned(trophy) {
  if (isEarned(trophy)) earnedSet.delete(trophy.name);
  else earnedSet.add(trophy.name);
  persistState();
  renderAll();
}

function saveTrophyNote(name, text) {
  if (text.trim()) trophyNotes[name] = text;
  else delete trophyNotes[name];
  persistState();
}

function visibleTrophies() {
  const query = searchBox.value.trim().toLowerCase();
  return trophyData.filter((t) => {
    if (activeKind === 'missable' && !t.missable) return false;
    if (activeKind === 'online') return false;
    if (activeKind !== 'all' && activeKind !== 'missable' && t.kind !== activeKind) return false;
    if (gradeFilter.value !== 'all' && t.grade !== gradeFilter.value) return false;
    if (earnedOnlyToggle.checked && !isEarned(t)) return false;
    if (query) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function renderChecklist() {
  const shown = visibleTrophies();
  listEl.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = activeKind === 'online'
      ? 'No online trophies in the official list — every one of the 55 is earned in single-player.'
      : 'No trophies match these filters.';
    listEl.append(empty);
    return;
  }
  for (const trophy of shown) {
    listEl.append(renderTrophyCard(trophy));
  }
}

function renderTrophyCard(trophy) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'trophy-card' + (isEarned(trophy) ? ' earned' : '') + (selectedName === trophy.name ? ' selected' : '');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(trophy);
  box.setAttribute('aria-label', `Mark ${trophy.name} earned`);
  box.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleEarned(trophy);
  });
  const body = document.createElement('span');
  const hidden = isSpoilerHidden(trophy);
  const name = document.createElement('span');
  name.className = 'trophy-name';
  name.textContent = hidden ? 'Hidden trophy' : trophy.name;
  const desc = document.createElement('span');
  desc.className = 'trophy-desc';
  desc.style.display = 'block';
  desc.textContent = hidden
    ? 'A story trophy — earn it to reveal its name and description.'
    : trophy.description;
  const meta = document.createElement('span');
  meta.className = 'trophy-meta';
  meta.style.display = 'flex';
  meta.append(gradeBadge(trophy.grade));
  if (trophy.missable) meta.append(flagBadge('Missable', 'missable'));
  if (trophy.hidden) meta.append(flagBadge('Hidden on PSN', 'hidden-flag'));
  if (trophy.count) meta.append(flagBadge(`Count: ${trophy.count}`, 'count'));
  if (trophy.kind !== 'platinum') meta.append(flagBadge(trophy.kind, ''));
  const snippet = document.createElement('span');
  snippet.className = 'trophy-guide-snippet';
  snippet.style.display = 'block';
  snippet.textContent = hidden ? '' : trophy.guide.split('.')[0] + '.';
  body.append(name, desc, meta, snippet);
  const spacer = document.createElement('span');
  card.append(box, body, spacer);
  card.addEventListener('click', () => {
    selectedName = trophy.name;
    renderChecklist();
    renderDetailPanel();
  });
  return card;
}

function gradeBadge(grade) {
  return flagBadge(grade, grade);
}

function flagBadge(text, cls) {
  const badge = document.createElement('span');
  badge.className = `badge ${cls}`.trim();
  badge.textContent = text;
  return badge;
}

function renderDetailPanel() {
  const trophy = selectedName ? trophyByName(selectedName) : null;
  detailEl.replaceChildren();
  if (!trophy) {
    const hint = document.createElement('p');
    hint.className = 'detail-empty';
    hint.textContent = 'Click any trophy in the list to read its full guide, its sources, and its missable warning — and to leave yourself a note.';
    detailEl.append(hint);
    return;
  }
  const hidden = isSpoilerHidden(trophy);
  const title = document.createElement('h3');
  title.textContent = hidden ? 'Hidden trophy' : trophy.name;
  detailEl.append(title, gradeBadge(trophy.grade));
  if (trophy.missable) detailEl.append(flagBadge('Missable', 'missable'));
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = hidden
    ? 'Official name and description hidden until earned (spoiler protection is on).'
    : `Official: “${trophy.description}”`;
  detailEl.append(official);
  const guideHead = document.createElement('h4');
  guideHead.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.textContent = hidden
    ? 'Guide hidden until earned — turn spoiler protection off to read it early.'
    : trophy.guide;
  detailEl.append(guideHead, guide);
  if (trophy.missable && trophy.missableReason && !hidden) {
    const warnHead = document.createElement('h4');
    warnHead.textContent = 'Why it can be missed';
    const warn = document.createElement('p');
    warn.className = 'warn';
    warn.textContent = trophy.missableReason;
    detailEl.append(warnHead, warn);
  }
  const stage = ROADMAP_STAGES.find((s) => s.stage === trophy.stage);
  if (stage) {
    const stageHead = document.createElement('h4');
    stageHead.textContent = 'Roadmap';
    const stageText = document.createElement('p');
    stageText.textContent = `Stage ${stage.stage} — ${stage.title}.`;
    detailEl.append(stageHead, stageText);
  }
  const srcHead = document.createElement('h4');
  srcHead.textContent = 'Sources';
  const srcList = document.createElement('ul');
  srcList.className = 'source-list';
  for (const source of trophy.sources || []) {
    const item = document.createElement('li');
    item.textContent = source;
    srcList.append(item);
  }
  detailEl.append(srcHead, srcList);
  const noteHead = document.createElement('h4');
  noteHead.textContent = 'Your note';
  const note = document.createElement('textarea');
  note.value = trophyNotes[trophy.name] || '';
  note.placeholder = 'e.g. “Second island, north beach — check again after Chapter 3.”';
  note.setAttribute('aria-label', `Note for ${trophy.name}`);
  note.addEventListener('input', () => saveTrophyNote(trophy.name, note.value));
  detailEl.append(noteHead, note);
  const earnBtn = document.createElement('button');
  earnBtn.type = 'button';
  earnBtn.className = 'earn-btn' + (isEarned(trophy) ? ' earned' : '');
  earnBtn.textContent = isEarned(trophy) ? '✓ Earned — click to untick' : 'Mark as earned';
  earnBtn.addEventListener('click', () => toggleEarned(trophy));
  detailEl.append(earnBtn);
}

function renderRoadmap() {
  const host = document.getElementById('roadmapStages');
  host.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const members = trophyData.filter((t) => t.stage === stage.stage);
    const got = members.filter(isEarned).length;
    const card = document.createElement('div');
    card.className = 'stage' + (got === members.length && members.length ? ' done' : '');
    const head = document.createElement('div');
    head.className = 'stage-head';
    const title = document.createElement('h3');
    title.innerHTML = '';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `Stage ${stage.stage}`;
    title.append(num, document.createTextNode(stage.title));
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${got} / ${members.length} earned`;
    head.append(title, count);
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    const fill = document.createElement('div');
    fill.className = 'stage-fill';
    fill.style.width = members.length ? `${Math.round((got / members.length) * 100)}%` : '0%';
    bar.append(fill);
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const trophy of members) {
      const chip = document.createElement('span');
      chip.className = 'stage-trophy' + (isEarned(trophy) ? ' got' : '') + (trophy.missable ? ' miss' : '');
      chip.textContent = (isSpoilerHidden(trophy) ? 'Hidden trophy' : trophy.name) + (trophy.missable ? ' ⚠' : '');
      chips.append(chip);
    }
    card.append(head, blurb, bar, chips);
    host.append(card);
  }
}

function renderMissables() {
  const host = document.getElementById('missableList');
  host.replaceChildren();
  const missables = trophyData.filter((t) => t.missable);
  document.getElementById('missableTabCount').textContent = missables.length;
  for (const trophy of missables) {
    const card = document.createElement('div');
    card.className = 'missable-card' + (isEarned(trophy) ? ' got' : '');
    const title = document.createElement('h3');
    title.textContent = (isSpoilerHidden(trophy) ? 'Hidden trophy' : trophy.name) + (isEarned(trophy) ? ' ✓' : '');
    const desc = document.createElement('p');
    desc.textContent = isSpoilerHidden(trophy)
      ? 'A story trophy — earn it to reveal its description.'
      : trophy.description;
    const reason = document.createElement('p');
    reason.className = 'miss-reason';
    reason.textContent = trophy.missableReason || '';
    const guide = document.createElement('p');
    guide.textContent = isSpoilerHidden(trophy) ? '' : trophy.guide;
    card.append(title, desc, reason, guide);
    host.append(card);
  }
}

function computeNextUp() {
  const remaining = trophyData
    .filter((t) => !isEarned(t) && t.name !== 'Vice Got a Price!')
    .sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
  return remaining.slice(0, 3);
}

function renderPlanner() {
  const nextUp = computeNextUp();
  const list = document.getElementById('nextUpList');
  list.replaceChildren();
  if (!nextUp.length) {
    const done = document.createElement('li');
    done.textContent = 'Everything is earned — the platinum is yours.';
    list.append(done);
  }
  for (const trophy of nextUp) {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'next-name';
    name.textContent = isSpoilerHidden(trophy) ? 'Hidden trophy' : trophy.name;
    const why = document.createElement('span');
    why.className = 'next-why';
    why.style.display = 'block';
    const stage = ROADMAP_STAGES.find((s) => s.stage === trophy.stage);
    why.textContent = `Stage ${trophy.stage} — ${stage ? stage.title : ''}${trophy.missable ? ' · ⚠ missable, do it when you see it' : ''}`;
    item.append(name, why);
    list.append(item);
  }
  const stageHost = document.getElementById('stageProgress');
  stageHost.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const members = trophyData.filter((t) => t.stage === stage.stage);
    const got = members.filter(isEarned).length;
    const row = document.createElement('div');
    row.className = 'stage-progress-row';
    const label = document.createElement('span');
    label.textContent = `Stage ${stage.stage} — ${stage.title}`;
    const bar = document.createElement('div');
    bar.className = 'mini-bar';
    const fill = document.createElement('div');
    fill.className = 'mini-fill';
    fill.style.width = members.length ? `${Math.round((got / members.length) * 100)}%` : '0%';
    bar.append(fill);
    const count = document.createElement('span');
    count.textContent = `${got}/${members.length}`;
    row.append(label, bar, count);
    stageHost.append(row);
  }
  updateTargetResult();
}

function updateTargetResult() {
  const result = document.getElementById('targetResult');
  const dateInput = document.getElementById('targetDate');
  const left = trophyData.length - earnedSet.size;
  if (!dateInput.value) {
    result.textContent = left
      ? `${left} trophies left. Choose a date to see your daily pace.`
      : 'Platinum earned — nothing left to plan.';
    return;
  }
  const days = Math.max(1, Math.ceil((new Date(dateInput.value) - Date.now()) / 86400000));
  result.textContent = left
    ? `${left} trophies left over ${days} day${days === 1 ? '' : 's'} — about ${(left / days).toFixed(1)} a day.`
    : 'Platinum earned — nothing left to plan.';
}

function updateProgressBar() {
  const total = trophyData.length;
  const got = earnedSet.size;
  document.getElementById('earnedCount').textContent = got;
  document.getElementById('platinumFill').style.width = total ? `${Math.round((got / total) * 100)}%` : '0%';
  document.getElementById('platinumLabel').textContent = total
    ? `${Math.round((got / total) * 100)}% to the platinum`
    : '0% to the platinum';
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const all = trophyData.filter((t) => t.grade === grade).length;
    const done = trophyData.filter((t) => t.grade === grade && isEarned(t)).length;
    return `${grade[0].toUpperCase() + grade.slice(1)} ${done}/${all}`;
  });
  document.getElementById('gradeCounts').textContent = counts.join(' · ');
}

function exportProgress() {
  const payload = {
    app: 'leonida-platinum',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earnedSet],
    notes: trophyNotes,
    spoiler: spoilerToggle.checked,
    targetDate: document.getElementById('targetDate').value || '',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-platinum-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
  document.getElementById('saveStatus').textContent = `Exported ${earnedSet.size} earned trophies just now.`;
}

async function importProgress(file) {
  const status = document.getElementById('saveStatus');
  try {
    const payload = JSON.parse(await file.text());
    const names = Array.isArray(payload) ? payload : payload.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(trophyData.map((t) => t.name));
    earnedSet = new Set(names.filter((name) => known.has(name)));
    if (payload.notes && typeof payload.notes === 'object') trophyNotes = payload.notes;
    if (typeof payload.spoiler === 'boolean') spoilerToggle.checked = payload.spoiler;
    if (payload.targetDate) document.getElementById('targetDate').value = payload.targetDate;
    persistState();
    renderAll();
    status.textContent = `Imported ${earnedSet.size} earned trophies.`;
  } catch {
    status.textContent = 'That file is not a Leonida Platinum progress export — nothing changed.';
  }
}

function applySpoilerNote() {
  spoilerNote.style.display = spoilerToggle.checked ? '' : 'none';
}

function switchView(name) {
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${name}`;
  for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('active', tab.dataset.view === name);
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
  if (name === 'planner') renderPlanner();
}

function routeFromHash() {
  const name = (location.hash || '#checklist').slice(1);
  switchView(['checklist', 'roadmap', 'missables', 'planner'].includes(name) ? name : 'checklist');
}

function renderAll() {
  updateProgressBar();
  renderChecklist();
  renderDetailPanel();
  renderMissables();
  applySpoilerNote();
  if (location.hash === '#roadmap') renderRoadmap();
  if (location.hash === '#planner') renderPlanner();
}

function bindControls() {
  for (const chip of document.querySelectorAll('#kindChips .chip')) {
    chip.addEventListener('click', () => {
      activeKind = chip.dataset.kind;
      for (const other of document.querySelectorAll('#kindChips .chip')) {
        other.classList.toggle('active', other === chip);
      }
      renderChecklist();
    });
  }
  searchBox.addEventListener('input', renderChecklist);
  gradeFilter.addEventListener('change', renderChecklist);
  earnedOnlyToggle.addEventListener('change', renderChecklist);
  spoilerToggle.addEventListener('change', () => {
    persistState();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (event) => {
    if (event.target.files[0]) importProgress(event.target.files[0]);
    event.target.value = '';
  });
  document.getElementById('targetDate').addEventListener('change', () => {
    persistState();
    updateTargetResult();
  });
  window.addEventListener('hashchange', routeFromHash);
}

async function initTracker() {
  await loadTrophyData();
  spoilerToggle.checked = savedState.spoiler !== false;
  if (savedState.targetDate) document.getElementById('targetDate').value = savedState.targetDate;
  selectedName = 'The Shootist';
  bindControls();
  renderAll();
  routeFromHash();
}

await initTracker();
