export function findShortestPath(graph, startNodeId, endNodeId, weights = { alpha: 1.0, beta: 1.0, gamma: 0.5 }) {
  const nodes = graph.getAllNodes();
  const distances = {};
  const previous = {};
  const unvisited = new Set();
  const edgeUsed = {};

  nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  });

  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    let currentId = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentId = nodeId;
      }
    }

    if (currentId === null || minDistance === Infinity) break;
    if (currentId === endNodeId) break;

    unvisited.delete(currentId);

    const neighbors = graph.getNeighbors(currentId);
    for (const edge of neighbors) {
      if (edge.status === 'BLOCKED') continue;
      const neighborId = edge.to;
      if (!unvisited.has(neighborId)) continue;

      const weight = edge.getEffectiveWeight(weights.alpha, weights.beta, weights.gamma);
      if (weight === Infinity) continue;

      const newDist = distances[currentId] + weight;
      if (newDist < distances[neighborId]) {
        distances[neighborId] = newDist;
        previous[neighborId] = currentId;
        edgeUsed[neighborId] = edge;
      }
    }
  }

  // Reconstruction
  const path = [];
  const edges = [];
  let curr = endNodeId;

  if (distances[endNodeId] !== Infinity) {
    while (curr) {
      path.unshift(curr);
      if (edgeUsed[curr]) edges.unshift(edgeUsed[curr]);
      curr = previous[curr];
    }
  }

  return {
    startNodeId,
    endNodeId,
    path,
    edges,
    distance: distances[endNodeId] === Infinity ? 0 : distances[endNodeId],
    isReachable: distances[endNodeId] !== Infinity
  };
}

export function getDijkstraSteps(graph, startNodeId, endNodeId, weights = { alpha: 1.0, beta: 1.0, gamma: 0.5 }) {
  const steps = [];
  const nodes = graph.getAllNodes();
  const distances = {};
  const previous = {};
  const visited = new Set();
  const heap = [];

  nodes.forEach(n => {
    distances[n.id] = Infinity;
    previous[n.id] = null;
  });

  distances[startNodeId] = 0;
  heap.push({ nodeId: startNodeId, priority: 0 });

  steps.push({
    stepIndex: 0,
    description: `Initialization: Set dist[${startNodeId}] = 0, all other nodes = ∞. Push ${startNodeId} to priority queue.`,
    minHeapState: [...heap],
    distances: { ...distances },
    visited: Array.from(visited),
    currentNodeId: startNodeId
  });

  while (heap.length > 0) {
    heap.sort((a, b) => a.priority - b.priority);
    const { nodeId: currentId, priority: currentDist } = heap.shift();

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    steps.push({
      stepIndex: steps.length,
      description: `Popped node ${currentId} from Min-Heap with distance ${currentDist.toFixed(1)}. Marked visited.`,
      minHeapState: [...heap],
      distances: { ...distances },
      visited: Array.from(visited),
      currentNodeId: currentId
    });

    if (currentId === endNodeId) {
      steps.push({
        stepIndex: steps.length,
        description: `Target node ${endNodeId} reached! Shortest path search complete.`,
        minHeapState: [...heap],
        distances: { ...distances },
        visited: Array.from(visited),
        currentNodeId: currentId
      });
      break;
    }

    const neighbors = graph.getNeighbors(currentId);
    for (const edge of neighbors) {
      if (edge.status === 'BLOCKED') continue;
      const neighborId = edge.to;
      if (visited.has(neighborId)) continue;

      const weight = edge.getEffectiveWeight(weights.alpha, weights.beta, weights.gamma);
      if (weight === Infinity) continue;

      const alt = distances[currentId] + weight;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = currentId;
        heap.push({ nodeId: neighborId, priority: alt });

        steps.push({
          stepIndex: steps.length,
          description: `Relaxed edge ${currentId} ➔ ${neighborId}. Updated dist[${neighborId}] = ${alt.toFixed(1)}.`,
          minHeapState: [...heap],
          distances: { ...distances },
          visited: Array.from(visited),
          currentNodeId: neighborId
        });
      }
    }
  }

  return steps;
}
