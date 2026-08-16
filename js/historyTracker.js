const MAX_TREND_DAYS = 7; // how many days to look back for a trend
const DATE_COMPARISON_EQUAL = 0;
const NOT_FOUND_INDEX = -1; // used when a date isn't found

// Stack for undo — last action added is first one removed
class UndoStack {
  constructor() {
    this.stack = [];
  }

  push(action) {
    this.stack.push(action);
  }

  pop() {
    if (this.stack.length === 0) return null;
    return this.stack.pop(); // removes and returns the last action
  }

  peek() {
    if (this.stack.length === 0) return null;
    return this.stack[this.stack.length - 1]; // just look, don't remove
  }

  canUndo() {
    return this.stack.length > 0;
  }

  size() {
    return this.stack.length;
  }

  clear() {
    this.stack = [];
  }
}

// Stores sleep entries sorted by date, uses binary search to find them fast
class HistoryTracker {
  constructor() {
    this.entries = [];
  }

  _isEmpty() {
    return this.entries.length === 0;
  }

  _midpoint(lo, hi) {
    return (lo + hi) >> 1; // middle index between lo and hi
  }

  // finds where a new date should be inserted to keep entries sorted
  _lowerBound(date) {
    let lo = 0;
    let hi = this.entries.length;
    while (lo < hi) {
      const mid = this._midpoint(lo, hi);
      const midDate = this.entries[mid].date;
      if (midDate < date) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  // binary search for an exact date match
  _binarySearch(date) {
    let lo = 0;
    let hi = this.entries.length - 1;
    while (lo <= hi) {
      const mid = this._midpoint(lo, hi);
      const midDate = this.entries[mid].date;
      if (midDate === date) {
        return mid;
      }
      if (midDate < date) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return NOT_FOUND_INDEX;
  }

  addEntry(entry) {
    const insertIndex = this._lowerBound(entry.date);
    this.entries.splice(insertIndex, 0, entry); // insert in sorted position
  }

  removeEntry(date) {
    const index = this._binarySearch(date);
    if (index === NOT_FOUND_INDEX) return null;
    const removed = this.entries.splice(index, 1);
    return removed[0];
  }

  findByDate(date) {
    const index = this._binarySearch(date);
    if (index === NOT_FOUND_INDEX) return null;
    return this.entries[index];
  }

  _recentEntries(days) {
    return this.entries.slice(-days); // last N entries
  }

  _averageHours(entries) {
    const total = entries.reduce((sum, entry) => sum + entry.hoursSlept, 0);
    return +(total / entries.length).toFixed(1);
  }

  _bestNight(entries) {
    return entries.reduce((best, current) =>
      current.hoursSlept > best.hoursSlept ? current : best
    );
  }

  _worstNight(entries) {
    return entries.reduce((worst, current) =>
      current.hoursSlept < worst.hoursSlept ? current : worst
    );
  }

  _emptyTrend() {
    return { avg: 0, best: null, worst: null, entries: [] };
  }

  // returns average, best, and worst sleep over recent days
  getTrend(days = MAX_TREND_DAYS) {
    const recent = this._recentEntries(days);
    if (recent.length === 0) {
      return this._emptyTrend();
    }
    return {
      avg: this._averageHours(recent),
      best: this._bestNight(recent),
      worst: this._worstNight(recent),
      entries: recent,
    };
  }

  getAll() {
    return this.entries.slice();
  }

  count() {
    return this.entries.length;
  }
}

if (typeof window !== 'undefined') {
  window.UndoStack = UndoStack;
  window.HistoryTracker = HistoryTracker;
}
if (typeof module !== 'undefined') {
  module.exports = { UndoStack, HistoryTracker };
}