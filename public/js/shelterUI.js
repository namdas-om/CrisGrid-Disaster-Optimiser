export function renderShelters(nodes, onShelterClick) {
  const container = document.getElementById('shelterList');
  if (!container) return;

  const shelters = nodes.filter(n => n.type === 'SHELTER' || n.type === 'HOSPITAL');

  if (shelters.length === 0) {
    container.innerHTML = '<div class="empty-state">No shelters or hospitals found.</div>';
    return;
  }

  let html = '';
  shelters.forEach(node => {
    const isHospital = node.type === 'HOSPITAL';
    const icon = isHospital ? '🏥' : '🛡';
    
    let total = 0;
    let occupied = 0;
    let label = '';
    
    if (isHospital) {
      total = node.beds || 0;
      occupied = node.occupiedBeds || 0;
      label = 'Beds';
    } else {
      total = node.capacity || 0;
      occupied = node.occupied || 0;
      label = 'Capacity';
    }
    
    const pct = total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0;
    let barColor = '#00f0ff';
    if (pct > 80) barColor = '#ff3333';
    else if (pct > 50) barColor = '#ffaa00';

    html += `
<div class="shelter-card ${isHospital ? 'hospital' : ''}" data-node="${node.id}" title="Click to view ${node.name} on map">
  <div class="shelter-title">${icon} ${node.name} (${node.id})</div>
  <div class="shelter-stats">
    <span>${label}</span>
    <span style="color:#00f0ff">${occupied} / ${total}</span>
  </div>
  <div class="progress-bar-bg">
    <div class="progress-bar-fill" style="width:${pct}%; background:${barColor}"></div>
  </div>
</div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.shelter-card').forEach(card => {
    card.addEventListener('click', () => {
      const nodeId = card.getAttribute('data-node');
      if (onShelterClick && nodeId) onShelterClick(nodeId);
    });
  });
}
