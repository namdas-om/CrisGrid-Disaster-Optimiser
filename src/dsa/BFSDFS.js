export function bfsReachability(graph, startNodeId) {
  const visited = new Set();
  const queue = [startNodeId];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = graph.getNeighbors(current);

    for (const edge of neighbors) {
      if (edge.status === 'BLOCKED') continue;
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
  }

  const allNodes = graph.getAllNodes();
  const isolatedNodes = allNodes.filter(n => !visited.has(n.id)).map(n => n.id);

  return {
    reachableCount: visited.size,
    totalNodes: allNodes.length,
    isolatedNodes
  };
}

export function dfsFindCriticalBridges(graph) {
  const nodes = graph.getAllNodes();
  const edges = graph.getAllEdges();
  const bridges = [];

  // Tarjan's DFS Bridge Detection
  let timer = 0;
  const dfn = {};
  const low = {};
  const parent = {};

  nodes.forEach(n => {
    dfn[n.id] = 0;
    low[n.id] = 0;
    parent[n.id] = null;
  });

  function dfs(u) {
    timer++;
    dfn[u] = low[u] = timer;

    const neighbors = graph.getNeighbors(u);
    for (const edge of neighbors) {
      if (edge.status === 'BLOCKED') continue;
      const v = edge.to;

      if (v === parent[u]) continue;

      if (dfn[v] > 0) {
        low[u] = Math.min(low[u], dfn[v]);
      } else {
        parent[v] = u;
        dfs(v);
        low[u] = Math.min(low[u], low[v]);

        if (low[v] > dfn[u]) {
          bridges.push({ from: u, to: v });
        }
      }
    }
  }

  nodes.forEach(n => {
    if (dfn[n.id] === 0) dfs(n.id);
  });

  return bridges;
}
