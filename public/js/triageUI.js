export function renderTriageQueue(triageQueue, onDispatchClick, onCardClick) {
  const container = document.getElementById('triageList') || document.getElementById('triageQueueList');
  const badge = document.getElementById('triageCount') || document.getElementById('triageBadgeCount');
  
  if (!container) return;

  const pendingCount = triageQueue.filter(i => i.status === 'PENDING').length;
  if (badge) {
    badge.textContent = pendingCount;
  }

  if (triageQueue.length === 0) {
    container.innerHTML = '<div class="empty-state">No pending emergency SOS calls. All clear!</div>';
    return;
  }

  let html = '';
  triageQueue.forEach(incident => {
    const status = incident.status || 'PENDING';
    const isDispatched = status === 'DISPATCHED';
    const isResolved = status === 'RESOLVED';
    const isPending = !isDispatched && !isResolved;
    const statusClass = status.toLowerCase();
    
    let actionHtml = '';
    if (isPending) {
      actionHtml = `<button class="btn btn-primary btn-sm dispatch-btn" data-id="${incident.id}"><i data-lucide="truck"></i> Dispatch Rescue</button>`;
    } else if (isDispatched) {
      const unitText = incident.assignedUnit ? `Unit ${incident.assignedUnit} En Route` : 'Rescue Unit En Route';
      actionHtml = `<span class="dispatched-label">🚑 ${unitText}</span>`;
    } else if (isResolved) {
      actionHtml = `<span class="resolved-label">✓ Evacuated / Resolved</span>`;
    }

    html += `
<div class="triage-card ${statusClass}" data-node="${incident.nodeId}" title="Click to view Node ${incident.nodeId} on map">
  <div class="triage-header">
    <div class="triage-title-group">
      <span class="triage-id">${incident.id}</span>
      <h4 class="triage-title">${incident.title}</h4>
    </div>
    <span class="triage-score-pill">Priority ${Math.round(incident.priorityScore)}</span>
  </div>
  <div class="triage-meta-row">
    <span class="triage-chip">📍 Node <strong>${incident.nodeId}</strong></span>
    <span class="triage-chip ${incident.severity >= 4 ? 'chip-danger' : 'chip-warning'}">⚠️ Level <strong>${incident.severity}/5</strong></span>
    <span class="triage-chip chip-victims">👥 <strong>${incident.victims}</strong> Victims</span>
  </div>
  <div class="triage-footer">
    <span class="badge ${statusClass}">${status}</span>
    ${actionHtml}
  </div>
</div>`;
  });

  container.innerHTML = html;

  // Card click to focus map
  container.querySelectorAll('.triage-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.dispatch-btn')) return;
      const nodeId = card.getAttribute('data-node');
      if (onCardClick && nodeId) onCardClick(nodeId);
    });
  });

  const buttons = container.querySelectorAll('.dispatch-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (onDispatchClick) onDispatchClick(id);
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
