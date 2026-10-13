/**
 * Custom Min-Heap implementation for Dijkstra's Shortest Path algorithm.
 * Stores elements with priorities (distances) and supports O(log N) insert/extract.
 */
export class MinHeapElement {
  constructor(data, priority) {
    this.data = data; // e.g. nodeId
    this.priority = priority; // e.g. distance cost
  }
}

export class MinHeap {
  constructor() {
    this.heap = [];
  }

  getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  getRightChildIndex(i) {
    return 2 * i + 2;
  }

  swap(i, j) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  insert(data, priority) {
    const element = new MinHeapElement(data, priority);
    this.heap.push(element);
    this.heapifyUp();
    return element;
  }

  heapifyUp() {
    let index = this.heap.length - 1;
    while (
      index > 0 &&
      this.heap[index].priority < this.heap[this.getParentIndex(index)].priority
    ) {
      const parentIndex = this.getParentIndex(index);
      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  extractMin() {
    if (this.isEmpty()) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return min;
  }

  heapifyDown(index = 0) {
    let smallest = index;
    const left = this.getLeftChildIndex(index);
    const right = this.getRightChildIndex(index);
    const size = this.heap.length;

    if (left < size && this.heap[left].priority < this.heap[smallest].priority) {
      smallest = left;
    }

    if (right < size && this.heap[right].priority < this.heap[smallest].priority) {
      smallest = right;
    }

    if (smallest !== index) {
      this.swap(index, smallest);
      this.heapifyDown(smallest);
    }
  }

  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  // Returns array snapshot for algorithmic visualizer
  getSnapshot() {
    return this.heap.map(el => ({ data: el.data, priority: Number(el.priority.toFixed(2)) }));
  }
}
