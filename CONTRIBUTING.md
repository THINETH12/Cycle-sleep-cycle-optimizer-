# Contributing to Cycle

4-person coursework project for the PDSA module (HNDSE252F). This doc covers
how we split the work, the branch/merge workflow, and how to test your
module before opening a PR.

## Ownership — commit only to your own file(s)

| Member | Student ID | Branch | Owns |
|---|---|---|---|
| Nirmal | COHNDSE252F-022 | `feature/sleep-engine-and-ui` | `js/sleepEngine.js`, `index.html`, `js/app.js` |
| Pamuditha | COHNDSE252F-020 | `feature/task-scheduler` | `js/taskScheduler.js` |
| Elangovan | COHNDSE252F-017 | `feature/forecast-and-styling` | `js/productivityForecast.js`, `css/style.css` |
| Yasas | COHNDSE252F-021 | `feature/history-tracker` | `js/historyTracker.js` |

Sticking to your own file(s) avoids merge conflicts — the four algorithm
modules don't import each other, so there's no reason to touch someone
else's file. If you find a bug in a module you don't own, open an issue or
ping them instead of editing it directly.

## Branch workflow

```bash
git checkout main
git pull
git checkout -b feature/<your-branch-name>

# ...work, commit...

git push -u origin feature/<your-branch-name>
# open a PR into main, tag the other 3 members as reviewers
```

**Merge order:** `sleepEngine.js` → `taskScheduler.js` →
`productivityForecast.js` → `historyTracker.js` first (zero dependencies
between them), **then** `app.js` / `index.html` last — `app.js` is the only
file that depends on the other three, so it should always merge after them,
not before.

## Before opening a PR: test your module

Every algorithm file is plain JS with no DOM dependency — run it directly
with Node before wiring it into `app.js`.

**Member 1 — `sleepEngine.js`**
```bash
node -e "
const {SleepCycleGraph, SleepDebtCalculator} = require('./js/sleepEngine.js');
const g = new SleepCycleGraph();
console.log(g.getBedtimeOptions(new Date(2026,0,1,7,0)));
const d = new SleepDebtCalculator(8);
d.addNight('2026-01-01', 6); d.addNight('2026-01-02', 7);
console.log(d.getWeeklyDebt(), d.getStatus());
d.removeLastNight();
console.log(d.getLog());
"
```

**Member 2 — `taskScheduler.js`**
```bash
node -e "
const {TaskScheduler} = require('./js/taskScheduler.js');
const ts = new TaskScheduler();
ts.addTask({name:'Lecture', start:new Date(2026,0,1,9,0), end:new Date(2026,0,1,11,0), importance:5});
ts.addTask({name:'Lab', start:new Date(2026,0,1,15,0), end:new Date(2026,0,1,17,0), importance:4});
console.log(ts.findNapWindows());
console.log(ts.suggestCaffeineCutoff(new Date(2026,0,1,23,0), 'high'));
"
```

**Member 3 — `productivityForecast.js`**
```bash
node -e "
const {ProductivityForecastEngine} = require('./js/productivityForecast.js');
const eng = new ProductivityForecastEngine();
const curve = eng.buildDailyCurve(new Date(2026,0,1,7,0), {sleepQuality:3, debtHours:-2, cyclesAchieved:5});
console.log(curve);
console.log(eng.getLowEnergyHours(curve), eng.getDailyScore(curve));
"
```

**Member 4 — `historyTracker.js`**
```bash
node -e "
const {UndoStack, HistoryTracker} = require('./js/historyTracker.js');
const ht = new HistoryTracker(); const undo = new UndoStack();
ht.addEntry({date:'2026-01-03', hoursSlept:5}); undo.push({date:'2026-01-03'});
ht.addEntry({date:'2026-01-01', hoursSlept:6}); undo.push({date:'2026-01-01'});
console.log(ht.getAll());
console.log(ht.findByDate('2026-01-01'));
console.log(ht.getTrend(7));
const last = undo.pop();
console.log('undo ->', ht.removeEntry(last.date));
"
```

## After `app.js`/`index.html` changes: manual UI checklist

1. Open `index.html` in a browser, confirm no console errors.
2. Add/remove a task row, set a wake time, click **Build my schedule**.
3. Confirm bedtime options, nap windows, and caffeine cutoff all render.
4. Click **+ Log last night's sleep**, enter hours, confirm the debt and
   trend blocks update.
5. Click **Undo last log**, confirm the entry disappears from both blocks.
6. Refresh the page — confirm the sleep log persists (it's saved to
   `localStorage`).

## Commit messages

Prefix with your module, e.g. `sleepEngine: fix off-by-one in cycle count`,
`historyTracker: add getStreak()`. Keeps `git log` scannable across 4
contributors.
