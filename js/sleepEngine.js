/**
 * ============================================================
 * MEMBER 1 — SLEEP CYCLE ENGINE   (COHNDSE252F-022, W A T Nirmal)
 * Data structure: Graph (each node = a sleep-cycle boundary)
 * Owns: js/sleepEngine.js
 * ============================================================
 *
 * A night of sleep is modeled as a directed graph:
 *   node(0) --90min--> node(1) --90min--> node(2) --...--> node(n)
 * Each node is a point where the body is naturally closer to
 * light sleep (a good moment to wake up). Traveling backward
 * from a fixed wake time along these edges gives candidate
 * bedtimes. Traveling forward from a fixed bedtime gives
 * candidate wake times. Traversal cost is O(numCycles).
 */

class SleepCycleGraph {
  /**
   * @param {number} cycleLengthMin - average length of one sleep cycle (default 90)
   * @param {number} fallAsleepBufferMin - avg time to actually fall asleep (default 15)
   */
  constructor(cycleLengthMin = 90, fallAsleepBufferMin = 15) {
    this.cycleLength = cycleLengthMin;
    this.fallAsleepBuffer = fallAsleepBufferMin;
    // adjacency list: node i -> node i+1, edge weight = cycleLength (minutes)
    this.graph = new Map();
  }

  /** Build graph nodes/edges for a given number of cycles. */
  _buildGraph(numCycles) {
    this.graph.clear();
    for (let i = 0; i < numCycles; i++) {
      this.graph.set(i, { next: i + 1, weightMin: this.cycleLength });
    }
    return this.graph;
  }

  /** Sum of edge weights from node 0 to node `numCycles`, plus fall-asleep buffer. */
  _totalMinutesForCycles(numCycles) {
    this._buildGraph(numCycles);
    let total = 0;
    for (let i = 0; i < numCycles; i++) total += this.graph.get(i).weightMin;
    return total + this.fallAsleepBuffer;
  }

  /**
   * Given a fixed WAKE time, walk the graph backward and return
   * candidate bedtimes for minCycles..maxCycles sleep cycles.
   * @param {Date} wakeTime
   * @param {number} minCycles
   * @param {number} maxCycles
   * @returns {{cycles:number, bedtime:Date, totalSleepHrs:number}[]}
   */
  getBedtimeOptions(wakeTime, minCycles = 3, maxCycles = 6) {
    const options = [];
    for (let c = maxCycles; c >= minCycles; c--) {
      const totalMin = this._totalMinutesForCycles(c);
      const bedtime = new Date(wakeTime.getTime() - totalMin * 60000);
      options.push({
        cycles: c,
        bedtime,
        totalSleepHrs: +((c * this.cycleLength) / 60).toFixed(1),
      });
    }
    return options;
  }

  /**
   * Given a fixed BEDTIME, walk the graph forward and return
   * candidate wake times for minCycles..maxCycles sleep cycles.
   * @param {Date} bedtime
   * @param {number} minCycles
   * @param {number} maxCycles
   * @returns {{cycles:number, waketime:Date, totalSleepHrs:number}[]}
   */
  getWaketimeOptions(bedtime, minCycles = 3, maxCycles = 6) {
    const options = [];
    for (let c = minCycles; c <= maxCycles; c++) {
      const totalMin = this._totalMinutesForCycles(c);
      const waketime = new Date(bedtime.getTime() + totalMin * 60000);
      options.push({
        cycles: c,
        waketime,
        totalSleepHrs: +((c * this.cycleLength) / 60).toFixed(1),
      });
    }
    return options;
  }
}

/**
 * Tracks a rolling 7-day sleep log and reports cumulative debt
 * against a recommended nightly target.
 */
class SleepDebtCalculator {
  /** @param {number} recommendedHours */
  constructor(recommendedHours = 8) {
    this.recommendedHours = recommendedHours;
    this.log = []; // [{date: 'YYYY-MM-DD', hoursSlept: number}], chronological
  }

  /** @param {string} date - 'YYYY-MM-DD' @param {number} hoursSlept */
  addNight(date, hoursSlept) {
    this.log.push({ date, hoursSlept });
    if (this.log.length > 7) this.log.shift(); // keep a 7-night rolling window
  }

  /** Removes the most recently added night (used to support Undo). */
  removeLastNight() {
    return this.log.pop() || null;
  }

  /** @returns {number} total hours short of (negative) or over (positive) target across the log */
  getWeeklyDebt() {
    if (this.log.length === 0) return 0;
    const total = this.log.reduce((s, n) => s + n.hoursSlept, 0);
    const target = this.recommendedHours * this.log.length;
    return +(total - target).toFixed(1);
  }

  /** @returns {'well-rested'|'mild-debt'|'moderate-debt'|'severe-debt'} */
  getStatus() {
    const debt = this.getWeeklyDebt();
    if (debt >= -2) return 'well-rested';
    if (debt >= -6) return 'mild-debt';
    if (debt >= -12) return 'moderate-debt';
    return 'severe-debt';
  }

  getLog() {
    return this.log.slice();
  }
}

if (typeof window !== 'undefined') {
  window.SleepCycleGraph = SleepCycleGraph;
  window.SleepDebtCalculator = SleepDebtCalculator;
}
if (typeof module !== 'undefined') {
  module.exports = { SleepCycleGraph, SleepDebtCalculator };
}
