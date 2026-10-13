export const PRESET_SCENARIOS = {
  COASTAL_FLOOD: {
    id: 'COASTAL_FLOOD',
    name: 'Metropolis Flash Flood',
    disasterType: 'FLOOD',
    description: 'Severe coastal surge overtopping levees. Key river bridges at risk of overflow.',
    nodes: [
      { id: 'N1', name: 'Downtown Hub', type: 'HUB', x: 120, y: 140 },
      { id: 'N2', name: 'North River Crossing', type: 'HUB', x: 300, y: 100 },
      { id: 'N3', name: 'Metro General Hospital', type: 'HOSPITAL', x: 500, y: 80, beds: 120, occupiedBeds: 45 },
      { id: 'N4', name: 'Westside Residential', type: 'INCIDENT', x: 180, y: 280, strandedCount: 35 },
      { id: 'N5', name: 'Central Transit Hub', type: 'HUB', x: 380, y: 240 },
      { id: 'N6', name: 'Eastside Supply Depot', type: 'SUPPLY_DEPOT', x: 580, y: 220 },
      { id: 'N7', name: 'South Flood Evac Center', type: 'SHELTER', x: 220, y: 440, capacity: 300, occupied: 80 },
      { id: 'N8', name: 'Harbor Emergency Base', type: 'SHELTER', x: 440, y: 420, capacity: 500, occupied: 120 },
      { id: 'N9', name: 'Tech Park Zone', type: 'HUB', x: 620, y: 380 },
      { id: 'N10', name: 'Suburban Relief Depot', type: 'SHELTER', x: 740, y: 200, capacity: 250, occupied: 30 },
      { id: 'N11', name: 'Coastal Levee Gate 4', type: 'INCIDENT', x: 520, y: 520, strandedCount: 60 },
      { id: 'N12', name: 'Highland Evacuation Site', type: 'SHELTER', x: 760, y: 460, capacity: 400, occupied: 40 }
    ],
    edges: [
      { from: 'N1', to: 'N2', distance: 4.2, hazardLevel: 'LOW', status: 'OPEN', capacity: 100 },
      { from: 'N2', to: 'N3', distance: 5.1, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 80 },
      { from: 'N1', to: 'N4', distance: 3.8, hazardLevel: 'HIGH', status: 'OPEN', capacity: 90 },
      { from: 'N4', to: 'N5', distance: 4.0, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 85 },
      { from: 'N2', to: 'N5', distance: 4.5, hazardLevel: 'HIGH', status: 'OPEN', capacity: 70 },
      { from: 'N3', to: 'N6', distance: 3.2, hazardLevel: 'LOW', status: 'OPEN', capacity: 100 },
      { from: 'N5', to: 'N6', distance: 4.8, hazardLevel: 'LOW', status: 'OPEN', capacity: 95 },
      { from: 'N4', to: 'N7', distance: 5.0, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 75 },
      { from: 'N5', to: 'N8', distance: 6.2, hazardLevel: 'EXTREME', status: 'OPEN', capacity: 40 },
      { from: 'N6', to: 'N9', distance: 3.9, hazardLevel: 'LOW', status: 'OPEN', capacity: 90 },
      { from: 'N6', to: 'N10', distance: 4.1, hazardLevel: 'LOW', status: 'OPEN', capacity: 100 },
      { from: 'N7', to: 'N8', distance: 4.7, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 80 },
      { from: 'N8', to: 'N9', distance: 3.5, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 85 },
      { from: 'N8', to: 'N11', distance: 3.0, hazardLevel: 'EXTREME', status: 'OPEN', capacity: 50 },
      { from: 'N9', to: 'N11', distance: 4.2, hazardLevel: 'HIGH', status: 'OPEN', capacity: 60 },
      { from: 'N9', to: 'N12', distance: 5.5, hazardLevel: 'LOW', status: 'OPEN', capacity: 95 },
      { from: 'N10', to: 'N12', distance: 6.0, hazardLevel: 'LOW', status: 'OPEN', capacity: 90 },
      { from: 'N11', to: 'N12', distance: 4.8, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 70 }
    ],
    initialIncidents: [
      { id: 'INC-001', title: 'Levee Breach Emergency', nodeId: 'N11', severity: 5, victims: 60 },
      { id: 'INC-002', title: 'Flooded Apartment Complex', nodeId: 'N4', severity: 4, victims: 35 },
      { id: 'INC-003', title: 'Substation Electrical Fire', nodeId: 'N2', severity: 3, victims: 12 }
    ]
  },
  URBAN_FIRE: {
    id: 'URBAN_FIRE',
    name: 'Wildfire Canyon Spread',
    disasterType: 'FIRE',
    description: 'High winds accelerating wildfire progression towards eastern urban districts.',
    nodes: [
      { id: 'N1', name: 'Western Ridge Base', type: 'HUB', x: 120, y: 140 },
      { id: 'N2', name: 'Canyon Watch Post', type: 'INCIDENT', x: 300, y: 100, strandedCount: 40 },
      { id: 'N3', name: 'Highland Hospital', type: 'HOSPITAL', x: 500, y: 80, beds: 150, occupiedBeds: 70 },
      { id: 'N4', name: 'Pine Valley Shelter', type: 'SHELTER', x: 180, y: 280, capacity: 400, occupied: 150 },
      { id: 'N5', name: 'Central Fire Control', type: 'HUB', x: 380, y: 240 },
      { id: 'N6', name: 'Eastside Evac Center', type: 'SHELTER', x: 580, y: 220, capacity: 500, occupied: 200 }
    ],
    edges: [
      { from: 'N1', to: 'N2', distance: 5.0, hazardLevel: 'EXTREME', status: 'OPEN', capacity: 40 },
      { from: 'N2', to: 'N3', distance: 4.2, hazardLevel: 'HIGH', status: 'OPEN', capacity: 60 },
      { from: 'N1', to: 'N4', distance: 3.5, hazardLevel: 'LOW', status: 'OPEN', capacity: 90 },
      { from: 'N4', to: 'N5', distance: 4.0, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 80 },
      { from: 'N5', to: 'N6', distance: 5.5, hazardLevel: 'LOW', status: 'OPEN', capacity: 100 },
      { from: 'N3', to: 'N6', distance: 3.0, hazardLevel: 'LOW', status: 'OPEN', capacity: 100 }
    ],
    initialIncidents: [
      { id: 'INC-001', title: 'Canyon Wildfire Evac', nodeId: 'N2', severity: 5, victims: 40 }
    ]
  },
  EARTHQUAKE: {
    id: 'EARTHQUAKE',
    name: '7.2 Magnitude Seismic Shock',
    disasterType: 'EARTHQUAKE',
    description: 'Major earthquake causing structural collapses and overpass destruction across central grid.',
    nodes: [
      { id: 'N1', name: 'Epicenter Station', type: 'INCIDENT', x: 140, y: 160, strandedCount: 80 },
      { id: 'N2', name: 'Bridge Overpass 9', type: 'HUB', x: 320, y: 120 },
      { id: 'N3', name: 'City Trauma Center', type: 'HOSPITAL', x: 520, y: 100, beds: 200, occupiedBeds: 110 },
      { id: 'N4', name: 'Stadium Relief Hub', type: 'SHELTER', x: 200, y: 300, capacity: 600, occupied: 210 },
      { id: 'N5', name: 'Civil Defense HQ', type: 'HUB', x: 400, y: 260 },
      { id: 'N6', name: 'North Arena Shelter', type: 'SHELTER', x: 600, y: 240, capacity: 450, occupied: 180 }
    ],
    edges: [
      { from: 'N1', to: 'N2', distance: 4.0, hazardLevel: 'EXTREME', status: 'BLOCKED', capacity: 0 },
      { from: 'N2', to: 'N3', distance: 4.8, hazardLevel: 'HIGH', status: 'OPEN', capacity: 50 },
      { from: 'N1', to: 'N4', distance: 3.2, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 80 },
      { from: 'N4', to: 'N5', distance: 4.2, hazardLevel: 'LOW', status: 'OPEN', capacity: 90 },
      { from: 'N5', to: 'N6', distance: 5.0, hazardLevel: 'LOW', status: 'OPEN', capacity: 100 },
      { from: 'N3', to: 'N6', distance: 3.5, hazardLevel: 'MEDIUM', status: 'OPEN', capacity: 85 }
    ],
    initialIncidents: [
      { id: 'INC-001', title: 'Collapsed Highway Bridge', nodeId: 'N1', severity: 5, victims: 80 }
    ]
  }
};
