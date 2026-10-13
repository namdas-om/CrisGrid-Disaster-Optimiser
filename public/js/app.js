import { CanvasRenderer } from './canvasRenderer.js';
import { DSAVisualizer } from './dsaVisualizer.js';
import { renderTriageQueue } from './triageUI.js';
import { renderShelters } from './shelterUI.js';

/* ════════════════════════════════════════════════════════════════
   CRISISGRID — MASTER APPLICATION CONTROLLER
   Full-stack tactical SPA engine with multi-canvas rendering,
   Dijkstra step debugging, priority triage queues, live telemetry,
   resource management, algorithm explorer, and operations analytics.
   ════════════════════════════════════════════════════════════════ */

// State Management
let appState = null;
let activePage = 'landing'; // 'landing' | 'command'
let activeView = 'command'; // 'command' | 'simulation' | 'routes' | 'incidents' | 'resources' | 'algorithms' | 'analytics' | 'about'
let autoSimTimer = null;
let currentActiveRoutes = [];
let incidentFilter = 'all';
let selectedProfile = 'fastest';
let eventLogs = [];

// Canvas Renderers
let graphCanvasRenderer = null;
let simCanvasRenderer = null;
let routeCanvasRenderer = null;
let heroAnimId = null;

// DSA Visualizer
let dsaVisualizer = null;

// Helper: Query Element
const $ = id => document.getElementById(id);

/* ── DOM Content Loaded Initialization ── */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[CrisisGrid] Engine Initializing...');

  dsaVisualizer = new DSAVisualizer();

  // Initialize Canvas Renderers
  initCanvases();

  // Bind Navigation and Interactive Events
  bindNavigation();
  bindCommandControls();
  bindSimControls();
  bindRouteControls();
  bindIncidentControls();
  bindModalControls();
  init3DTilt();

  // Render static algorithm and about views
  renderAlgorithmsView();
  renderAboutView();

  // Start Landing Page Hero Animation
  initHeroCanvas();

  // Window Resize Handler for Active View Canvases
  window.addEventListener('resize', () => {
    resizeActiveCanvas();
  });

  // Initial State Fetch & Poll Timer
  fetchState();
  setInterval(() => {
    fetchState(true); // silent fetch
  }, 2000);
});

/* ── Canvas Engine Initialization ── */
function initCanvases() {
  const tooltipEl = $('graphTooltip') || $('canvasTooltip');

  // Command Center Map Canvas
  const graphCanvas = $('graphCanvas');
  if (graphCanvas) {
    graphCanvasRenderer = new CanvasRenderer(graphCanvas, tooltipEl);
    graphCanvasRenderer.onRoadClick = (from, to) => toggleRoadBlock(from, to);
    graphCanvasRenderer.onNodeClick = (nodeId) => openNodeInspector(nodeId);
    graphCanvasRenderer.onCanvasBackgroundClick = () => closeNodeInspector();
  }

  // Simulation Map Canvas
  const simCanvas = $('simCanvas');
  if (simCanvas) {
    simCanvasRenderer = new CanvasRenderer(simCanvas, tooltipEl);
    simCanvasRenderer.onRoadClick = (from, to) => toggleRoadBlock(from, to);
    simCanvasRenderer.onNodeClick = (nodeId) => openNodeInspector(nodeId);
  }

  // Route Map Canvas
  const routeCanvas = $('routeCanvas');
  if (routeCanvas) {
    routeCanvasRenderer = new CanvasRenderer(routeCanvas, tooltipEl);
  }
}

/* ── Navigation Engine ── */
function bindNavigation() {
  // Page/View triggers: elements with [data-page]
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const target = el.getAttribute('data-page');

      if (target === 'landing') {
        switchPage('landing');
      } else {
        switchPage('command');
        switchView(target === 'command' ? 'command' : target);
      }
    });
  });

  // Sidebar link highlight
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetView = link.getAttribute('data-page');
      if (targetView === 'landing') {
        switchPage('landing');
      } else {
        switchPage('command');
        switchView(targetView);
      }
    });
  });
}

function switchPage(pageId) {
  activePage = pageId;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (pageId === 'landing') {
    const landingPage = $('page-landing');
    if (landingPage) landingPage.classList.add('active');
    initHeroCanvas();
  } else {
    const commandPage = $('page-command');
    if (commandPage) commandPage.classList.add('active');
    if (heroAnimId) {
      cancelAnimationFrame(heroAnimId);
      heroAnimId = null;
    }
    // Resize active canvas on page view switch
    setTimeout(resizeActiveCanvas, 100);
  }
}

function switchView(viewId) {
  // Translate route view alias
  if (viewId === 'routes') viewId = 'routes';

  activeView = viewId;

  // Update view visibility
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetViewEl = $(`view-${viewId}`);
  if (targetViewEl) targetViewEl.classList.add('active');

  // Update sidebar, pill & nav-tab active states
  document.querySelectorAll('.sidebar-link, .pill-link, .nav-tab').forEach(link => {
    const p = link.getAttribute('data-page');
    if (p === viewId || (viewId === 'routes' && p === 'routes') || (viewId === 'command' && p === 'command')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update Topbar Title
  const titleEl = $('pageTitle');
  if (titleEl) {
    const titleMap = {
      command: 'LIVE OPERATIONS COMMAND CENTER',
      simulation: 'DISASTER PROGRESSION ENGINE',
      routes: 'MULTI-OBJECTIVE ROUTE OPTIMIZER',
      incidents: 'TRIAGE & EMERGENCY INCIDENTS',
      resources: 'RESCUE FLEET & SUPPLY INVENTORY',
      algorithms: 'DSA CORE ARCHITECTURE EXPLORER',
      analytics: 'OPERATIONS ANALYTICS DASHBOARD',
      about: 'CRISISGRID SYSTEM OVERVIEW'
    };
    titleEl.textContent = titleMap[viewId] || 'OPERATIONS CENTER';
  }

  // Refresh icons & canvas sizes
  refreshIcons();
  setTimeout(resizeActiveCanvas, 80);

  if (appState) renderCurrentView();
}

/* ── Disabled Card Tilt (Static Stable Cards) ── */
function init3DTilt() {
  // Cards remain static and stable without wobbling or tilting
}

function resizeActiveCanvas() {
  if (activeView === 'command' && graphCanvasRenderer) graphCanvasRenderer.resize();
  if (activeView === 'simulation' && simCanvasRenderer) simCanvasRenderer.resize();
  if (activeView === 'routes' && routeCanvasRenderer) routeCanvasRenderer.resize();
}

/* ── Fetch State & Update App ── */
function fetchState(silent = false) {
  fetch('/api/state')
    .then(r => r.json())
    .then(state => {
      appState = state;
      updateTelemetry(state);
      populateAllDropdowns(state.graph.nodes);

      if (!silent) console.log('[CrisisGrid] State updated:', state);

      renderCurrentView();
    })
    .catch(err => {
      if (!silent) console.error('[CrisisGrid] API Fetch Error:', err);
    });
}

/* ── Telemetry & Header Counters ── */
function updateTelemetry(state) {
  // Topbar Metrics
  if ($('metricNodes')) $('metricNodes').textContent = state.graph.nodes.length;
  if ($('metricBlocked')) $('metricBlocked').textContent = state.graph.edges.filter(e => e.status === 'BLOCKED').length;
  if ($('metricIncidents')) $('metricIncidents').textContent = state.triageQueue ? state.triageQueue.filter(i => i.status === 'PENDING').length : 0;
  if ($('metricDispatches')) $('metricDispatches').textContent = state.dispatches ? state.dispatches.filter(d => d.status === 'IN_TRANSIT' || d.status === 'REROUTED').length : 0;

  // Hero Stats on Landing Page
  if ($('heroIncidents')) $('heroIncidents').textContent = state.triageQueue ? state.triageQueue.length : 12;
  if ($('heroZones')) $('heroZones').textContent = state.graph.nodes.filter(n => n.strandedCount > 0).length || 4;
  if ($('heroShelters')) $('heroShelters').textContent = state.graph.nodes.filter(n => n.type === 'SHELTER').length || 8;
  if ($('heroUnits')) $('heroUnits').textContent = state.dispatches ? state.dispatches.length : 6;

  // Mode badge update
  const modeBadge = $('modeBadge');
  if (modeBadge) {
    if (autoSimTimer) {
      modeBadge.textContent = 'AUTO SIM RUNNING';
      modeBadge.className = 'mode-badge running';
    } else {
      modeBadge.textContent = 'STANDBY';
      modeBadge.className = 'mode-badge';
    }
  }

  // Map Data Push
  const canvasData = {
    nodes: state.graph.nodes,
    edges: state.graph.edges,
    dispatches: state.dispatches,
    activeRoutes: currentActiveRoutes
  };

  if (graphCanvasRenderer) graphCanvasRenderer.setData(canvasData);
  if (simCanvasRenderer) simCanvasRenderer.setData(canvasData);
  if (routeCanvasRenderer) routeCanvasRenderer.setData(canvasData);
}

/* ── Render Active View ── */
function renderCurrentView() {
  if (!appState) return;

  switch (activeView) {
    case 'command':
      renderCommandView(appState);
      break;
    case 'simulation':
      renderSimulationView(appState);
      break;
    case 'routes':
      renderRouteView(appState);
      break;
    case 'incidents':
      renderIncidentsView(appState);
      break;
    case 'resources':
      renderResourcesView(appState);
      break;
    case 'algorithms':
      renderAlgorithmsView();
      break;
    case 'analytics':
      renderAnalyticsView(appState);
      break;
    case 'about':
      renderAboutView();
      break;
  }
}

/* ── Toast Notification Engine ── */
export function showToast(message, type = 'info', iconName = 'bell') {
  const container = $('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-msg toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i data-lucide="${iconName}"></i></div>
    <div class="toast-content">${message}</div>
    <button class="toast-close" title="Dismiss">✕</button>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  const closeToast = () => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
  };

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) closeBtn.addEventListener('click', closeToast);
  setTimeout(closeToast, 4500);
}

/* ── Interactive Node Inspector ── */
function openNodeInspector(nodeId) {
  if (!appState || !appState.graph || !appState.graph.nodes) return;
  const node = appState.graph.nodes.find(n => n.id === nodeId);
  if (!node) return;

  const card = $('nodeInspectorCard');
  if (!card) return;

  const typeBadge = $('inspNodeType');
  const nameEl = $('inspNodeName');
  const metricsEl = $('inspMetrics');
  const corridorsEl = $('inspCorridors');

  if (typeBadge) typeBadge.textContent = node.type || 'ZONE';
  if (nameEl) nameEl.textContent = `${node.name} (${node.id})`;

  if (metricsEl) {
    let metricsHtml = '';
    if (node.type === 'HOSPITAL') {
      const pct = node.beds ? Math.round((node.occupiedBeds / node.beds) * 100) : 0;
      metricsHtml = `<div>Hospital Beds: <strong>${node.occupiedBeds || 0} / ${node.beds || 0}</strong> (${pct}% full)</div>`;
    } else if (node.type === 'SHELTER') {
      const pct = node.capacity ? Math.round((node.occupied / node.capacity) * 100) : 0;
      metricsHtml = `<div>Shelter Capacity: <strong>${node.occupied || 0} / ${node.capacity || 0}</strong> (${pct}% occupied)</div>`;
    } else if (node.strandedCount > 0) {
      metricsHtml = `<div style="color:#f59e0b;">Stranded Victims: <strong>${node.strandedCount}</strong></div>`;
    } else {
      metricsHtml = `<div>Location Coordinates: <strong>(${Math.round(node.x)}, ${Math.round(node.y)})</strong></div>`;
    }
    metricsEl.innerHTML = metricsHtml;
  }

  // Connected Roads
  if (corridorsEl) {
    const connectedEdges = (appState.graph.edges || []).filter(e => e.from === nodeId || e.to === nodeId);
    if (connectedEdges.length === 0) {
      corridorsEl.innerHTML = '<span style="color:var(--text-dim); font-size:0.72rem;">No connected roads</span>';
    } else {
      corridorsEl.innerHTML = connectedEdges.map(e => {
        const otherNode = e.from === nodeId ? e.to : e.from;
        const isBlocked = e.status === 'BLOCKED';
        return `
          <div class="corridor-tag ${isBlocked ? 'blocked' : ''}" data-from="${e.from}" data-to="${e.to}" title="Click to toggle closure">
            ${isBlocked ? '✕' : '↔'} ${otherNode} (${e.distance}km)
          </div>
        `;
      }).join('');

      corridorsEl.querySelectorAll('.corridor-tag').forEach(tag => {
        tag.addEventListener('click', () => {
          const from = tag.getAttribute('data-from');
          const to = tag.getAttribute('data-to');
          toggleRoadBlock(from, to);
        });
      });
    }
  }

  // Action Buttons
  const btnSOS = $('btnInspSOS');
  if (btnSOS) {
    btnSOS.onclick = () => {
      openIncidentModal();
      if ($('modalNode')) $('modalNode').value = nodeId;
    };
  }

  const btnRouteFrom = $('btnInspRouteFrom');
  if (btnRouteFrom) {
    btnRouteFrom.onclick = () => {
      navigateToView('routes');
      if ($('routeSource')) $('routeSource').value = nodeId;
      showToast(`Selected Node ${nodeId} as Route Source`, 'info', 'navigation');
    };
  }

  const btnRouteTo = $('btnInspRouteTo');
  if (btnRouteTo) {
    btnRouteTo.onclick = () => {
      navigateToView('routes');
      if ($('routeDest')) $('routeDest').value = nodeId;
      showToast(`Selected Node ${nodeId} as Evacuation Destination`, 'info', 'map-pin');
    };
  }

  card.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeNodeInspector() {
  const card = $('nodeInspectorCard');
  if (card) card.classList.add('hidden');
  if (graphCanvasRenderer) {
    graphCanvasRenderer.focusedNodeId = null;
    graphCanvasRenderer.draw();
  }
}

/* ── 1. Command View ── */
function renderCommandView(state) {
  renderTriageQueue(
    state.triageQueue || [],
    incidentId => dispatchFleet(incidentId),
    nodeId => {
      if (graphCanvasRenderer) graphCanvasRenderer.focusNode(nodeId);
      openNodeInspector(nodeId);
    }
  );
  renderShelters(state.graph ? state.graph.nodes : [], nodeId => {
    if (graphCanvasRenderer) graphCanvasRenderer.focusNode(nodeId);
    openNodeInspector(nodeId);
  });
  renderEventLog(state);
}

function bindCommandControls() {
  if ($('btnInspClose')) $('btnInspClose').addEventListener('click', () => closeNodeInspector());
  // Scenario Selector
  const scenarioSelect = $('scenarioSelect');
  if (scenarioSelect) {
    scenarioSelect.addEventListener('change', e => {
      postJSON('/api/scenario/select', { scenarioId: e.target.value })
        .then(() => {
          currentActiveRoutes = [];
          fetchState();
          logEvent('SCENARIO', `Switched disaster scenario to ${e.target.value}`);
        });
    });
  }

  // Quick Action Buttons
  if ($('btnSimTick')) $('btnSimTick').addEventListener('click', () => triggerSimTick());
  if ($('btnSimTickHeader')) $('btnSimTickHeader').addEventListener('click', () => triggerSimTick());
  if ($('btnRandomEvent')) $('btnRandomEvent').addEventListener('click', () => triggerRandomEvent());
  if ($('btnAutoSim')) $('btnAutoSim').addEventListener('click', () => toggleAutoSim());
  if ($('btnResetSim')) $('btnResetSim').addEventListener('click', () => resetSimulation());
  if ($('btnResetSimHeader')) $('btnResetSimHeader').addEventListener('click', () => resetSimulation());

  // Zoom Controls
  if ($('btnZoomIn')) $('btnZoomIn').addEventListener('click', () => {
    if (graphCanvasRenderer) { graphCanvasRenderer.scale = Math.min(3, graphCanvasRenderer.scale * 1.2); graphCanvasRenderer.draw(); }
  });
  if ($('btnZoomOut')) $('btnZoomOut').addEventListener('click', () => {
    if (graphCanvasRenderer) { graphCanvasRenderer.scale = Math.max(0.4, graphCanvasRenderer.scale * 0.8); graphCanvasRenderer.draw(); }
  });
  if ($('btnResetView')) $('btnResetView').addEventListener('click', () => {
    if (graphCanvasRenderer) { graphCanvasRenderer.scale = 1; graphCanvasRenderer.offsetX = 0; graphCanvasRenderer.offsetY = 0; graphCanvasRenderer.draw(); }
  });
}

function renderEventLog(state) {
  const container = $('eventLogList');
  if (!container) return;

  const logs = state.rerouteAlerts || [];
  if (logs.length === 0 && eventLogs.length === 0) {
    container.innerHTML = '<div class="empty-state">No critical logs reported. Watchdog active.</div>';
    return;
  }

  const combined = [...eventLogs, ...logs.map(l => ({
    timestamp: l.timestamp || new Date().toLocaleTimeString(),
    message: l.message,
    type: 'REROUTE'
  }))].slice(-15).reverse();

  container.innerHTML = combined.map(log => `
    <div class="log-item ${log.type ? log.type.toLowerCase() : ''}">
      <span class="log-time">[${log.timestamp}]</span>
      <span class="log-text">${log.message}</span>
    </div>
  `).join('');
}

function logEvent(type, message) {
  eventLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    type,
    message
  });
  if (appState) renderEventLog(appState);
}

/* ── 2. Simulation View ── */
function renderSimulationView(state) {
  const logContainer = $('simEventLog');
  if (!logContainer) return;

  const alerts = state.rerouteAlerts || [];
  if (alerts.length === 0 && eventLogs.length === 0) {
    logContainer.innerHTML = '<div class="empty-state">No simulation events recorded yet.</div>';
    return;
  }

  const combined = [...eventLogs, ...alerts.map(a => ({
    timestamp: a.timestamp,
    message: a.message,
    type: 'ALERT'
  }))].slice(-20).reverse();

  logContainer.innerHTML = combined.map(evt => `
    <div class="sim-event-card">
      <div class="event-meta">
        <span class="badge warning">${evt.type || 'SIM'}</span>
        <span class="event-time">${evt.timestamp || 'NOW'}</span>
      </div>
      <div class="event-desc">${evt.message}</div>
    </div>
  `).join('');
}

function bindSimControls() {
  // Scenario Cards
  document.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const scenario = card.getAttribute('data-scenario');
      if ($('scenarioSelect')) $('scenarioSelect').value = scenario;
      postJSON('/api/scenario/select', { scenarioId: scenario })
        .then(() => {
          fetchState();
          logEvent('SCENARIO', `Activated scenario: ${scenario}`);
        });
    });
  });

  if ($('btnSimStart')) $('btnSimStart').addEventListener('click', () => { if (!autoSimTimer) toggleAutoSim(); });
  if ($('btnSimPause')) $('btnSimPause').addEventListener('click', () => { if (autoSimTimer) toggleAutoSim(); });
  if ($('btnSimReset')) $('btnSimReset').addEventListener('click', () => resetSimulation());
  if ($('btnSimNextEvent')) $('btnSimNextEvent').addEventListener('click', () => triggerRandomEvent());

  // Block Road Control
  if ($('btnSimBlockRoad')) $('btnSimBlockRoad').addEventListener('click', () => {
    const from = $('simBlockFrom') ? $('simBlockFrom').value : '';
    const to = $('simBlockTo') ? $('simBlockTo').value : '';
    if (from && to && from !== to) toggleRoadBlock(from, to);
  });

  // Add Incident Control
  if ($('btnSimAddIncident')) $('btnSimAddIncident').addEventListener('click', () => {
    const nodeId = $('simIncidentNode') ? $('simIncidentNode').value : '';
    const title = $('simIncidentTitle') ? $('simIncidentTitle').value : 'Disaster Rescue';
    const severity = $('simIncidentSev') ? parseInt($('simIncidentSev').value) : 4;
    const victims = $('simIncidentVic') ? parseInt($('simIncidentVic').value) : 25;

    if (nodeId) {
      postJSON('/api/triage/add', { nodeId, title, severity, victims }).then(() => {
        fetchState();
        logEvent('INCIDENT', `Added emergency incident at Node ${nodeId}`);
      });
    }
  });
}

/* ── 3. Route Optimizer View ── */
function renderRouteView(state) {
  // Data for route canvas is pushed in updateTelemetry
}

function bindRouteControls() {
  // Profile Switching
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedProfile = tab.getAttribute('data-profile');

      const alphaSlider = $('alphaSlider');
      const betaSlider = $('betaSlider');
      const gammaSlider = $('gammaSlider');

      if (selectedProfile === 'fastest') {
        if (alphaSlider) alphaSlider.value = 1.0;
        if (betaSlider) betaSlider.value = 0.1;
        if (gammaSlider) gammaSlider.value = 0.1;
      } else if (selectedProfile === 'safest') {
        if (alphaSlider) alphaSlider.value = 0.2;
        if (betaSlider) betaSlider.value = 1.5;
        if (gammaSlider) gammaSlider.value = 0.3;
      } else if (selectedProfile === 'balanced') {
        if (alphaSlider) alphaSlider.value = 0.8;
        if (betaSlider) betaSlider.value = 0.6;
        if (gammaSlider) gammaSlider.value = 0.4;
      }
      updateSliderValDisplays();

      // Auto-recalculate if endpoints are selected
      const s = $('routeSource') ? $('routeSource').value : '';
      const d = $('routeDest') ? $('routeDest').value : '';
      if (s && d && s !== d && $('btnCalcRoute')) {
        $('btnCalcRoute').click();
      }
    });
  });

  // Swap Source and Destination
  if ($('btnSwapRoute')) {
    $('btnSwapRoute').addEventListener('click', () => {
      const src = $('routeSource');
      const dst = $('routeDest');
      if (src && dst) {
        const tmp = src.value;
        src.value = dst.value;
        dst.value = tmp;
        showToast(`Swapped: ${src.value} ➔ ${dst.value}`, 'info', 'arrow-left-right');
        if (src.value && dst.value && src.value !== dst.value && $('btnCalcRoute')) {
          $('btnCalcRoute').click();
        }
      }
    });
  }

  // Slider change listeners
  ['alphaSlider', 'betaSlider', 'gammaSlider'].forEach(id => {
    const s = $(id);
    if (s) s.addEventListener('input', () => updateSliderValDisplays());
  });

  // Calculate Routes Button
  if ($('btnCalcRoute')) {
    $('btnCalcRoute').addEventListener('click', () => {
      const startNodeId = $('routeSource') ? $('routeSource').value : '';
      const endNodeId = $('routeDest') ? $('routeDest').value : '';
      if (!startNodeId || !endNodeId) {
        showToast('Please select both Source and Destination nodes', 'warning', 'alert-circle');
        return;
      }
      if (startNodeId === endNodeId) {
        showToast('Source and Destination nodes must be different', 'warning', 'alert-circle');
        return;
      }

      const alpha = parseFloat($('alphaSlider').value);
      const beta = parseFloat($('betaSlider').value);
      const gamma = parseFloat($('gammaSlider').value);

      postJSON('/api/route/calculate', { startNodeId, endNodeId, alpha, beta, gamma })
        .then(data => {
          if (data.routes && data.routes.routes) {
            currentActiveRoutes = data.routes.routes;
            renderRouteResults(data.routes);
            showToast(`Evacuation corridor generated (${data.routes.routes.length} options)`, 'success', 'navigation');
          }
          if (data.dijkstraSteps && dsaVisualizer) {
            dsaVisualizer.setSteps(data.dijkstraSteps);
          }
          fetchState();
          logEvent('ROUTE', `Calculated multi-objective path from ${startNodeId} to ${endNodeId}`);
        });
    });
  }

  // Stepper controls
  if ($('btnStepNext')) $('btnStepNext').addEventListener('click', () => dsaVisualizer.nextStep());
  if ($('btnStepPrev')) $('btnStepPrev').addEventListener('click', () => dsaVisualizer.prevStep());
  if ($('btnStepPlay')) $('btnStepPlay').addEventListener('click', () => dsaVisualizer.toggleAutoPlay());
}

function updateSliderValDisplays() {
  if ($('alphaVal') && $('alphaSlider')) $('alphaVal').textContent = parseFloat($('alphaSlider').value).toFixed(1);
  if ($('betaVal') && $('betaSlider')) $('betaVal').textContent = parseFloat($('betaSlider').value).toFixed(1);
  if ($('gammaVal') && $('gammaSlider')) $('gammaVal').textContent = parseFloat($('gammaSlider').value).toFixed(1);
}

function renderRouteResults(multiRoutes) {
  const container = $('routeResults');
  if (!container) return;

  if (!multiRoutes || !multiRoutes.routes || multiRoutes.routes.length === 0) {
    container.innerHTML = '<div class="empty-state danger">⚠ No viable evacuation path found. Path is blocked by hazards!</div>';
    return;
  }

  container.innerHTML = multiRoutes.routes.map(r => `
    <div class="route-card-result" style="border-left: 4px solid ${r.color}">
      <div class="route-card-header">
        <span class="route-label" style="color: ${r.color}">${r.label}</span>
        <span class="route-dist">${r.distance.toFixed(1)} km</span>
      </div>
      <div class="route-card-path">
        <strong>Path:</strong> ${r.path.join(' ➔ ')}
      </div>
      <div class="route-card-meta">
        <span>Risk: <strong style="color: ${r.color}">${r.riskRating}</strong></span>
        <span>Score: ${r.compositeCost ? r.compositeCost.toFixed(1) : 'N/A'}</span>
      </div>
    </div>
  `).join('');
}

/* ── 4. Incidents View ── */
function renderIncidentsView(state) {
  renderIncidentTable(state);
  renderPriorityQueueVisual(state);
}

let incidentSearchQuery = '';

function renderIncidentTable(state) {
  const tbody = $('incidentTableBody');
  if (!tbody) return;

  let queue = (state.incidents && state.incidents.length > 0) ? state.incidents : (state.triageQueue || []);
  if (incidentFilter !== 'all') {
    queue = queue.filter(i => (i.status || 'PENDING').toUpperCase() === incidentFilter.toUpperCase());
  }
  if (incidentSearchQuery) {
    queue = queue.filter(i =>
      (i.title && i.title.toLowerCase().includes(incidentSearchQuery)) ||
      (i.id && i.id.toLowerCase().includes(incidentSearchQuery)) ||
      (i.nodeId && i.nodeId.toLowerCase().includes(incidentSearchQuery))
    );
  }

  if (queue.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center empty-state">No incidents matching criteria.</td></tr>`;
    return;
  }

  const typeIcons = {
    FLOOD: '🌊', FIRE: '🔥', EARTHQUAKE: '🌋', COLLAPSE: '🏢', MEDICAL: '🚑', GENERAL: '⚠️'
  };

  tbody.innerHTML = queue.map(i => {
    const icon = typeIcons[i.type] || '⚠️';
    const status = i.status || 'PENDING';
    const isDispatched = status === 'DISPATCHED';
    const isResolved = status === 'RESOLVED';
    const isPending = !isDispatched && !isResolved;
    const statusClass = status.toLowerCase();
    const assigned = i.assignedUnit || i.assignedVehicleId || '—';

    let actionCol = '';
    if (isResolved) {
      actionCol = `<span class="color-emerald font-bold">✓ Evacuated</span>`;
    } else if (isDispatched) {
      actionCol = `<span class="color-cyan font-bold">🚑 En Route</span>`;
    } else {
      actionCol = `<button class="btn btn-primary btn-xs btn-dispatch" data-id="${i.id}"><i data-lucide="truck"></i> Dispatch</button>`;
    }

    return `
      <tr>
        <td class="font-mono">${i.id}</td>
        <td>${icon} ${i.type || 'GENERAL'}</td>
        <td class="font-bold">${i.title}</td>
        <td class="font-mono color-cyan clickable-node" style="cursor:pointer;" title="Click to view Node ${i.nodeId} on map">📍 ${i.nodeId}</td>
        <td><span class="badge ${i.severity >= 4 ? 'danger' : 'warning'}">Level ${i.severity}</span></td>
        <td class="font-bold">${i.victims}</td>
        <td><span class="badge ${statusClass}">${status}</span></td>
        <td class="font-mono text-dim">${assigned}</td>
        <td>${actionCol}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.clickable-node').forEach(cell => {
    cell.addEventListener('click', () => {
      const text = cell.textContent.replace('📍', '').trim();
      navigateToView('command');
      if (graphCanvasRenderer) graphCanvasRenderer.focusNode(text);
      openNodeInspector(text);
    });
  });

  tbody.querySelectorAll('.btn-dispatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      dispatchFleet(id);
    });
  });

  refreshIcons();
}

function renderPriorityQueueVisual(state) {
  const container = $('pqVisual');
  if (!container) return;

  const queue = state.triageQueue || [];
  if (queue.length === 0) {
    container.innerHTML = '<div class="empty-state">Max-Heap is empty. No queued emergencies.</div>';
    return;
  }

  container.innerHTML = queue.map((i, idx) => `
    <div class="heap-node-card ${idx === 0 ? 'top-priority' : ''}">
      <div class="heap-rank">#${idx + 1} ${idx === 0 ? '👑 MAX PRIORITY' : ''}</div>
      <div class="heap-title">${i.title}</div>
      <div class="heap-score">Priority Score: ${Math.round(i.priorityScore)}</div>
      <div class="heap-formula">Score = (${i.severity} × 20) + (${i.victims} × 0.5)</div>
    </div>
  `).join('');
}

function bindIncidentControls() {
  const searchInput = $('incidentSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      incidentSearchQuery = e.target.value.toLowerCase().trim();
      if (appState) renderIncidentTable(appState);
    });
  }

  const filterTabs = $('incidentFilters');
  if (filterTabs) {
    filterTabs.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        incidentFilter = tab.getAttribute('data-filter');
        if (appState) renderIncidentsView(appState);
      });
    });
  }

  if ($('btnAddIncidentPage')) {
    $('btnAddIncidentPage').addEventListener('click', () => openIncidentModal());
  }
}

/* ── 5. Resources View ── */
function renderResourcesView(state) {
  // 1. Rescue Vehicles
  const vehicleCards = $('vehicleCards');
  const vehicles = (state.resources && state.resources.rescueVehicles) || state.vehicles || [];
  if (vehicleCards) {
    if (vehicles.length === 0) {
      vehicleCards.innerHTML = '<div class="empty-state">No rescue fleet units registered.</div>';
    } else {
      vehicleCards.innerHTML = vehicles.map(v => `
        <div class="resource-card vehicle">
          <div class="resource-header">
            <span class="resource-name">🚑 ${v.name} (${v.id})</span>
            <span class="badge ${v.status === 'AVAILABLE' ? 'success' : 'warning'}">${v.status}</span>
          </div>
          <div class="resource-body">
            <div>Type: <strong>${v.type}</strong></div>
            <div>Location: <span class="color-cyan">${v.currentNodeId}</span></div>
            <div>Payload Capacity: <strong>${v.capacity} persons</strong></div>
          </div>
        </div>
      `).join('');
    }
  }

  // 2. Hospitals
  const hospitalCards = $('hospitalCards');
  if (hospitalCards && state.graph) {
    const hospitals = state.graph.nodes.filter(n => n.type === 'HOSPITAL');
    hospitalCards.innerHTML = hospitals.map(h => {
      const pct = h.beds ? Math.round((h.occupiedBeds / h.beds) * 100) : 0;
      return `
        <div class="resource-card hospital">
          <div class="resource-header">
            <span class="resource-name">🏥 ${h.name} (${h.id})</span>
            <span class="badge ${pct > 80 ? 'danger' : 'success'}">${pct}% Full</span>
          </div>
          <div class="resource-body">
            <div>Available Beds: <strong>${h.occupiedBeds || 0} / ${h.beds || 0}</strong></div>
            <div class="progress-bar-bg margin-top-xs">
              <div class="progress-bar-fill" style="width:${pct}%; background:${pct > 80 ? '#ef4444' : '#10b981'}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Shelters
  const shelterCards = $('shelterCards');
  if (shelterCards && state.graph) {
    const shelters = state.graph.nodes.filter(n => n.type === 'SHELTER');
    shelterCards.innerHTML = shelters.map(s => {
      const pct = s.capacity ? Math.round((s.occupied / s.capacity) * 100) : 0;
      return `
        <div class="resource-card shelter">
          <div class="resource-header">
            <span class="resource-name">🛡 ${s.name} (${s.id})</span>
            <span class="badge ${pct > 90 ? 'danger' : 'info'}">${pct}% Capacity</span>
          </div>
          <div class="resource-body">
            <div>Occupancy: <strong>${s.occupied || 0} / ${s.capacity || 0}</strong></div>
            <div class="progress-bar-bg margin-top-xs">
              <div class="progress-bar-fill" style="width:${pct}%; background:${pct > 90 ? '#ef4444' : '#00f0ff'}"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Supply Inventory
  const supplyCards = $('supplyCards');
  const supplies = (state.resources && state.resources.supplies) || state.supplies || {};
  if (supplyCards) {
    const keys = Object.keys(supplies);
    if (keys.length === 0) {
      supplyCards.innerHTML = '<div class="empty-state">No supply inventory data available.</div>';
    } else {
      supplyCards.innerHTML = keys.map(key => {
        const sup = supplies[key];
        const pct = Math.round((sup.quantity / sup.max) * 100);
        return `
          <div class="resource-card supply">
            <div class="resource-header">
              <span class="resource-name">📦 ${sup.name}</span>
              <span class="badge ${pct < 25 ? 'danger' : 'success'}">${sup.quantity} ${sup.unit}</span>
            </div>
            <div class="resource-body">
              <div class="progress-bar-bg margin-top-xs">
                <div class="progress-bar-fill" style="width:${pct}%; background:${pct < 25 ? '#ef4444' : '#10b981'}"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

/* ── 6. Algorithms Explorer View ── */
function renderAlgorithmsView() {
  const container = $('algoGrid');
  if (!container || container.children.length > 0) return; // render once

  const algos = [
    {
      title: 'Weighted Directed Graph',
      category: 'GRAPH ARCHITECTURE',
      complexity: 'Space: O(V + E)',
      icon: 'git-graph',
      desc: 'Represents cities, shelters, hospitals, and road networks as vertices and weighted edges. Dynamically mutates weights when hazards rise or roads flood.',
      formula: 'G = (V, E) \\quad w(u,v) = \\alpha \\cdot \\text{time} + \\beta \\cdot \\text{risk} + \\gamma \\cdot \\text{congestion}'
    },
    {
      title: "Dijkstra's Multi-Objective Algorithm",
      category: 'PATHFINDING',
      complexity: 'Time: O((V + E) \\log V)',
      icon: 'navigation',
      desc: 'Computes optimal corridors by evaluating multi-weighted cost functions. Incorporates live hazard multipliers so emergency vehicles bypass fire and flood zones.',
      formula: 'd[v] = \\min_{u \\in V} \\left( d[u] + w(u,v) \\right)'
    },
    {
      title: 'Max-Heap Priority Queue',
      category: 'EMERGENCY TRIAGE',
      complexity: 'Push/Pop: O(\\log N)',
      icon: 'layers',
      desc: 'Orders incoming disaster SOS calls by composite severity scores. Ensures high-risk, high-victim incidents receive dispatch allocation immediately.',
      formula: 'Score = S_{ev} \\times 20 + V_{ic} \\times 0.5 + R_{isk}'
    },
    {
      title: 'BFS & DFS Isolated Zone Detection',
      category: 'CONNECTIVITY ANALYSIS',
      complexity: 'Time: O(V + E)',
      icon: 'share-2',
      desc: 'Breadth-First and Depth-First searches scan for disconnected graph components to identify neighborhoods cut off from emergency aid.',
      formula: '\\text{Component}(v) = \\{ u \\in V \\mid \\text{Path}(v, u) \\text{ exists} \\}'
    },
    {
      title: "Tarjan's Bridge Detection",
      category: 'BOTTLENECK ANALYSIS',
      complexity: 'Time: O(V + E)',
      icon: 'alert-octagon',
      desc: 'Identifies critical bridge roads whose failure would split the city into isolated fragments, prioritizing them for structural reinforcement.',
      formula: 'low[v] = \\min \\left( dfn[v], \\min_{(v,u)} dfn[u], \\min_{(v,u)} low[u] \\right)'
    },
    {
      title: 'Hash Maps & Fast Lookups',
      category: 'STATE STORAGE',
      complexity: 'Lookup: O(1)',
      icon: 'database',
      desc: 'Enables instant telemetry access, node position mapping, vehicle state tracking, and adjacency list querying during high-frequency simulation ticks.',
      formula: 'Hash(key) \\to \\text{Direct Index}'
    }
  ];

  container.innerHTML = algos.map(a => `
    <div class="algo-card">
      <div class="algo-card-header">
        <span class="algo-category">${a.category}</span>
        <span class="algo-complexity">${a.complexity}</span>
      </div>
      <h3 class="algo-card-title"><i data-lucide="${a.icon}"></i> ${a.title}</h3>
      <p class="algo-card-desc">${a.desc}</p>
      <div class="algo-card-formula">
        <code>${a.formula}</code>
      </div>
    </div>
  `).join('');

  refreshIcons();
}

/* ── 7. Operations Analytics View ── */
function renderAnalyticsView(state) {
  // KPI Cards
  const cardsContainer = $('analyticsCards');
  if (cardsContainer) {
    const totalNodes = state.graph.nodes.length;
    const blockedCount = state.graph.edges.filter(e => e.status === 'BLOCKED').length;
    const totalEdges = state.graph.edges.length;
    const capacityRatio = Math.round(((totalEdges - blockedCount) / totalEdges) * 100);

    cardsContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-title">Network Capacity Index</div>
        <div class="kpi-value color-emerald">${capacityRatio}%</div>
        <div class="kpi-desc">${totalEdges - blockedCount} of ${totalEdges} roads operational</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Active Dispatches</div>
        <div class="kpi-value color-cyan">${state.dispatches ? state.dispatches.length : 0}</div>
        <div class="kpi-desc">Units responding to triage queue</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Stranded Victims</div>
        <div class="kpi-value color-amber">${state.graph.nodes.reduce((acc, n) => acc + (n.strandedCount || 0), 0)}</div>
        <div class="kpi-desc">Awaiting rescue allocation</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Critical Bridges</div>
        <div class="kpi-value color-red">${state.criticalBridges ? state.criticalBridges.length : 0}</div>
        <div class="kpi-desc">Single point of failure bottlenecks</div>
      </div>
    `;
  }

  // Draw Network Health Chart Canvas
  const chartNetwork = $('chartNetwork');
  if (chartNetwork) {
    drawSimpleChart(chartNetwork, [95, 90, 85, 78, 70, 65, 72, 80, 88, 92], '#00f0ff');
  }

  // Draw Resource Utilization Canvas
  const chartResources = $('chartResources');
  if (chartResources) {
    drawSimpleChart(chartResources, [30, 45, 60, 75, 88, 92, 85, 70, 60, 50], '#10b981');
  }
}

function drawSimpleChart(container, dataPoints, color) {
  let canvas = container.querySelector('canvas');
  const targetW = container.clientWidth || 400;
  const targetH = 180;

  if (!canvas) {
    container.innerHTML = `<canvas width="${targetW}" height="${targetH}"></canvas>`;
    canvas = container.querySelector('canvas');
  } else if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 30; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Line Chart
  ctx.beginPath();
  const stepX = w / (dataPoints.length - 1);
  dataPoints.forEach((val, i) => {
    const x = i * stepX;
    const y = h - (val / 100) * (h - 40) - 20;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/* ── 8. About View ── */
function renderAboutView() {
  const container = $('aboutContent');
  if (!container || container.children.length > 0) return; // render once

  container.innerHTML = `
    <div class="about-hero-card">
      <h2>CRISISGRID — Dynamic Disaster Response Optimizer</h2>
      <p class="lead">Built for high-stakes emergency situations where urban road networks dynamically block, shelters reach capacity, and response times dictate survival.</p>
    </div>

    <div class="about-grid">
      <div class="panel">
        <div class="panel-header"><h3><i data-lucide="shield"></i> Core Problem Solved</h3></div>
        <p>During natural disasters (floods, wildfires, earthquakes), static GPS routing fails because road conditions deteriorate continuously. CrisisGrid continuously models cities as weighted directed graphs and recalculates optimal corridors in real time.</p>
      </div>

      <div class="panel">
        <div class="panel-header"><h3><i data-lucide="cpu"></i> Data Structures & Algorithms Used</h3></div>
        <ul class="about-list">
          <li><strong>Graph Data Structure:</strong> Represents intersections as nodes and road segments as weighted edges.</li>
          <li><strong>Dijkstra's Algorithm:</strong> Multi-objective pathfinding with hazard risk penalties.</li>
          <li><strong>Max-Heap Priority Queue:</strong> Triage ranking based on severity, victims, and proximity.</li>
          <li><strong>BFS/DFS Traversal:</strong> Isolated neighborhood detection and Tarjan's bridge bottleneck analysis.</li>
          <li><strong>Hash Maps:</strong> Constant-time O(1) telemetry lookups and fast edge status toggling.</li>
        </ul>
      </div>
    </div>
  `;

  refreshIcons();
}

/* ── 9. Incident Modal ── */
function bindModalControls() {
  const modal = $('incidentModal');
  if (!modal) return;

  if ($('modalClose')) $('modalClose').addEventListener('click', () => closeIncidentModal());
  if ($('modalCancel')) $('modalCancel').addEventListener('click', () => closeIncidentModal());
  if ($('btnAddIncidentHeader')) $('btnAddIncidentHeader').addEventListener('click', () => openIncidentModal());
  if ($('btnAddIncidentDock')) $('btnAddIncidentDock').addEventListener('click', () => openIncidentModal());

  if ($('modalSubmit')) {
    $('modalSubmit').addEventListener('click', () => {
      const title = $('modalTitle') ? $('modalTitle').value : 'Emergency Incident';
      const nodeId = $('modalNode') ? $('modalNode').value : '';
      const type = $('modalType') ? $('modalType').value : 'GENERAL';
      const severity = $('modalSev') ? parseInt($('modalSev').value) : 4;
      const victims = $('modalVic') ? parseInt($('modalVic').value) : 15;

      if (nodeId) {
        postJSON('/api/triage/add', { title, nodeId, type, severity, victims }).then(() => {
          closeIncidentModal();
          fetchState();
          logEvent('INCIDENT', `Submitted new ${type} incident at Node ${nodeId}`);
          showToast(`🚨 SOS Reported: ${title} at Node ${nodeId} (Severity ${severity})`, 'warning', 'plus-circle');
          if (graphCanvasRenderer) {
            graphCanvasRenderer.focusNode(nodeId);
            openNodeInspector(nodeId);
          }
        });
      }
    });
  }
}

function openIncidentModal() {
  const modal = $('incidentModal');
  if (modal) modal.classList.add('active');
}

function closeIncidentModal() {
  const modal = $('incidentModal');
  if (modal) modal.classList.remove('active');
}

/* ── API Action Helpers ── */
function postJSON(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json());
}

function toggleRoadBlock(from, to) {
  postJSON('/api/road/toggle', { from, to }).then(data => {
    fetchState();
    logEvent('ROAD', `Toggled road status between ${from} and ${to}`);
    if (data.success) {
      const isBlocked = data.newStatus === 'BLOCKED';
      showToast(
        `Road ${from} ↔ ${to} ${isBlocked ? 'BLOCKED' : 'REOPENED'}!`,
        isBlocked ? 'danger' : 'success',
        isBlocked ? 'x-circle' : 'check-circle'
      );
      if (data.reroutes && data.reroutes.length > 0) {
        data.reroutes.forEach(r => showToast(r.message, 'warning', 'navigation'));
      }
      if (graphCanvasRenderer && graphCanvasRenderer.focusedNodeId) {
        openNodeInspector(graphCanvasRenderer.focusedNodeId);
      }
    }
  });
}

function dispatchFleet(incidentId) {
  postJSON('/api/dispatch/create', { incidentId }).then(data => {
    if (data.success && data.dispatch) {
      currentActiveRoutes.push({
        type: 'DISPATCH',
        color: '#ec4899',
        path: data.dispatch.path
      });
      logEvent('DISPATCH', `Unit ${data.dispatch.assignedVehicleId} dispatched to Incident ${incidentId}`);
      showToast(`🚑 Fleet Unit ${data.dispatch.assignedVehicleId} dispatched to ${data.dispatch.incidentTitle}!`, 'success', 'truck');
      if (graphCanvasRenderer && data.dispatch.path && data.dispatch.path[0]) {
        graphCanvasRenderer.focusNode(data.dispatch.path[0]);
      }
    } else {
      showToast(`Dispatch failed: ${data.message || data.reason || 'No available vehicle or path.'}`, 'danger', 'alert-triangle');
    }
    fetchState();
  });
}

function triggerSimTick() {
  postJSON('/api/simulate/tick', {}).then(() => {
    fetchState();
    logEvent('SIM', 'Simulated 1 time tick forward');
    showToast('Simulation advanced 1 tick', 'info', 'skip-forward');
  });
}

function triggerRandomEvent() {
  postJSON('/api/simulate/random-event', {}).then(data => {
    fetchState();
    const msg = data.event ? data.event.message : 'Random disaster event triggered';
    logEvent('EVENT', msg);
    showToast(`⚡ Random Event: ${msg}`, 'warning', 'zap');
  });
}

function toggleAutoSim() {
  const autoBtn = $('btnAutoSim');
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
    logEvent('SIM', 'Paused Auto Simulation');
    showToast('⏸ Auto Simulation paused', 'info', 'pause');
    if (autoBtn) {
      autoBtn.innerHTML = '<i data-lucide="play"></i> <span id="autoSimText">Auto Sim</span>';
      autoBtn.classList.remove('btn-active-sim');
      if (window.lucide) lucide.createIcons();
    }
  } else {
    autoSimTimer = setInterval(() => triggerSimTick(), 1500);
    logEvent('SIM', 'Started Auto Simulation');
    showToast('▶ Auto Simulation running', 'success', 'play');
    if (autoBtn) {
      autoBtn.innerHTML = '<i data-lucide="pause"></i> <span id="autoSimText">Pause</span>';
      autoBtn.classList.add('btn-active-sim');
      if (window.lucide) lucide.createIcons();
    }
  }
  if (appState) updateTelemetry(appState);
}

function resetSimulation() {
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
  const autoBtn = $('btnAutoSim');
  if (autoBtn) {
    autoBtn.innerHTML = '<i data-lucide="play"></i> <span id="autoSimText">Auto Sim</span>';
    autoBtn.classList.remove('btn-active-sim');
    if (window.lucide) lucide.createIcons();
  }
  currentActiveRoutes = [];
  const scenarioSelect = $('scenarioSelect');
  const scenarioId = scenarioSelect ? scenarioSelect.value : 'COASTAL_FLOOD';
  postJSON('/api/scenario/select', { scenarioId }).then(() => {
    fetchState();
    logEvent('SIM', 'Reset simulation environment');
    showToast('↺ Simulation environment reset', 'info', 'rotate-ccw');
  });
}

function populateAllDropdowns(nodes) {
  if (!nodes || nodes.length === 0) return;

  const optionsHtml = nodes.map(n => `<option value="${n.id}">${n.name} (${n.id})</option>`).join('');

  ['routeSource', 'routeDest', 'simBlockFrom', 'simBlockTo', 'simIncidentNode', 'modalNode'].forEach(id => {
    const el = $(id);
    if (el && el.children.length === 0) {
      el.innerHTML = optionsHtml;
    }
  });

  if ($('routeDest') && $('routeDest').selectedIndex === 0 && nodes.length > 2) {
    $('routeDest').selectedIndex = 2;
  }
  if ($('simBlockTo') && $('simBlockTo').selectedIndex === 0 && nodes.length > 1) {
    $('simBlockTo').selectedIndex = 1;
  }
}

/* ── Hero Canvas Animation (Landing Page) ── */
function initHeroCanvas() {
  const canvas = $('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    if (activePage === 'landing') {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }
  });

  // Floating nodes
  const nodeCount = 35;
  const nodes = Array.from({ length: nodeCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    radius: Math.random() * 3 + 2,
    isDanger: Math.random() > 0.8
  }));

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Update & draw nodes
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.isDanger ? '#ef4444' : '#00f0ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw connecting edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = nodes[i].isDanger || nodes[j].isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 240, 255, 0.12)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (activePage === 'landing') {
      heroAnimId = requestAnimationFrame(animate);
    }
  }

  if (heroAnimId) cancelAnimationFrame(heroAnimId);
  animate();
}

/* ── Lucide Icon Refresh Helper ── */
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
