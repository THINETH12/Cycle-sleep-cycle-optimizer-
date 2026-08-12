// js/taskScheduler.js - the heap fucntion 
class PriorityQueue {
  constructor() { this.heap = []; }
  size() { return this.heap.length; }
  isEmpty() { return this.heap.length === 0; }

  push(item, priority) {
    this.heap.push({ item, priority });
    this._bubbleUp(this.heap.length - 1);
  }

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

  peek() { return this.isEmpty() ? null : this.heap[0].item; }

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

window.PriorityQueue = PriorityQueue;

/**
  TASK SCHEDULER
 Stores the day's meetings/classes in chronological order.
 */
class TaskScheduler {
  constructor() {
    this.tasks = []; // {name, start: Date, end: Date, importance: 1-5}
  }

  /**
   * @param {{name:string, start:Date, end:Date, importance:number}} task
   */
  addTask(task) {
    this.tasks.push(task);
    this.tasks.sort((a, b) => a.start - b.start); // keep chronological order
  }

  // orders the copy of today's task//
  getTasks() {
    return this.tasks.slice();
  }
}

window.TaskScheduler = TaskScheduler;
