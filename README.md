# 🚨 CrisisGrid — Dynamic Disaster Response & Evacuation Route Optimizer

**CrisisGrid** is a real-time disaster response command center and evacuation route optimizer powered by core **Data Structures & Algorithms (DSA)**. Designed for high-stakes emergency scenarios—such as flash floods, wildfires, and seismic earthquakes—where road networks degrade dynamically, shelters reach capacity, and rapid triage determines survival.

---

## 🌟 Key Features

### 1. 🗺️ Interactive Tactical Command Center
- **Live Graph Canvas**: Visualizes urban intersections, hospitals, evacuation shelters, and road corridors on an interactive HTML5 canvas with pan, zoom, and click-to-inspect controls.
- **Node Inspector Drawer**: Click any node on the map to inspect real-time metrics (shelter capacity, hospital beds, stranded victims), toggle connected road closures (`OPEN` ↔ `BLOCKED`), report SOS calls, or set route endpoints.
- **Dynamic Watchdog Rerouting**: When a road collapses or is blocked while a rescue unit is in transit, CrisisGrid automatically detects affected units and recalculates an alternate path in real time.

### 2. 🚨 Max-Heap Emergency Triage Queue
- **Automated Priority Scoring**: Incoming emergency SOS calls are inserted into a custom **Binary Max-Heap** (`src/dsa/MaxHeap.js`) and ranked by composite urgency:
  $$\text{Priority Score} = (\text{Severity} \times 20) + (\text{Victims} \times 0.5)$$
- **Full Incident Lifecycle**: Incidents transition seamlessly from `PENDING` ➔ `DISPATCHED` (with assigned rescue unit tracking) ➔ `RESOLVED` (upon safe arrival and shelter evacuation).

### 3. 🧭 Multi-Objective Route Optimizer (Modified Dijkstra)
- **Custom Weight Profiles**: Switch between **Fastest**, **Safest**, and **Balanced** routing profiles or fine-tune custom sliders ($\alpha$ Distance/Time, $\beta$ Hazard Penalty, $\gamma$ Congestion).
- **Top-$K$ Alternative Corridors**: Generates up to 3 distinct evacuation paths (`src/dsa/MultiRoute.js`) with comparative risk ratings and distance metrics.
- **Step-by-Step DSA Visualizer**: Inspect every iteration of Dijkstra's algorithm—including Min-Heap priority queue state, visited node sets, and edge relaxations (`public/js/dsaVisualizer.js`).

### 4. 🌐 Connectivity & Bottleneck Analysis (BFS & Tarjan's DFS)
- **Isolated Zone Detection (BFS)**: Continuously scans the road network (`src/dsa/BFSDFS.js`) to identify neighborhoods cut off from emergency infrastructure.
- **Critical Bridge Detection (Tarjan's Algorithm)**: Identifies single-point-of-failure road segments (articulation bridges) whose collapse would fracture the city graph.

### 5. ⚡ Live Disaster Simulation Engine
- **Preset Disaster Scenarios**:
  - 🌊 **Metropolis Flash Flood** (`COASTAL_FLOOD`)
  - 🔥 **Canyon Wildfire Spread** (`WILDFIRE_SPREAD`)
  - 🌋 **Faultline Seismic Crisis** (`EARTHQUAKE_CRISIS`)
- **Auto-Sim & Time Ticks**: Step forward manually or run continuous auto-simulation to watch rescue vehicles traverse corridors, evacuate victims into shelters, and respond to random hazard events.

---

## 🧠 Data Structures & Algorithms Architecture

| Module | File | Data Structure / Algorithm | Time Complexity | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **City Network** | `src/dsa/Graph.js` | Weighted Adjacency List Graph | $\mathcal{O}(1)$ lookup | Models nodes (zones, shelters, hospitals) & dynamic edges |
| **Pathfinding** | `src/dsa/Dijkstra.js` | Multi-Objective Dijkstra + Min-Heap | $\mathcal{O}((V + E)\log V)$ | Computes optimal hazard-aware evacuation & rescue corridors |
| **Priority Queue** | `src/dsa/MinHeap.js` | Binary Min-Heap | $\mathcal{O}(\log N)$ push/pop | Powers Dijkstra vertex extraction by lowest composite cost |
| **Emergency Triage** | `src/dsa/MaxHeap.js` | Binary Max-Heap | $\mathcal{O}(\log N)$ insert/extract | Prioritizes critical SOS incidents by severity and victim count |
| **Network Analysis** | `src/dsa/BFSDFS.js` | BFS Traversal & Tarjan's Bridge DFS | $\mathcal{O}(V + E)$ | Detects isolated nodes and critical single-point-of-failure bridges |
| **Multi-Corridor** | `src/dsa/MultiRoute.js` | Penalty-Based $K$-Shortest Paths | $\mathcal{O}(K \cdot (V + E)\log V)$ | Computes primary, safest, and backup evacuation routes |
| **Fleet Dispatch** | `src/dsa/ResourceAllocator.js` | Greedy Capacity-Aware Matching | $\mathcal{O}(S \cdot (V + E)\log V)$ | Pairs emergencies with the nearest shelter/hospital with available capacity |

---

## 📂 Project Structure

```text
CrisGrid-Disaster-Optimiser/
├── public/                     # Frontend Dashboard & Visualizers
│   ├── css/
│   │   └── styles.css          # Dark-mode tactical UI & responsive layout
│   ├── js/
│   │   ├── app.js              # Core state telemetry, views, & toast notifications
│   │   ├── canvasRenderer.js   # Interactive HTML5 Graph Map renderer
│   │   ├── dsaVisualizer.js    # Step-by-step Dijkstra execution visualizer
│   │   ├── shelterUI.js        # Shelter & Hospital capacity cards
│   │   └── triageUI.js         # Max-Heap Triage queue cards & dispatch actions
│   └── index.html              # Single-Page Application (8 specialized views)
├── src/                        # Backend DSA Engine & Scenarios
│   ├── dsa/
│   │   ├── BFSDFS.js           # Reachability (BFS) & Critical Bridges (DFS)
│   │   ├── Dijkstra.js         # Multi-weighted shortest path + step recorder
│   │   ├── Graph.js            # Adjacency list graph with edge block toggling
│   │   ├── MaxHeap.js          # Emergency triage priority queue
│   │   ├── MinHeap.js          # Pathfinding min-priority queue
│   │   ├── MultiRoute.js       # Multi-profile route generator
│   │   └── ResourceAllocator.js# Nearest viable shelter & fleet allocator
│   └── scenarios/
│       └── presetScenarios.js  # Pre-configured disaster maps & initial incidents
├── server.js                   # Express.js REST API & simulation tick engine
└── package.json                # Project metadata & dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **npm**

### Installation & Run

1. **Clone the repository**
   ```bash
   git clone https://github.com/namdas-om/CrisGrid-Disaster-Optimiser.git
   cd CrisGrid-Disaster-Optimiser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in Browser**
   Navigate to **[http://localhost:3000](http://localhost:3000)**

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/state` | Returns full graph topology, triage queue, active dispatches, bridge alerts, and telemetry |
| `POST` | `/api/scenario/select` | Loads a preset disaster scenario (`COASTAL_FLOOD`, `WILDFIRE_SPREAD`, `EARTHQUAKE_CRISIS`) |
| `POST` | `/api/road/toggle` | Toggles a road edge between `OPEN` and `BLOCKED` and triggers dynamic rerouting |
| `POST` | `/api/route/calculate` | Calculates multi-objective routes and returns step-by-step Dijkstra trace |
| `POST` | `/api/triage/add` | Inserts a new emergency SOS incident into the Max-Heap triage queue |
| `POST` | `/api/dispatch/create` | Allocates a rescue unit and shelter to an incident and initiates transit |
| `POST` | `/api/simulate/tick` | Advances simulation by 1 tick, moving rescue units and resolving arrived evacuations |
| `POST` | `/api/simulate/random-event` | Triggers a dynamic disaster event (road collapse, hazard spike, or new SOS) |

---

## 👤 Author

**Om Namdas**  
GitHub: [@namdas-om](https://github.com/namdas-om)
