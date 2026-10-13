export class Node {
  constructor(id, name, type, x, y, extra = {}) {
    this.id = id;
    this.name = name;
    this.type = type; // 'HUB', 'SHELTER', 'HOSPITAL', 'SUPPLY_DEPOT', 'INCIDENT'
    this.x = x;
    this.y = y;
    this.capacity = extra.capacity || 0;
    this.occupied = extra.occupied || 0;
    this.beds = extra.beds || 0;
    this.occupiedBeds = extra.occupiedBeds || 0;
    this.strandedCount = extra.strandedCount || 0;
    this.hazardScore = extra.hazardScore || 0;
  }
}

export class Edge {
  constructor(id, from, to, distance, hazardLevel = 'LOW', status = 'OPEN', capacity = 100) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.distance = distance; // km
    this.hazardLevel = hazardLevel; // 'LOW', 'MEDIUM', 'HIGH', 'EXTREME'
    this.status = status; // 'OPEN', 'BLOCKED'
    this.capacity = capacity;
  }

  getRiskMultiplier() {
    switch (this.hazardLevel) {
      case 'EXTREME': return 5.0;
      case 'HIGH': return 3.0;
      case 'MEDIUM': return 1.8;
      case 'LOW':
      default: return 1.0;
    }
  }

  getEffectiveWeight(alpha = 1.0, beta = 1.0, gamma = 0.5) {
    if (this.status === 'BLOCKED') return Infinity;
    const travelTime = this.distance;
    const riskMultiplier = this.getRiskMultiplier();
    const congestionFactor = (100 - Math.min(100, this.capacity)) / 100;

    return (alpha * travelTime) + (beta * travelTime * (riskMultiplier - 1)) + (gamma * congestionFactor * travelTime);
  }
}

export class Graph {
  constructor() {
    this.nodes = new Map();
    this.adjacencyList = new Map();
    this.edges = new Map();
  }

  addNode(nodeData) {
    const node = nodeData instanceof Node ? nodeData : new Node(nodeData.id, nodeData.name, nodeData.type, nodeData.x, nodeData.y, nodeData);
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
    return node;
  }

  addEdge(edgeData) {
    const id = edgeData.id || `${edgeData.from}-${edgeData.to}`;
    const edge = edgeData instanceof Edge ? edgeData : new Edge(id, edgeData.from, edgeData.to, edgeData.distance, edgeData.hazardLevel, edgeData.status, edgeData.capacity);

    this.edges.set(edge.id, edge);

    if (!this.adjacencyList.has(edge.from)) this.adjacencyList.set(edge.from, []);
    if (!this.adjacencyList.has(edge.to)) this.adjacencyList.set(edge.to, []);

    this.adjacencyList.get(edge.from).push(edge);

    // Undirected graph representation for road network
    const reverseId = `${edge.to}-${edge.from}`;
    const reverseEdge = new Edge(reverseId, edge.to, edge.from, edge.distance, edge.hazardLevel, edge.status, edge.capacity);
    this.edges.set(reverseId, reverseEdge);
    this.adjacencyList.get(edge.to).push(reverseEdge);

    return edge;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getNeighbors(nodeId) {
    return this.adjacencyList.get(nodeId) || [];
  }

  toggleEdgeBlock(from, to) {
    let edge1 = this.edges.get(`${from}-${to}`);
    let edge2 = this.edges.get(`${to}-${from}`);

    if (edge1) {
      const newStatus = edge1.status === 'BLOCKED' ? 'OPEN' : 'BLOCKED';
      edge1.status = newStatus;
      if (edge2) edge2.status = newStatus;
      return newStatus;
    }
    return null;
  }

  setEdgeStatus(from, to, status) {
    let edge1 = this.edges.get(`${from}-${to}`);
    let edge2 = this.edges.get(`${to}-${from}`);
    if (edge1) edge1.status = status;
    if (edge2) edge2.status = status;
  }

  setEdgeHazard(from, to, hazardLevel) {
    let edge1 = this.edges.get(`${from}-${to}`);
    let edge2 = this.edges.get(`${to}-${from}`);
    if (edge1) edge1.hazardLevel = hazardLevel;
    if (edge2) edge2.hazardLevel = hazardLevel;
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getAllEdges() {
    const seen = new Set();
    const result = [];
    for (const edge of this.edges.values()) {
      const pairKey = [edge.from, edge.to].sort().join('-');
      if (!seen.has(pairKey)) {
        seen.add(pairKey);
        result.push(edge);
      }
    }
    return result;
  }

  toJSON() {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges()
    };
  }
}
