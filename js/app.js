/**
 * ============================================================
 * MEMBER 1 — UI / INTEGRATION LAYER
 * Owns: index.html, css/style.css (design by Member 3), js/app.js
 * Consumes: SleepCycleGraph + SleepDebtCalculator      (Member 1 — Graph)
 *           PriorityQueue + TaskScheduler              (Member 2 — Priority Queue)
 *           ProductivityForecastEngine                 (Member 3 — two-process model)
 *           UndoStack + HistoryTracker                 (Member 4 — Stack + binary search)
 * ============================================================
 */

const sleepGraph = new SleepCycleGraph();
const debtCalc = new SleepDebtCalculator(8);
const forecastEngine = new ProductivityForecastEngine();
const historyTracker = new HistoryTracker();
const undoStack = new UndoStack();
let taskRowCount = 0;

// ---------- persistence (sleep debt log + history survive a page refresh) ----------
function loadDebtLog() {
  const saved = localStorage.getItem('cycle_debt_log');
  if (saved) {
    JSON.parse(saved).forEach((n) => {
      debtCalc.addNight(n.date, n.hoursSlept);
      historyTracker.addEntry(n);
    });
  }
}

function saveDebtLog() {
  localStorage.setItem('cycle_debt_log', JSON.stringify(debtCalc.getLog()));
}

// ---------- hero rings (one per sleep cycle, Member 3's signature visual) ----------
function renderHeroRings() {
  const el = document.getElementById('cycleRings');
  const sizes = [90, 150, 210, 270, 330];
  el.innerHTML = sizes
    .map((s) => `<div class="ring" style="width:${s}px;height:${s}px;"></div>`)
    .join('');
}

// ---------- task rows ----------
function addTaskRow(prefill) {
  taskRowCount++;
  const id = `task-${taskRowCount}`;
  const wrap = document.createElement('div');
  wrap.className = 'task-row';
  wrap.id = id;
  wrap.innerHTML = `
    <input type="text" placeholder="Name" value="${prefill?.name || ''}" class="t-name">
    <input type="time" value="${prefill?.start || '09:00'}" class="t-start">
    <input type="time" value="${prefill?.end || '10:00'}" class="t-end">
    <select class="t-importance">
      ${[1, 2, 3, 4, 5]
        .map((i) => `<option value="${i}" ${i === (prefill?.importance || 3) ? 'selected' : ''}>P${i}</option>`)
        .join('')}
    </select>
    <button type="button" class="remove-task" aria-label="Remove">×</button>`;
  wrap.querySelector('.remove-task').addEventListener('click', () => wrap.remove());
  document.getElementById('taskList').appendChild(wrap);
}

function readTasksFromForm() {
  const rows = document.querySelectorAll('.task-row');
  const today = new Date();
  const tasks = [];
  rows.forEach((row) => {
    const name = row.querySelector('.t-name').value || 'Untitled';
    const start = timeStringToDate(row.querySelector('.t-start').value, today);
    const end = timeStringToDate(row.querySelector('.t-end').value, today);
    const importance = Number(row.querySelector('.t-importance').value);
    if (end > start) tasks.push({ name, start, end, importance });
  });
  return tasks;
}

function timeStringToDate(hhmm, base) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function fmtTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---------- main calculation ----------
function buildSchedule() {
  const wakeStr = document.getElementById('wakeTime').value || '07:00';
  const wakeTime = timeStringToDate(wakeStr, new Date());
  const sleepQuality = Number(document.getElementById('sleepQuality').value);
  const sensitivity = document.getElementById('sensitivity').value;

  // Member 1 — Graph: bedtime options
  const bedtimeOptions = sleepGraph.getBedtimeOptions(wakeTime);
  const best = bedtimeOptions.reduce((a, b) => (b.totalSleepHrs > a.totalSleepHrs ? b : a));

  // Member 2 — Priority Queue: tasks, nap windows, caffeine cutoff
  const scheduler = new TaskScheduler();
  readTasksFromForm().forEach((t) => scheduler.addTask(t));
  const napWindows = scheduler.findNapWindows(20);
  const caffeine = scheduler.suggestCaffeineCutoff(best.bedtime, sensitivity);

  // Member 4 — trend from history so far
  const trend = historyTracker.getTrend(7);

  // Member 3 — two-process model: hourly forecast
  const debt = debtCalc.getWeeklyDebt();
  const curve = forecastEngine.buildDailyCurve(wakeTime, {
    sleepQuality,
    debtHours: debt,
    cyclesAchieved: best.cycles,
  });
  const lowHours = forecastEngine.getLowEnergyHours(curve);
  const dailyScore = forecastEngine.getDailyScore(curve);

  renderResults({ bedtimeOptions, best, napWindows, caffeine, curve, lowHours, dailyScore, trend });
}

// ---------- rendering ----------
function renderResults({ bedtimeOptions, best, napWindows, caffeine, curve, lowHours, dailyScore, trend }) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');

  document.getElementById('bedtimeStat').textContent = fmtTime(best.bedtime);
  document.getElementById('bedtimeSub').textContent =
    `${best.cycles} cycles · ${best.totalSleepHrs}h of sleep`;
  document.getElementById('cycleOptions').innerHTML = bedtimeOptions
    .map(
      (o) =>
        `<div class="cycle-chip ${o.cycles === best.cycles ? 'best' : ''}">${o.cycles} cycles → ${fmtTime(
          o.bedtime
        )} (${o.totalSleepHrs}h)</div>`
    )
    .join('');

  document.getElementById('napList').innerHTML = napWindows.length
    ? napWindows
        .map(
          (w) =>
            `<div class="nap-row"><span>${fmtTime(w.start)}–${fmtTime(w.end)} (${w.durationMin} min)</span><span class="score">${w.score}</span></div>`
        )
        .join('')
    : '<p class="stat-sub">No 20+ minute gaps found in today\u2019s schedule.</p>';

  document.getElementById('caffeineStat').textContent = fmtTime(caffeine.cutoff);
  document.getElementById('caffeineSub').textContent = `${caffeine.bufferHrs}h buffer before bedtime`;

  renderDebtBlock();
  renderHistoryBlock(trend);

  document.getElementById('forecastFill').style.width = `${dailyScore}%`;
  document.getElementById('forecastSub').textContent = `Daily productivity score: ${dailyScore}/100`;
  document.getElementById('forecastCurve').innerHTML = curve
    .map((p) => {
      const isLow = lowHours.includes(p.hour);
      const isNap = napWindows.some((w) => p.hour >= w.start.getHours() && p.hour < w.end.getHours());
      return `<div class="forecast-bar-col ${isLow ? 'low' : ''} ${isNap ? 'nap' : ''}" style="height:${p.score}%" title="${p.label}: ${p.score}"></div>`;
    })
    .join('');
}

function renderDebtBlock() {
  const log = debtCalc.getLog();
  document.getElementById('debtLog').textContent = log.length
    ? log.map((n) => `${n.date}: ${n.hoursSlept}h`).join(' · ')
    : 'No nights logged yet.';
  const debt = debtCalc.getWeeklyDebt();
  const status = debtCalc.getStatus();
  document.getElementById('debtStat').textContent = `${debt >= 0 ? '+' : ''}${debt}h`;
  const sub = document.getElementById('debtSub');
  sub.textContent = status.replace('-', ' ');
  sub.className = `stat-sub status-${status}`;
  document.getElementById('undoNightBtn').disabled = !undoStack.canUndo();
}

function renderHistoryBlock(trend) {
  const summary = document.getElementById('trendSummary');
  summary.innerHTML = trend.entries.length
    ? `<span>Avg: <b>${trend.avg}h</b></span><span>Best: <b>${trend.best.date} (${trend.best.hoursSlept}h)</b></span><span>Worst: <b>${trend.worst.date} (${trend.worst.hoursSlept}h)</b></span>`
    : '<span>Log a few nights to see your trend.</span>';

  document.getElementById('historyList').innerHTML = trend.entries.length
    ? trend.entries
        .slice()
        .reverse()
        .map((e) => `<div class="history-row"><span>${e.date}</span><span>${e.hoursSlept}h</span></div>`)
        .join('')
    : '';
}

function logLastNight() {
  const hours = prompt("How many hours did you sleep last night? (e.g. 6.5)");
  if (hours === null) return;
  const parsed = Number(hours);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 16) {
    alert('Enter a number of hours between 0 and 16.');
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  debtCalc.addNight(date, parsed);
  historyTracker.addEntry({ date, hoursSlept: parsed });
  undoStack.push({ date }); // Member 4 — remembers what to undo
  saveDebtLog();
  renderDebtBlock();
  renderHistoryBlock(historyTracker.getTrend(7));
}

function undoLastNight() {
  const last = undoStack.pop();
  if (!last) return;
  debtCalc.removeLastNight();
  historyTracker.removeEntry(last.date);
  saveDebtLog();
  renderDebtBlock();
  renderHistoryBlock(historyTracker.getTrend(7));
}

// ---------- wire up ----------
document.getElementById('addTaskBtn').addEventListener('click', () => addTaskRow());
document.getElementById('calcBtn').addEventListener('click', buildSchedule);
document.getElementById('addNightBtn').addEventListener('click', logLastNight);
document.getElementById('undoNightBtn').addEventListener('click', undoLastNight);

renderHeroRings();
loadDebtLog();
addTaskRow({ name: 'Lecture', start: '09:00', end: '11:00', importance: 4 });
addTaskRow({ name: 'Study block', start: '14:00', end: '15:00', importance: 2 });
renderDebtBlock();
renderHistoryBlock(historyTracker.getTrend(7));
