import { findShortestPath } from './Dijkstra.js';

export function allocateShelterAndResources(graph, incidentRequest) {
  const nodes = graph.getAllNodes();
  const shelters = nodes.filter(n => (n.type === 'SHELTER' || n.type === 'HOSPITAL') && (n.capacity - n.occupied > 0 || n.beds - n.occupiedBeds > 0));

  if (shelters.length === 0) {
    return {
      success: false,
      reason: 'No operational shelters/hospitals with available capacity found!'
    };
  }

  // Find nearest shelter using Dijkstra
  let bestShelter = null;
  let minDistance = Infinity;
  let bestPath = null;

  for (const shelter of shelters) {
    const route = findShortestPath(graph, incidentRequest.nodeId, shelter.id);
    if (route.isReachable && route.distance < minDistance) {
      minDistance = route.distance;
      bestShelter = shelter;
      bestPath = route;
    }
  }

  if (!bestShelter) {
    return {
      success: false,
      reason: 'All available shelters are currently unreachable due to road blockages!'
    };
  }

  return {
    success: true,
    incidentId: incidentRequest.id,
    allocatedShelter: {
      shelterId: bestShelter.id,
      shelterName: bestShelter.name,
      type: bestShelter.type,
      distance: minDistance,
      path: bestPath.path,
      edges: bestPath.edges
    }
  };
}
