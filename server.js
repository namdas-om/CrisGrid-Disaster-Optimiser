import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Graph } from './src/dsa/Graph.js';
import { MaxHeap } from './src/dsa/MaxHeap.js';
import { findShortestPath, getDijkstraSteps } from './src/dsa/Dijkstra.js';
import { bfsReachability, dfsFindCriticalBridges } from './src/dsa/BFSDFS.js';
import { calculateMultipleRoutes } from './src/dsa/MultiRoute.js';
import { allocateShelterAndResources } from './src/dsa/ResourceAllocator.js';
import { PRESET_SCENARIOS } from './src/scenarios/presetScenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GLOBAL STATE
let currentScenario = PRESET_SCENARIOS.COASTAL_FLOOD;
let activeGraph = new Graph();
let triageHeap = new MaxHeap();
let activeDispatches = [];
let incidents = [];
let resources = { rescueVehicles: [], hospitals: [], shelters: [], supplies: [] };
let simulationTickCount = 0;
let rerouteAlerts = [];
let eventLog = [];
let incidentCounter = 0;

function loadScenario(scenarioKey) {
  const scenario = PRESET_SCENARIOS[scenarioKey] || PRESET_SCENARIOS.COASTAL_FLOOD;
  currentScenario = scenario;
  activeGraph = new Graph();
  triageHeap = new MaxHeap();
  activeDispatches = [];
  incidents = [];
  simulationTickCount = 0;
  rerouteAlerts = [];
  eventLog = [];
  incidentCounter = 0;

  scenario.nodes.forEach(n => activeGraph.addNode(n));
  scenario.edges.forEach(e => activeGraph.addEdge(e));
  resources = generateResources(scenario);

  if (scenario.initialIncidents) {
    scenario.initialIncidents.forEach(inc => {
      incidentCounter++;
      const newInc = triageHeap.insert({ ...inc, id: `INC-${String(incidentCounter).padStart(3, '0')}` });
      incidents.push(newInc);
    });
  }

  addEvent('SYSTEM', `Loaded scenario: ${scenario.name}`);
}

function generateResources(scenario) {
  const nodes = scenario.nodes;
  const hospitalNodes = nodes.filter(n => n.type === 'HOSPITAL');
  const shelterNodes = nodes.filter(n => n.type === 'SHELTER');

  return {
    rescueVehicles: [
      { id: 'RV-01', name: 'Rescue Alpha', status: 'AVAILABLE', currentNodeId: nodes[0]?.id || 'N1', type: 'AMBULANCE', capacity: 10 },
      { id: 'RV-02', name: 'Rescue Bravo', status: 'AVAILABLE', currentNodeId: nodes[1]?.id || 'N2', type: 'FIRE_TRUCK', capacity: 15 },
      { id: 'RV-03', name: 'Rescue Charlie', status: 'AVAILABLE', currentNodeId: hospitalNodes[0]?.id || 'N3', type: 'HELICOPTER', capacity: 8 },
      { id: 'RV-04', name: 'Rescue Delta', status: 'AVAILABLE', currentNodeId: shelterNodes[0]?.id || 'N7', type: 'BOAT', capacity: 20 },
      { id: 'RV-05', name: 'Rescue Echo', status: 'AVAILABLE', currentNodeId: nodes[2]?.id || 'N3', type: 'AMBULANCE', capacity: 10 }
    ],
    hospitals: hospitalNodes.map(h => ({
      id: h.id, name: h.name, beds: h.beds || 100, occupiedBeds: h.occupiedBeds || 30
    })),
    shelters: shelterNodes.map(s => ({
      id: s.id, name: s.name, capacity: s.capacity || 300, occupied: s.occupied || 50
    })),
    supplies: {
      medical: { name: 'Medical Kits', quantity: 450, max: 500, unit: 'kits' },
      food: { name: 'Food Rations', quantity: 1800, max: 2000, unit: 'packs' },
      water: { name: 'Clean Water', quantity: 2400, max: 3000, unit: 'liters' },
      generators: { name: 'Power Generators', quantity: 35, max: 50, unit: 'units' }
    }
  };
}

function addEvent(type, message) {
  const event = { id: `EVT-${Date.now()}`, type, message, timestamp: new Date().toLocaleTimeString() };
  eventLog.unshift(event);
  if (eventLog.length > 50) eventLog.pop();
  return event;
}

loadScenario('COASTAL_FLOOD');

// REST API ENDPOINTS
app.get('/api/state', (req, res) => {
  const bridges = dfsFindCriticalBridges(activeGraph);
  const firstNode = activeGraph.getAllNodes()[0]?.id;
  const reachability = firstNode ? bfsReachability(activeGraph, firstNode) : { reachableCount: 0, totalNodes: 0, isolatedNodes: [] };

  res.json({
    scenario: { id: currentScenario.id, name: currentScenario.name, description: currentScenario.description, disasterType: currentScenario.disasterType },
    graph: activeGraph.toJSON(),
    triageQueue: triageHeap.getSortedList(),
    incidents,
    dispatches: activeDispatches,
    resources,
    criticalBridges: bridges,
    reachability,
    rerouteAlerts,
    eventLog: eventLog.slice(0, 20),
    tickCount: simulationTickCount
  });
});

app.post('/api/scenario/select', (req, res) => {
  const { scenarioId } = req.body;
  if (PRESET_SCENARIOS[scenarioId]) {
    loadScenario(scenarioId);
    res.json({ success: true, message: `Loaded ${PRESET_SCENARIOS[scenarioId].name}` });
  } else {
    res.status(400).json({ success: false, message: 'Invalid scenario ID' });
  }
});

app.post('/api/road/toggle', (req, res) => {
  const { from, to } = req.body;
  const newStatus = activeGraph.toggleEdgeBlock(from, to);
  if (!newStatus) return res.status(404).json({ success: false });

  addEvent('ROAD', `Road ${from} ↔ ${to} ${newStatus === 'BLOCKED' ? 'BLOCKED' : 'REOPENED'}`);

  // Dynamic Watchdog Reroute Analysis
  const affected = activeDispatches.filter(d =>
    d.status === 'IN_TRANSIT' && d.remainingEdges?.some(e =>
      (e.from === from && e.to === to) || (e.from === to && e.to === from)
    )
  );

  const reroutes = [];
  for (const dispatch of affected) {
    const curr = dispatch.currentLocationNodeId || dispatch.startNodeId;
    const newRoute = findShortestPath(activeGraph, curr, dispatch.targetNodeId);

    const alert = {
      id: `ALERT-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      unitId: dispatch.unitId,
      blockedEdge: `${from} ➔ ${to}`,
      isReachable: newRoute.isReachable,
      message: newRoute.isReachable
        ? `Road ${from}↔${to} blocked. Unit ${dispatch.unitId} rerouted via ${newRoute.path.join(' ➔ ')}.`
        : `CRITICAL: Target node ${dispatch.targetNodeId} unreachable for unit ${dispatch.unitId}!`
    };

    rerouteAlerts.unshift(alert);
    if (rerouteAlerts.length > 20) rerouteAlerts.pop();
    reroutes.push(alert);

    if (newRoute.isReachable) {
      dispatch.path = newRoute.path;
      dispatch.edges = newRoute.edges;
      dispatch.remainingEdges = [...newRoute.edges];
      dispatch.distance = newRoute.distance;
      dispatch.status = 'REROUTED';
    } else {
      dispatch.status = 'STRANDED';
    }
  }

  res.json({ success: true, from, to, newStatus, reroutes });
});

app.post('/api/route/calculate', (req, res) => {
  const { startNodeId, endNodeId, alpha = 1.0, beta = 1.0, gamma = 0.5 } = req.body;
  const multiRoutes = calculateMultipleRoutes(activeGraph, startNodeId, endNodeId, 3);
  const dijkstraSteps = getDijkstraSteps(activeGraph, startNodeId, endNodeId, { alpha, beta, gamma });

  res.json({ startNodeId, endNodeId, weights: { alpha, beta, gamma }, routes: multiRoutes, dijkstraSteps });
});

app.post('/api/triage/add', (req, res) => {
  const { title, nodeId, type = 'GENERAL', severity = 4, victims = 15 } = req.body;
  incidentCounter++;
  const id = `INC-${String(incidentCounter).padStart(3, '0')}`;
  const newInc = triageHeap.insert({ id, title, nodeId, type, severity: Number(severity), victims: Number(victims) });
  incidents.push(newInc);
  addEvent('INCIDENT', `Emergency SOS reported: ${title} at ${nodeId} (Severity ${severity})`);
  res.json({ success: true, incident: newInc, queueSize: triageHeap.size() });
});

app.post('/api/dispatch/create', (req, res) => {
  const { incidentId } = req.body;
  const incident = incidents.find(i => i.id === incidentId) || triageHeap.heap.find(i => i.id === incidentId);
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

  const allocation = allocateShelterAndResources(activeGraph, incident);
  if (!allocation.success) return res.status(400).json({ success: false, reason: allocation.reason });

  const vehicle = resources.rescueVehicles.find(v => v.status === 'AVAILABLE') || resources.rescueVehicles[0];
  if (vehicle) vehicle.status = 'DISPATCHED';

  // Mark status as DISPATCHED in both places
  incident.status = 'DISPATCHED';
  incident.assignedUnit = vehicle.id;

  const heapInc = triageHeap.heap.find(i => i.id === incidentId);
  if (heapInc) {
    heapInc.status = 'DISPATCHED';
    heapInc.assignedUnit = vehicle.id;
  }

  const dispatch = {
    unitId: vehicle.id,
    assignedVehicleId: vehicle.id,
    incidentId: incident.id,
    incidentTitle: incident.title,
    victims: incident.victims,
    startNodeId: incident.nodeId,
    targetNodeId: allocation.allocatedShelter.shelterId,
    shelterName: allocation.allocatedShelter.shelterName,
    path: allocation.allocatedShelter.path,
    edges: allocation.allocatedShelter.edges,
    remainingEdges: [...allocation.allocatedShelter.edges],
    currentLocationNodeId: incident.nodeId,
    progressPercent: 0,
    status: 'IN_TRANSIT'
  };

  activeDispatches.push(dispatch);
  addEvent('DISPATCH', `Fleet unit ${vehicle.name} (${vehicle.id}) dispatched to ${incident.title}`);
  res.json({ success: true, dispatch, allocation });
});

app.post('/api/simulate/tick', (req, res) => {
  simulationTickCount++;

  for (const dispatch of activeDispatches) {
    if (dispatch.status !== 'IN_TRANSIT' && dispatch.status !== 'REROUTED') continue;
    dispatch.progressPercent += 33;
    if (dispatch.progressPercent >= 100) {
      dispatch.progressPercent = 0;
      if (dispatch.remainingEdges.length > 0) {
        const completed = dispatch.remainingEdges.shift();
        dispatch.currentLocationNodeId = completed.to;
      }
      if (dispatch.remainingEdges.length === 0) {
        dispatch.status = 'ARRIVED';
        const shelter = activeGraph.getNode(dispatch.targetNodeId);
        if (shelter) shelter.occupied = Math.min(shelter.capacity || 9999, (shelter.occupied || 0) + (dispatch.victims || 0));
        const vehicle = resources.rescueVehicles.find(v => v.id === dispatch.unitId);
        if (vehicle) vehicle.status = 'AVAILABLE';

        // Mark incident as RESOLVED in both places
        const inc = incidents.find(i => i.id === dispatch.incidentId);
        if (inc) inc.status = 'RESOLVED';
        const heapInc = triageHeap.heap.find(i => i.id === dispatch.incidentId);
        if (heapInc) heapInc.status = 'RESOLVED';

        addEvent('ARRIVAL', `Unit ${dispatch.unitId} arrived safely at ${dispatch.shelterName}. Incident ${dispatch.incidentId} RESOLVED.`);
      }
    }
  }

  res.json({ success: true, tickCount: simulationTickCount });
});

app.post('/api/simulate/random-event', (req, res) => {
  const events = [
    { type: 'ROAD_BLOCK', message: 'Landslide blocked main bridge corridor.' },
    { type: 'HAZARD_SPIKE', message: 'Flash flood level escalated along river road.' },
    { type: 'NEW_INCIDENT', message: 'New SOS call: Stranded victims reported in Sector 4.' }
  ];

  const chosen = events[Math.floor(Math.random() * events.length)];

  if (chosen.type === 'ROAD_BLOCK') {
    const openEdges = activeGraph.getAllEdges().filter(e => e.status === 'OPEN');
    if (openEdges.length > 0) {
      const target = openEdges[Math.floor(Math.random() * openEdges.length)];
      activeGraph.setEdgeStatus(target.from, target.to, 'BLOCKED');
      chosen.message = `Disaster road collapse: Edge ${target.from}↔${target.to} BLOCKED!`;
    }
  }

  addEvent('SIM_EVENT', chosen.message);
  res.json({ success: true, event: chosen });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  CRISISGRID — Dynamic Disaster Response Optimizer ║
  ║  Server running at http://localhost:${PORT}          ║
  ╚═══════════════════════════════════════════════════╝
  `);
});
