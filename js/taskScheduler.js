/**
 * ============================================================
 * MEMBER 2 — TASK SCHEDULER & NAP/CAFFEINE PLANNER
 * (COHNDSE252F-020, D M A Pamuditha)
 * Data structure: Priority Queue (binary min-heap keyed by importance)
 * Owns: js/taskScheduler.js
 * ============================================================
 */

/** Generic binary min-heap based Priority Queue. Lower priority value = popped first. */
class PriorityQueue {
  constructor() {
    this.heap = []; // [{item, priority}]
  }

  size() { return this.heap.length; }
  isEmpty() { return this.heap.length === 0; }

  /** O(log n) */
  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /** O(log n) — removes and returns the item with the lowest priority value */
  pop() {
    if (this.isEmpty()) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return top.item;
  }

  /** O(1) */
  peek() {
    return this.isEmpty() ? null : this.heap[0].item;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _bubbleDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].priority < this.heap[smallest].priority) smallest = l;
      if (r < n && this.heap[r].priority < this.heap[smallest].priority) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/**
 * Stores the day's meetings/classes in a priority queue (keyed by importance,
 * highest importance = lowest priority value so it pops first), and derives
 * nap windows + a caffeine cutoff from them.
 */
class TaskScheduler {
  constructor() {
    this.pq = new PriorityQueue();
    this.tasks = []; // flat list kept alongside the heap, for chronological scanning
  }

  /** @param {{name:string, start:Date, end:Date, importance:number}} task importance 1(low)-5(high) */
  addTask(task) {
    this.pq.push(task, 6 - task.importance); // invert so importance 5 -> priority 1 (pops first)
    this.tasks.push(task);
  }

  /** Chronologically ordered copy of today's tasks. */
  getTasks() {
    return this.tasks.slice().sort((a, b) => a.start - b.start);
  }

  /**
   * Scans the gaps between chronologically ordered tasks for windows
   * long enough to nap in, scoring the 1–3pm post-lunch dip higher.
   * @param {number} minDuration - minimum gap length in minutes (default 20)
   * @returns {{start:Date, end:Date, durationMin:number, score:number}[]}
   */
  findNapWindows(minDuration = 20) {
    const sorted = this.getTasks();
    const windows = [];

    const scoreWindow = (start, end) => {
      const durationMin = Math.round((end - start) / 60000);
      const midHour = new Date((start.getTime() + end.getTime()) / 2).getHours();
      let score = Math.min(100, 40 + durationMin); // longer gaps score higher, capped
      if (midHour >= 13 && midHour < 15) score += 25; // post-lunch dip bonus
      return { start, end, durationMin, score: Math.min(100, score) };
    };

    for (let i = 0; i < sorted.length - 1; i++) {
      const gapStart = sorted[i].end;
      const gapEnd = sorted[i + 1].start;
      const durationMin = (gapEnd - gapStart) / 60000;
      if (durationMin >= minDuration) windows.push(scoreWindow(gapStart, gapEnd));
    }

    return windows.sort((a, b) => b.score - a.score);
  }

  /**
   * Recommends a last-coffee time: a fixed buffer before bedtime,
   * sized by caffeine sensitivity.
   * @param {Date} bedtime
   * @param {'low'|'normal'|'high'} sensitivity
   * @returns {{cutoff:Date, bufferHrs:number}}
   */
  suggestCaffeineCutoff(bedtime, sensitivity = 'normal') {
    const bufferHrs = { low: 6, normal: 8, high: 10 }[sensitivity] ?? 8;
    const cutoff = new Date(bedtime.getTime() - bufferHrs * 3600000);
    return { cutoff, bufferHrs };
  }
}

if (typeof window !== 'undefined') {
  window.PriorityQueue = PriorityQueue;
  window.TaskScheduler = TaskScheduler;
}
if (typeof module !== 'undefined') {
  module.exports = { PriorityQueue, TaskScheduler };
}
