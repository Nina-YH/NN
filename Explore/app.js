/* ===== Antheris Diary · 应用逻辑 ===== */

// ---------- 数据层（localStorage） ----------
const DB_KEY = 'neon_self_discipline_v1';

function defaultData() {
  return {
    version: 1,
    sleep: {},
    todos: [],
    explorations: [],
    settings: { userName: '' }
  };
}

const DB = {
  data: null,
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      this.data = raw ? Object.assign(defaultData(), JSON.parse(raw)) : defaultData();
    } catch (e) {
      this.data = defaultData();
    }
    return this.data;
  },
  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('保存失败', e);
    }
  }
};

// ---------- 日期工具 ----------
function pad(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatDateCN(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日 ${WEEKDAYS[date.getDay()]}`;
}

function lastNDays(n) {
  const arr = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    arr.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return arr; // 从最旧到最新
}

// ---------- 时钟 ----------
let lastRenderedDate = null;

function tickClock() {
  const now = new Date();
  const today = todayStr();
  const clockEl = document.getElementById('clockTime');
  if (clockEl) clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const dateEl = document.getElementById('todayDate');
  if (dateEl) dateEl.textContent = formatDateCN(today);

  const periodEl = document.getElementById('clockPeriod');
  if (periodEl) periodEl.textContent = PERIOD_LABEL[periodKey(now.getHours())];

  applyPeriod();

  // 跨天时刷新「今天/昨天」标签、当日清单与探索打卡状态
  if (today !== lastRenderedDate) {
    lastRenderedDate = today;
    renderSleep();
    renderTodos();
    renderExplore();
    renderStats();
  }
}

// 时段（清晨/白天/傍晚/夜晚）
function periodKey(hour) {
  if (hour >= 5 && hour < 8) return 'morning';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

const PERIOD_LABEL = { morning: '清 晨', day: '白 天', dusk: '傍 晚', night: '夜 晚' };
const PERIOD_THEME = { morning: '#2b1a4e', day: '#4b2d72', dusk: '#241033', night: '#1b0b32' };

let currentPeriod = null;

function applyPeriod() {
  const key = periodKey(new Date().getHours());
  if (key === currentPeriod) return;
  currentPeriod = key;
  document.body.classList.remove('period-morning', 'period-day', 'period-dusk', 'period-night');
  document.body.classList.add('period-' + key);
  // 让刘海/状态栏颜色与背景顶部融合，避免出现黑色
  const themeEl = document.querySelector('meta[name="theme-color"]');
  if (themeEl) themeEl.setAttribute('content', PERIOD_THEME[key]);
}

function initParticles() {
  const container = document.getElementById('bgParticles');
  if (!container) return;
  const colors = ['rgba(255,110,199,0.75)', 'rgba(178,107,255,0.75)', 'rgba(125,249,255,0.65)'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    p.style.width = p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.boxShadow = '0 0 ' + (size * 3) + 'px ' + colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (12 + Math.random() * 14) + 's';
    p.style.animationDelay = (-Math.random() * 20) + 's';
    container.appendChild(p);
  }
}

// ---------- 睡眠记录 ----------
function getSleep(dateStr) {
  return DB.data.sleep[dateStr] || {};
}

function setSleep(dateStr, patch) {
  const cur = DB.data.sleep[dateStr] || {};
  Object.assign(cur, patch);
  if (!cur.bed) delete cur.bed;
  if (!cur.wake) delete cur.wake;
  if (!cur.bed && !cur.wake) delete DB.data.sleep[dateStr];
  else DB.data.sleep[dateStr] = cur;
  DB.save();
}

function nowHM() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcDurationMinutes(bed, wake) {
  if (!bed || !wake) return null;
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

function formatDuration(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分`;
}

// 起床应配对到哪一晚：今天有入睡归今天；否则找最近一个「已入睡未起床」的夜晚
function findWakeTarget() {
  const today = todayStr();
  if (getSleep(today).bed) return today;
  const days = lastNDays(7);
  for (let i = days.length - 1; i >= 0; i--) {
    const s = getSleep(days[i]);
    if (s.bed && !s.wake) return days[i];
  }
  return today;
}

function renderSleep() {
  const today = todayStr();
  const s = getSleep(today);
  const statusEl = document.getElementById('sleepStatus');
  const btnBed = document.getElementById('btnBed');
  const btnWake = document.getElementById('btnWake');

  const dur = calcDurationMinutes(s.bed, s.wake);
  if (s.bed && s.wake) statusEl.textContent = `已记录 · 睡了 ${formatDuration(dur)}`;
  else if (s.bed) statusEl.textContent = `已入睡 ${s.bed} · 待起床`;
  else if (s.wake) statusEl.textContent = `起床 ${s.wake} · 待补录入睡`;
  else statusEl.textContent = '今晚还未打卡 · 点「入睡」开始';

  btnBed.textContent = s.bed ? `入睡 ${s.bed}` : '入睡';
  btnWake.textContent = s.wake ? `起床 ${s.wake}` : '起床';

  renderSleepWeek();
}

function renderSleepWeek() {
  const list = document.getElementById('sleepWeek');
  const today = todayStr();
  const yesterday = yesterdayStr();
  list.innerHTML = '';
  lastNDays(7).forEach((dateStr) => {
    const s = getSleep(dateStr);
    const [y, m, d] = dateStr.split('-').map(Number);
    const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()].replace('周', '');
    const isToday = dateStr === today;

    let dayLabel = wd;
    if (isToday) dayLabel = '今天';
    else if (dateStr === yesterday) dayLabel = '昨天';

    let times = '—';
    if (s.bed && s.wake) times = `${s.bed} → ${s.wake}`;
    else if (s.bed) times = `${s.bed} → ?`;
    else if (s.wake) times = `? → ${s.wake}`;

    const dur = calcDurationMinutes(s.bed, s.wake);
    const row = document.createElement('div');
    row.className = 'sleep-row';
    row.innerHTML =
      `<span class="sleep-row__day${isToday ? ' is-today' : ''}">${dayLabel}</span>` +
      `<span class="sleep-row__times">${times}</span>` +
      `<span class="sleep-row__dur">${formatDuration(dur)}</span>`;
    row.addEventListener('click', () => openSleepEdit(dateStr));
    list.appendChild(row);
  });
}

// 补录弹层
let editingDate = null;

function openSleepEdit(dateStr) {
  editingDate = dateStr;
  const s = getSleep(dateStr);
  document.getElementById('editBed').value = s.bed || '';
  document.getElementById('editWake').value = s.wake || '';
  document.getElementById('sleepModalDate').textContent = formatDateCN(dateStr);
  document.getElementById('sleepModal').hidden = false;
}

function closeSleepEdit() {
  document.getElementById('sleepModal').hidden = true;
}

function saveSleepEdit() {
  setSleep(editingDate, {
    bed: document.getElementById('editBed').value || undefined,
    wake: document.getElementById('editWake').value || undefined
  });
  closeSleepEdit();
  renderSleep();
}

function initSleep() {
  document.getElementById('btnBed').addEventListener('click', () => {
    setSleep(todayStr(), { bed: nowHM() });
    renderSleep();
  });
  document.getElementById('btnWake').addEventListener('click', () => {
    setSleep(findWakeTarget(), { wake: nowHM() });
    renderSleep();
  });
  document.getElementById('editSave').addEventListener('click', saveSleepEdit);
  document.getElementById('editCancel').addEventListener('click', closeSleepEdit);
  document.querySelector('#sleepModal .modal__mask').addEventListener('click', closeSleepEdit);
  document.getElementById('sleepWeekToggle').addEventListener('click', () => {
    const wrap = document.getElementById('sleepWeekWrap');
    const nowCollapsed = wrap.classList.toggle('is-collapsed');
    document.getElementById('sleepWeekToggle').setAttribute('aria-expanded', String(!nowCollapsed));
  });
  renderSleep();
}

// ---------- 每日清单 ----------
// 旧版按日期分桶的数据 → 扁平数组（一次性迁移，未完成事项跨天保留）
function migrateTodos() {
  const t = DB.data.todos;
  if (Array.isArray(t)) return;
  const arr = [];
  Object.keys(t).sort().forEach((date) => {
    (t[date] || []).forEach((item) => {
      arr.push({
        id: item.id || uid(),
        text: item.text,
        done: !!item.done,
        createdDate: date,
        doneDate: item.done ? date : null
      });
    });
  });
  DB.data.todos = arr;
  DB.save();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderTodos() {
  const today = todayStr();
  const todos = DB.data.todos;
  // 今日视图 = 未完成的事项（跨天自动保留）+ 今天完成的事项
  const visible = todos.filter((t) => !t.done || t.doneDate === today);
  const done = visible.filter((t) => t.done).length;
  document.getElementById('todoCount').textContent = `${done}/${visible.length}`;

  const list = document.getElementById('todoList');
  list.innerHTML = '';

  if (!visible.length) {
    const empty = document.createElement('li');
    empty.className = 'todo-empty';
    empty.textContent = '还没有事项 · 添加一条，开始今天';
    list.appendChild(empty);
    return;
  }

  visible.forEach((todo) => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.done ? ' is-done' : '');
    li.innerHTML =
      `<button class="todo-check" aria-label="完成">${todo.done ? '✓' : ''}</button>` +
      `<span class="todo-text">${escapeHTML(todo.text)}</span>` +
      `<button class="todo-del" aria-label="删除">✕</button>`;
    li.querySelector('.todo-check').addEventListener('click', () => {
      todo.done = !todo.done;
      todo.doneDate = todo.done ? today : null;
      DB.save();
      renderTodos();
    });
    li.querySelector('.todo-del').addEventListener('click', () => {
      DB.data.todos.splice(DB.data.todos.indexOf(todo), 1);
      DB.save();
      renderTodos();
    });
    list.appendChild(li);
  });
}

function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;
  DB.data.todos.push({ id: uid(), text, done: false, createdDate: todayStr(), doneDate: null });
  DB.save();
  input.value = '';
  renderTodos();
}

function initTodos() {
  document.getElementById('todoAdd').addEventListener('click', addTodo);
  document.getElementById('todoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });
  renderTodos();
}

// ---------- 探索模块 ----------
function showModal(id) { document.getElementById(id).hidden = false; }
function hideModal(id) { document.getElementById(id).hidden = true; }

function engagedDays(e) {
  return Object.values(e.checkins).filter((c) => c.engaged).length;
}

function notesCount(e) {
  return Object.values(e.checkins).filter((c) => c.note && c.note.trim()).length;
}

function engagedStreak(e) {
  let streak = 0;
  const d = new Date();
  const today = todayStr();
  if (!e.checkins[today] || !e.checkins[today].engaged) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const c = e.checkins[ds];
    if (c && c.engaged) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function setCheckin(e, date, engaged, note) {
  if (!engaged && !note) delete e.checkins[date];
  else e.checkins[date] = { engaged: !!engaged, note: note || '' };
  DB.save();
}

function renderExplore() {
  renderActiveExplorations();
  renderEndedExplorations();
}

function renderActiveExplorations() {
  const container = document.getElementById('exploreActive');
  const active = DB.data.explorations.filter((e) => e.status === 'active');
  container.innerHTML = '';
  if (!active.length) {
    const empty = document.createElement('div');
    empty.className = 'explore-empty';
    empty.textContent = '还没有正在探索的事物 · 点上方「开启新探索」开始';
    container.appendChild(empty);
    return;
  }
  active.forEach((e) => container.appendChild(renderExploreCard(e)));
}

function renderExploreCard(e) {
  const el = document.createElement('div');
  el.className = 'explore-card';
  const today = todayStr();
  const doneToday = !!(e.checkins[today] && e.checkins[today].engaged);
  el.innerHTML = `
    <div class="explore-card__head">
      <div class="explore-card__titles">
        <div class="explore-card__name">${escapeHTML(e.name)}</div>
        ${e.goal ? `<div class="explore-card__goal">${escapeHTML(e.goal)}</div>` : ''}
      </div>
      <span class="explore-card__status">进行中</span>
    </div>
    <div class="explore-card__meta">
      <span>投入 <b>${engagedDays(e)}</b> 天</span>
      <span>连续 <b>${engagedStreak(e)}</b> 天</span>
      <span>心得 <b>${notesCount(e)}</b> 条</span>
      <span>自 ${e.startDate.slice(5).replace('-', '/')}</span>
    </div>
    <div class="explore-card__actions">
      <button class="explore-btn${doneToday ? ' is-done' : ''}" data-act="checkin">${doneToday ? '今日投入 ✓' : '今日投入'}</button>
      <button class="explore-btn" data-act="note">写心得</button>
      <button class="explore-btn explore-btn--end" data-act="end">结束</button>
    </div>
  `;
  el.querySelector('[data-act="checkin"]').addEventListener('click', () => {
    const c = e.checkins[today] || { engaged: false, note: '' };
    setCheckin(e, today, !c.engaged, c.note);
    renderExplore();
  });
  el.querySelector('[data-act="note"]').addEventListener('click', () => openNoteModal(e));
  el.querySelector('[data-act="end"]').addEventListener('click', () => openEndModal(e));
  return el;
}

function renderEndedExplorations() {
  const container = document.getElementById('exploreEnded');
  const ended = DB.data.explorations.filter((e) => e.status === 'ended');
  container.innerHTML = '';
  if (!ended.length) {
    const empty = document.createElement('div');
    empty.className = 'explore-empty';
    empty.textContent = '还没有结束的探索';
    container.appendChild(empty);
    return;
  }
  ended.forEach((e) => {
    const el = document.createElement('div');
    el.className = 'explore-card explore-card--ended';
    el.innerHTML = `
      <div class="explore-card__head">
        <div class="explore-card__name">${escapeHTML(e.name)}</div>
        <span class="explore-card__status">已结束</span>
      </div>
      <div class="explore-card__meta"><span>${e.startDate.slice(5).replace('-', '/')} ~ ${(e.endDate || '').slice(5).replace('-', '/')}</span></div>
      ${e.review ? `<div class="explore-card__field"><span class="explore-card__field-label">复盘</span>${escapeHTML(e.review)}</div>` : ''}
      ${e.conclusion ? `<div class="explore-card__field"><span class="explore-card__field-label">结论</span>${escapeHTML(e.conclusion)}</div>` : ''}
    `;
    container.appendChild(el);
  });
}

let noteTargetId = null;
let endTargetId = null;

function openNoteModal(e) {
  noteTargetId = e.id;
  const today = todayStr();
  const c = e.checkins[today] || {};
  document.getElementById('noteModalName').textContent = e.name;
  document.getElementById('noteEngaged').checked = !!c.engaged;
  document.getElementById('noteText').value = c.note || '';
  showModal('noteModal');
}

function saveNote() {
  const e = DB.data.explorations.find((x) => x.id === noteTargetId);
  if (!e) return;
  setCheckin(e, todayStr(), document.getElementById('noteEngaged').checked, document.getElementById('noteText').value.trim());
  hideModal('noteModal');
  renderExplore();
}

function openEndModal(e) {
  endTargetId = e.id;
  document.getElementById('endModalName').textContent = e.name;
  document.getElementById('endReview').value = e.review || '';
  document.getElementById('endConclusion').value = e.conclusion || '';
  showModal('endModal');
}

function saveEnd() {
  const e = DB.data.explorations.find((x) => x.id === endTargetId);
  if (!e) return;
  e.review = document.getElementById('endReview').value.trim();
  e.conclusion = document.getElementById('endConclusion').value.trim();
  e.status = 'ended';
  e.endDate = todayStr();
  DB.save();
  hideModal('endModal');
  renderExplore();
}

function createExploration() {
  const name = document.getElementById('exploreName').value.trim();
  if (!name) { document.getElementById('exploreName').focus(); return; }
  const goal = document.getElementById('exploreGoal').value.trim();
  const startDate = document.getElementById('exploreStartDate').value || todayStr();
  DB.data.explorations.push({
    id: uid(), name, goal, startDate,
    status: 'active', endDate: null, checkins: {}, review: '', conclusion: ''
  });
  DB.save();
  hideModal('exploreModal');
  renderExplore();
}

function initExplore() {
  document.getElementById('exploreAddBtn').addEventListener('click', () => {
    document.getElementById('exploreName').value = '';
    document.getElementById('exploreGoal').value = '';
    document.getElementById('exploreStartDate').value = todayStr();
    showModal('exploreModal');
  });
  document.getElementById('exploreSave').addEventListener('click', createExploration);
  document.getElementById('exploreCancel').addEventListener('click', () => hideModal('exploreModal'));
  document.getElementById('noteSave').addEventListener('click', saveNote);
  document.getElementById('noteCancel').addEventListener('click', () => hideModal('noteModal'));
  document.getElementById('endSave').addEventListener('click', saveEnd);
  document.getElementById('endCancel').addEventListener('click', () => hideModal('endModal'));
  document.getElementById('exploreEndedToggle').addEventListener('click', () => {
    const wrap = document.getElementById('exploreEndedWrap');
    const collapsed = wrap.classList.toggle('is-collapsed');
    document.getElementById('exploreEndedToggle').setAttribute('aria-expanded', String(!collapsed));
  });
  document.querySelectorAll('.modal__mask').forEach((m) => {
    m.addEventListener('click', () => { m.closest('.modal').hidden = true; });
  });
  renderExplore();
}

// ---------- 打卡统计 ----------
function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 坚持日 = 当天记录过睡眠，或完成过至少一件清单
function isActiveDay(ds) {
  const s = DB.data.sleep[ds];
  if (s && (s.bed || s.wake)) return true;
  return DB.data.todos.some((t) => t.doneDate === ds);
}

function activeStreak() {
  let streak = 0;
  const d = new Date();
  if (!isActiveDay(todayStr())) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = dateStr(d);
    if (isActiveDay(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function thisWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=周日
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return [dateStr(monday), dateStr(sunday)];
}

function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return [dateStr(start), dateStr(end)];
}

function completedIn(startStr, endStr) {
  return DB.data.todos.filter((t) => t.doneDate && t.doneDate >= startStr && t.doneDate <= endStr).length;
}

function pendingCount() {
  return DB.data.todos.filter((t) => !t.done).length;
}

function ratePct(done, pending) {
  const denom = done + pending;
  return denom ? Math.round((done / denom) * 100) : null;
}

function renderStats() {
  document.getElementById('statStreak').textContent = activeStreak();

  const [wStart, wEnd] = thisWeekRange();
  const [mStart, mEnd] = thisMonthRange();
  const weekDone = completedIn(wStart, wEnd);
  const monthDone = completedIn(mStart, mEnd);
  const pending = pendingCount();

  document.getElementById('statWeekDone').textContent = weekDone;
  document.getElementById('statMonthDone').textContent = monthDone;
  document.getElementById('statPending').textContent = pending;

  const weekRate = ratePct(weekDone, pending);
  const monthRate = ratePct(monthDone, pending);
  document.getElementById('statWeekRate').textContent = weekRate == null ? '—' : weekRate + '%';
  document.getElementById('statMonthRate').textContent = monthRate == null ? '—' : monthRate + '%';
  document.getElementById('statWeekBar').style.width = (weekRate == null ? 0 : weekRate) + '%';
  document.getElementById('statMonthBar').style.width = (monthRate == null ? 0 : monthRate) + '%';

  renderSleepStats();
  renderDailyRates();
  renderExploreStats();
}

function minToHM(min) {
  min = Math.round(min) % (24 * 60);
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function renderSleepStats() {
  const days = lastNDays(7);
  let totalMin = 0, count = 0, bedSum = 0, bedN = 0, wakeSum = 0, wakeN = 0;
  days.forEach((ds) => {
    const s = DB.data.sleep[ds] || {};
    if (s.bed && s.wake) { totalMin += calcDurationMinutes(s.bed, s.wake); count++; }
    if (s.bed) { const [h, m] = s.bed.split(':').map(Number); bedSum += h * 60 + m; bedN++; }
    if (s.wake) { const [h, m] = s.wake.split(':').map(Number); wakeSum += h * 60 + m; wakeN++; }
  });
  document.getElementById('statAvgSleep').textContent = count ? formatDuration(Math.round(totalMin / count)) : '—';
  document.getElementById('statAvgBed').textContent = bedN ? minToHM(bedSum / bedN) : '—';
  document.getElementById('statAvgWake').textContent = wakeN ? minToHM(wakeSum / wakeN) : '—';
}

function dailyCompletionRate(ds) {
  const active = DB.data.todos.filter((t) => t.createdDate <= ds && (!t.doneDate || t.doneDate >= ds)).length;
  const done = DB.data.todos.filter((t) => t.doneDate === ds).length;
  if (!active) return null;
  return Math.round((done / active) * 100);
}

function renderDailyRates() {
  const days = lastNDays(7);
  const container = document.getElementById('dailyRateBars');
  const today = todayStr();
  container.innerHTML = '';
  let sum = 0, cnt = 0;
  days.forEach((ds) => {
    const rate = dailyCompletionRate(ds);
    if (rate != null) { sum += rate; cnt++; }
    const [y, m, d] = ds.split('-').map(Number);
    const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()].replace('周', '');
    const isToday = ds === today;
    const bar = document.createElement('div');
    bar.className = 'dailyrate__bar' + (rate == null ? ' is-empty' : '') + (isToday ? ' is-today' : '');
    bar.innerHTML = `
      <div class="dailyrate__bar-fill" style="height: ${rate == null ? 3 : rate}%"></div>
      <div class="dailyrate__bar-label">${isToday ? '今天' : wd}</div>
    `;
    container.appendChild(bar);
  });
  document.getElementById('statDailyAvg').textContent = cnt ? Math.round(sum / cnt) + '%' : '—';
}

function renderExploreStats() {
  const container = document.getElementById('exploreStats');
  const list = DB.data.explorations;
  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = '<div class="explore-stats__empty">还没有探索项目 · 去「探索」页开启一个</div>';
    return;
  }
  list.forEach((e) => {
    const row = document.createElement('div');
    row.className = 'explore-stats__row';
    const nums = e.status === 'active'
      ? `投入 <b>${engagedDays(e)}</b> 天 · 连续 <b>${engagedStreak(e)}</b> 天`
      : `投入 <b>${engagedDays(e)}</b> 天 · 已结束`;
    row.innerHTML = `<span class="explore-stats__name">${escapeHTML(e.name)}</span><span class="explore-stats__nums">${nums}</span>`;
    container.appendChild(row);
  });
}

function initStats() {
  renderStats();
}

// ---------- 数据备份 ----------
let toastTimer = null;

function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-show'), 2200);
}

async function exportData() {
  try {
    const json = JSON.stringify(DB.data, null, 2);
    const file = new File([json], `Antheris-Diary备份_${todayStr()}.json`, { type: 'application/json' });
    // 优先用系统分享（iPhone 可「存储到文件」），否则回退为下载
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Antheris Diary 备份' });
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('已导出备份文件');
  } catch (e) {
    if (e && e.name === 'AbortError') return; // 用户取消分享
    showToast('导出失败');
  }
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const valid = parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
        (('sleep' in parsed) || ('todos' in parsed) || ('explorations' in parsed));
      if (!valid) throw new Error('invalid');
      DB.data = Object.assign(defaultData(), parsed);
      migrateTodos();
      DB.save();
      renderSleep();
      renderTodos();
      renderExplore();
      renderStats();
      showToast('导入成功');
    } catch (e) {
      showToast('导入失败：文件格式不正确');
    }
  };
  reader.onerror = () => showToast('导入失败：无法读取文件');
  reader.readAsText(file);
}

function initSettings() {
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });
}

// ---------- Tab 切换 ----------
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.view').forEach((v) => {
        v.classList.toggle('is-active', v.id === `view-${target}`);
      });
      if (target === 'stats') renderStats();
    });
  });
}

// ---------- 启动 ----------
DB.load();
migrateTodos();
initTabs();
initSleep();
initTodos();
initExplore();
initStats();
initSettings();
initParticles();
tickClock();
setInterval(tickClock, 1000);

// Service Worker 已停用（避免开发阶段缓存干扰）
