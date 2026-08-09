# Cycle 🌙 — Sleep Cycle Optimizer with Nap Planner

A browser-based sleep and productivity planner. Give it a wake-up time and
today's schedule, and it will:

- suggest bedtimes aligned to 90-minute sleep cycles,
- find real nap windows in the gaps between your meetings/classes,
- recommend a caffeine cutoff time,
- track your weekly sleep debt (with undo),
- show a 7-day sleep trend, and
- forecast your hourly productivity for the day.

No build step, no backend, no dependencies — open `index.html` and go.

## Why

Bedtimes get picked arbitrarily, short breaks rarely get used for a proper
nap, and caffeine is often consumed too close to bedtime without realising
the effect on sleep quality. Cycle turns those three decisions into
something computed from your actual schedule instead of guessed.

## Demo

```bash
git clone https://github.com/<your-org>/cycle.git
cd cycle
open index.html          # macOS
# or: npx serve .        # any OS, serves on http://localhost:3000
```

## Data structures & algorithms

| Module | Data structure / algorithm | What it's for |
|---|---|---|
| `js/sleepEngine.js` | **Graph** (cycle-boundary nodes, 90-min edges) | Bedtime / wake-time options + sleep debt |
| `js/taskScheduler.js` | **Priority Queue** (binary min-heap, keyed by task importance) | Nap-window finder + caffeine cutoff |
| `js/productivityForecast.js` | **Two-process model** (homeostatic pressure + circadian rhythm) | Hourly alertness / productivity forecast |
| `js/historyTracker.js` | **Stack** (undo) + **sorted array with binary search** | Undo last sleep log + 7-day trend queries |

Each algorithm file has zero dependency on the DOM or on each other — every
one can be required and unit tested directly in Node. `js/app.js` is the
only file that touches `document`; it's where all four modules meet.

## Project structure

```
cycle/
├── index.html                   # page structure
├── css/
│   └── style.css                # visual design (night/celestial theme)
├── js/
│   ├── sleepEngine.js           # Graph: bedtime/waketime + sleep debt
│   ├── taskScheduler.js         # Priority Queue: naps + caffeine cutoff
│   ├── productivityForecast.js  # Two-process model: hourly alertness
│   ├── historyTracker.js        # Stack + binary search: undo + trends
│   └── app.js                   # integration layer
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## Function reference

```js
// sleepEngine.js
new SleepCycleGraph(cycleLengthMin?, fallAsleepBufferMin?)
  .getBedtimeOptions(wakeTime: Date, minCycles?, maxCycles?) -> [{cycles, bedtime, totalSleepHrs}]
  .getWaketimeOptions(bedtime: Date, minCycles?, maxCycles?) -> [{cycles, waketime, totalSleepHrs}]
new SleepDebtCalculator(recommendedHours?)
  .addNight(date: string, hoursSlept: number) -> void
  .removeLastNight() -> {date, hoursSlept} | null
  .getWeeklyDebt() -> number
  .getStatus() -> 'well-rested' | 'mild-debt' | 'moderate-debt' | 'severe-debt'
  .getLog() -> array

// taskScheduler.js
new TaskScheduler()
  .addTask({name, start: Date, end: Date, importance: 1-5}) -> void
  .findNapWindows(minDuration?: number) -> [{start, end, durationMin, score}]
  .suggestCaffeineCutoff(bedtime: Date, sensitivity?: 'low'|'normal'|'high') -> {cutoff, bufferHrs}

// productivityForecast.js
new ProductivityForecastEngine(baseline?: number)
  .forecastAt(wakeTime: Date, atTime: Date, {sleepQuality, debtHours, cyclesAchieved}) -> number (0-100)
  .buildDailyCurve(wakeTime: Date, adjustments, endHour?: number) -> [{hour, label, score}]
  .getLowEnergyHours(curve, threshold?: number) -> number[]
  .getDailyScore(curve) -> number

// historyTracker.js
new UndoStack()
  .push(action) -> void
  .pop() -> action | null
  .canUndo() -> boolean
new HistoryTracker()
  .addEntry({date, hoursSlept}) -> void            // inserted in sorted position
  .removeEntry(date) -> {date, hoursSlept} | null
  .findByDate(date) -> {date, hoursSlept} | null    // binary search, O(log n)
  .getTrend(days?: number) -> {avg, best, worst, entries}
```

## Testing

Every algorithm module is DOM-free, so it's testable standalone:

```bash
node -e "
const {SleepCycleGraph} = require('./js/sleepEngine.js');
console.log(new SleepCycleGraph().getBedtimeOptions(new Date(2026,0,1,7,0)));
"
```

See `CONTRIBUTING.md` for the full set of test snippets (one per module) and
the manual UI test checklist.

## Team

| Member | Student ID | Owns |
|---|---|---|
| W A T Nirmal | COHNDSE252F-022 | `sleepEngine.js`, `index.html`, `app.js` |
| D M A Pamuditha | COHNDSE252F-020 | `taskScheduler.js` |
| D Elangovan | COHNDSE252F-017 | `productivityForecast.js`, `css/style.css` |
| D W R Yasas | COHNDSE252F-021 | `historyTracker.js` |

Built for the **Programming, Data Structures and Algorithms (PDSA)** module,
HND in Software Engineering, batch HNDSE252F.

## License

MIT — see [LICENSE](LICENSE).
