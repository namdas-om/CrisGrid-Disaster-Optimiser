import { findShortestPath } from './Dijkstra.js';

export function calculateMultipleRoutes(graph, startNodeId, endNodeId, limit = 3) {
  const routes = [];

  // 1. Primary Optimal Path
  const primary = findShortestPath(graph, startNodeId, endNodeId, { alpha: 1.0, beta: 1.0, gamma: 0.5 });
  if (primary.isReachable) {
    routes.push({
      id: 'ROUTE-PRIMARY',
      label: 'Primary Direct Corridor',
      type: 'PRIMARY',
      color: '#10b981',
      path: primary.path,
      edges: primary.edges,
      distance: primary.distance,
      riskRating: 'LOW'
    });
  }

  // 2. Secondary Safe Path (High Risk Penalty)
  const secondary = findShortestPath(graph, startNodeId, endNodeId, { alpha: 0.3, beta: 3.0, gamma: 0.5 });
  if (secondary.isReachable && JSON.stringify(secondary.path) !== JSON.stringify(primary.path)) {
    routes.push({
      id: 'ROUTE-SAFE',
      label: 'Secondary Bypass Corridor',
      type: 'SECONDARY',
      color: '#00f0ff',
      path: secondary.path,
      edges: secondary.edges,
      distance: secondary.distance,
      riskRating: 'VERY LOW'
    });
  }

  // 3. Backup Path (High Congestion Avoidance)
  const backup = findShortestPath(graph, startNodeId, endNodeId, { alpha: 0.5, beta: 0.5, gamma: 2.0 });
  if (backup.isReachable && !routes.some(r => JSON.stringify(r.path) === JSON.stringify(backup.path))) {
    routes.push({
      id: 'ROUTE-BACKUP',
      label: 'Emergency Backup Route',
      type: 'BACKUP',
      color: '#f59e0b',
      path: backup.path,
      edges: backup.edges,
      distance: backup.distance,
      riskRating: 'MODERATE'
    });
  }

  return { startNodeId, endNodeId, count: routes.length, routes };
}
