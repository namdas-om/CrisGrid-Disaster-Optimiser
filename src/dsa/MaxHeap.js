export class IncidentRequest {
  constructor(id, title, nodeId, severity, victims, riskScore = 1.0, type = 'GENERAL') {
    this.id = id;
    this.title = title;
    this.nodeId = nodeId;
    this.severity = severity; // 1 (Minor) to 5 (Critical)
    this.victims = victims;   // Count of stranded people
    this.riskScore = riskScore;
    this.type = type;
    this.status = 'PENDING'; // 'PENDING', 'DISPATCHED', 'RESOLVED'
    this.assignedUnit = null;
    this.createdAt = new Date().toISOString();
    this.priorityScore = this.calculatePriority();
  }

  calculatePriority() {
    // Formula: Score = (Severity * 20) + (Victims * 0.5) + (Risk * 10)
    return (this.severity * 20) + (this.victims * 0.5) + (this.riskScore * 10);
  }
}

export class MaxHeap {
  constructor() {
    this.heap = [];
  }

  size() { return this.heap.length; }

  getParentIndex(i) { return Math.floor((i - 1) / 2); }
  getLeftChildIndex(i) { return 2 * i + 1; }
  getRightChildIndex(i) { return 2 * i + 2; }

  swap(i1, i2) {
    const temp = this.heap[i1];
    this.heap[i1] = this.heap[i2];
    this.heap[i2] = temp;
  }

  peek() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  insert(data) {
    const incident = data instanceof IncidentRequest
      ? data
      : new IncidentRequest(data.id, data.title, data.nodeId, data.severity, data.victims, data.riskScore || 1.0, data.type || 'GENERAL');
    this.heap.push(incident);
    this.heapifyUp();
    return incident;
  }

  heapifyUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const parentIndex = this.getParentIndex(index);
      if (this.heap[index].priorityScore > this.heap[parentIndex].priorityScore) {
        this.swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return root;
  }

  heapifyDown(index = 0) {
    let maxIndex = index;
    const size = this.heap.length;

    while (index < size) {
      const left = this.getLeftChildIndex(index);
      const right = this.getRightChildIndex(index);

      if (left < size && this.heap[left].priorityScore > this.heap[maxIndex].priorityScore) {
        maxIndex = left;
      }
      if (right < size && this.heap[right].priorityScore > this.heap[maxIndex].priorityScore) {
        maxIndex = right;
      }

      if (maxIndex !== index) {
        this.swap(index, maxIndex);
        index = maxIndex;
      } else {
        break;
      }
    }
  }

  getSortedList() {
    return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
  }
}
