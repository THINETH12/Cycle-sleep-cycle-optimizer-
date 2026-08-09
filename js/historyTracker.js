/**
 * ============================================================
 * MEMBER 4 — HISTORY, UNDO & TRENDS
 * (COHNDSE252F-021, D W R Yasas)
 * Data structures: Stack (undo) + a date-sorted array searched
 *   with binary search (trend queries)
 * Owns: js/historyTracker.js
 * ============================================================
 *
 * No DOM dependency and no dependency on any other module — like
 * the other three, it can be unit tested standalone with plain Node.
 */

/** Simple LIFO stack of loggable actions, used to support "Undo last night". */
class UndoStack {
  constructor() {
    this.stack = [];
  }

  /** @param {*} action - anything describing what was just done (kept opaque to this class) */
  push(action) {
    this.stack.push(action);
  }

  /** O(1) — removes and returns the most recent action, or null if empty */
  pop() {
    return this.stack.length ? this.stack.pop() : null;
  }

  canUndo() {
    return this.stack.length > 0;
  }

  size() {
    return this.stack.length;
  }
}

/**
 * Keeps a date-sorted array of nightly sleep entries so that lookups
 * and rolling trend queries don't require re-scanning or re-sorting
 * the whole log every time.
 */
class HistoryTracker {
  constructor() {
    this.entries = []; // [{date:'YYYY-MM-DD', hoursSlept:number}], kept sorted ascending by date
  }

  /** Binary search for the insertion index that keeps `entries` sorted by date. O(log n) */
  _lowerBound(date) {
    let lo = 0, hi = this.entries.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.entries[mid].date < date) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Binary search for an exact date match. Returns index, or -1 if not found. O(log n) */
  _binarySearch(date) {
    let lo = 0, hi = this.entries.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.entries[mid].date === date) return mid;
      if (this.entries[mid].date < date) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  /** @param {{date:string, hoursSlept:number}} entry — inserted in sorted position, O(log n + n) */
  addEntry(entry) {
    const idx = this._lowerBound(entry.date);
    this.entries.splice(idx, 0, entry);
  }

  /** Removes the entry for an exact date (used by Undo). Returns the removed entry or null. */
  removeEntry(date) {
    const idx = this._binarySearch(date);
    if (idx === -1) return null;
    return this.entries.splice(idx, 1)[0];
  }

  /** @param {string} date @returns {{date,hoursSlept}|null} O(log n) */
  findByDate(date) {
    const idx = this._binarySearch(date);
    return idx === -1 ? null : this.entries[idx];
  }

  /**
   * Rolling window stats over the most recent `days` entries.
   * @param {number} days
   * @returns {{avg:number, best:{date,hoursSlept}|null, worst:{date,hoursSlept}|null, entries:object[]}}
   */
  getTrend(days = 7) {
    const recent = this.entries.slice(-days);
    if (recent.length === 0) return { avg: 0, best: null, worst: null, entries: [] };
    const avg = +(recent.reduce((s, e) => s + e.hoursSlept, 0) / recent.length).toFixed(1);
    const best = recent.reduce((a, b) => (b.hoursSlept > a.hoursSlept ? b : a));
    const worst = recent.reduce((a, b) => (b.hoursSlept < a.hoursSlept ? b : a));
    return { avg, best, worst, entries: recent };
  }

  getAll() {
    return this.entries.slice();
  }
}

if (typeof window !== 'undefined') {
  window.UndoStack = UndoStack;
  window.HistoryTracker = HistoryTracker;
}
if (typeof module !== 'undefined') {
  module.exports = { UndoStack, HistoryTracker };
}
