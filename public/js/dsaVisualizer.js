export class DSAVisualizer {
  constructor() {
    this.stepperLogMessage = document.getElementById('stepperLog') || document.getElementById('stepperLogMessage');
    this.minHeapStateView = document.getElementById('heapView') || document.getElementById('minHeapStateView');
    this.distTableView = document.getElementById('distView') || document.getElementById('distTableView');
    this.visitedNodesView = document.getElementById('visitedView') || document.getElementById('visitedNodesView');
    this.stepCounterText = document.getElementById('stepCounter') || document.getElementById('stepCounterText');

    this.steps = [];
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.timer = null;
  }

  setSteps(steps) {
    this.steps = steps || [];
    this.currentStepIndex = 0;
    this.stopAutoPlay();
    this.renderCurrentStep();
  }

  renderCurrentStep() {
    if (!this.steps || this.steps.length === 0) {
      if (this.stepCounterText) this.stepCounterText.textContent = 'STEP 0 / 0';
      if (this.stepperLogMessage) this.stepperLogMessage.textContent = 'Awaiting pathfinding execution...';
      if (this.minHeapStateView) this.minHeapStateView.innerHTML = '<span class="empty-state">No heap data</span>';
      if (this.distTableView) this.distTableView.innerHTML = '<span class="empty-state">No dist data</span>';
      if (this.visitedNodesView) this.visitedNodesView.innerHTML = '<span class="empty-state">No visited data</span>';
      return;
    }

    const step = this.steps[this.currentStepIndex];

    if (this.stepCounterText) {
      this.stepCounterText.textContent = `STEP ${this.currentStepIndex + 1} / ${this.steps.length}`;
    }

    if (this.stepperLogMessage) {
      this.stepperLogMessage.textContent = step.description || '';
    }

    if (this.minHeapStateView) {
      const heapData = step.minHeapState || step.heap;
      if (heapData && heapData.length > 0) {
        this.minHeapStateView.innerHTML = heapData.map(h => {
          const nodeId = h.data || h.nodeId || '?';
          const pri = h.priority === Infinity || h.priority === null ? '∞' : h.priority;
          return `<span class="heap-node-badge">[${nodeId}: ${pri}]</span>`;
        }).join(' ');
      } else {
        this.minHeapStateView.innerHTML = '<span class="empty-state">Empty Heap</span>';
      }
    }

    if (this.distTableView) {
      if (step.distances) {
        const dists = Object.keys(step.distances);
        if (dists.length > 0) {
          this.distTableView.innerHTML = dists.map(nodeId => {
             const d = step.distances[nodeId];
             const displayDist = d === Infinity ? '∞' : d;
             return `<span class="dist-badge">${nodeId}: ${displayDist}</span>`;
          }).join(' ');
        } else {
          this.distTableView.innerHTML = '<span class="empty-state">Empty</span>';
        }
      }
    }

    if (this.visitedNodesView) {
      if (step.visited && step.visited.length > 0) {
        this.visitedNodesView.innerHTML = step.visited.map(nodeId => `<span class="visited-badge">${nodeId}</span>`).join(' ');
      } else {
        this.visitedNodesView.innerHTML = '<span class="empty-state">None</span>';
      }
    }
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.renderCurrentStep();
    } else {
      this.stopAutoPlay();
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.renderCurrentStep();
    }
  }

  toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    if (this.currentStepIndex >= this.steps.length - 1 && this.steps.length > 0) {
      this.currentStepIndex = 0; // loop back to start if at end
    }
    this.isPlaying = true;
    this.renderCurrentStep();
    this.timer = setInterval(() => {
      this.nextStep();
    }, 800);
  }

  stopAutoPlay() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
