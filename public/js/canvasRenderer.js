/**
 * Ultra-Tactical HTML5 2D Canvas Engine for CrisisGrid NLAMS Map Rendering.
 * Renders glowing grid background, node badges, directional route particles,
 * dynamic link failure indicators, and moving vehicle animations.
 */

export class CanvasRenderer {
  constructor(canvasElement, tooltipElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tooltip = tooltipElement;

    // Viewport transform
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;

    // Dragging state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Particle animation counter
    this.animFrame = 0;

    // Selected node/edge state
    this.hoveredNodeId = null;
    this.hoveredEdge = null;
    this.highlightedRoutes = [];

    // State data
    this.nodes = [];
    this.edges = [];
    this.dispatches = [];

    this.focusedNodeId = null;
    this.onRoadClick = null;
    this.onNodeClick = null;
    this.onCanvasBackgroundClick = null;

    this.initEvents();
    this.startAnimationLoop();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }

  setData({ nodes, edges, dispatches, activeRoutes = [] }) {
    this.nodes = nodes || [];
    this.edges = edges || [];
    this.dispatches = dispatches || [];
    this.highlightedRoutes = activeRoutes;
    this.draw();
  }

  focusNode(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return;
    this.focusedNodeId = nodeId;
    this.offsetX = (this.canvas.width / 2) - (node.x * this.scale);
    this.offsetY = (this.canvas.height / 2) - (node.y * this.scale);
    this.draw();
  }

  startAnimationLoop() {
    const loop = () => {
      this.animFrame += 0.05;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.offsetX;
      this.dragStartY = e.clientY - this.offsetY;
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.offsetX = e.clientX - this.dragStartX;
        this.offsetY = e.clientY - this.dragStartY;
      } else {
        this.handleHover(e);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = (this.hoveredNodeId || this.hoveredEdge) ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.scale = Math.max(0.4, Math.min(3.0, this.scale * zoomFactor));
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredEdge && this.onRoadClick) {
        this.onRoadClick(this.hoveredEdge.from, this.hoveredEdge.to);
        return;
      }
      if (this.hoveredNodeId && this.onNodeClick) {
        this.focusedNodeId = this.hoveredNodeId;
        this.onNodeClick(this.hoveredNodeId);
        this.draw();
        return;
      }
      this.focusedNodeId = null;
      if (this.onCanvasBackgroundClick) {
        this.onCanvasBackgroundClick();
      }
      this.draw();
    });
  }

  handleHover(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - this.offsetX) / this.scale;
    const mouseY = (e.clientY - rect.top - this.offsetY) / this.scale;

    // Check node collision
    let foundNode = null;
    for (const node of this.nodes) {
      const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
      if (dist < 20) {
        foundNode = node;
        break;
      }
    }

    if (foundNode) {
      this.hoveredNodeId = foundNode.id;
      this.hoveredEdge = null;
      this.canvas.style.cursor = 'pointer';
      this.showTooltip(e.clientX, e.clientY, `
        <strong style="color:#00f0ff;">${foundNode.name} (${foundNode.id})</strong><br>
        Type: <span style="color:#f8fafc; font-weight:bold;">${foundNode.type}</span><br>
        ${foundNode.capacity ? `Shelter Capacity: <span style="color:#10b981;">${foundNode.occupied}/${foundNode.capacity}</span><br>` : ''}
        ${foundNode.beds ? `Hospital Beds: <span style="color:#ef4444;">${foundNode.occupiedBeds}/${foundNode.beds}</span><br>` : ''}
        ${foundNode.strandedCount ? `Stranded Victims: <span style="color:#f59e0b;">${foundNode.strandedCount}</span><br>` : ''}
        <em style="color:#00f0ff; font-size:0.68rem;">[Click to inspect node & actions]</em>
      `);
      return;
    }

    // Check edge collision
    let foundEdge = null;
    for (const edge of this.edges) {
      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      const dist = this.distToSegment({ x: mouseX, y: mouseY }, fromNode, toNode);
      if (dist < 10) {
        foundEdge = edge;
        break;
      }
    }

    if (foundEdge) {
      this.hoveredEdge = foundEdge;
      this.hoveredNodeId = null;
      this.canvas.style.cursor = 'pointer';
      this.showTooltip(e.clientX, e.clientY, `
        <strong>Road Segment: ${foundEdge.from} ➔ ${foundEdge.to}</strong><br>
        Distance: ${foundEdge.distance} km<br>
        Status: <span style="color: ${foundEdge.status === 'BLOCKED' ? '#ef4444' : '#10b981'}; font-weight:bold;">${foundEdge.status}</span><br>
        Hazard Risk: ${foundEdge.hazardLevel}<br>
        <em style="color:#00f0ff; font-size:0.68rem;">[Click to toggle road closure]</em>
      `);
      return;
    }

    this.hoveredNodeId = null;
    this.hoveredEdge = null;
    this.canvas.style.cursor = 'default';
    this.hideTooltip();
  }

  distToSegment(p, v, w) {
    const l2 = Math.hypot(v.x - w.x, v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  showTooltip(x, y, contentHtml) {
    this.tooltip.innerHTML = contentHtml;
    this.tooltip.style.left = `${x + 14}px`;
    this.tooltip.style.top = `${y + 14}px`;
    this.tooltip.classList.remove('hidden');
  }

  hideTooltip() {
    this.tooltip.classList.add('hidden');
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    // 1. Draw Edges (Road Network)
    for (const edge of this.edges) {
      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      const isHovered = this.hoveredEdge && (this.hoveredEdge.id === edge.id);

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);

      if (edge.status === 'BLOCKED') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = isHovered ? 5 : 3;
        ctx.setLineDash([8, 6]);
      } else {
        ctx.setLineDash([]);
        switch (edge.hazardLevel) {
          case 'EXTREME': ctx.strokeStyle = '#dc2626'; break;
          case 'HIGH': ctx.strokeStyle = '#f97316'; break;
          case 'MEDIUM': ctx.strokeStyle = '#eab308'; break;
          case 'LOW': ctx.strokeStyle = '#38bdf8'; break;
          default: ctx.strokeStyle = '#1e293b'; break;
        }
        ctx.lineWidth = isHovered ? 4 : 2;
      }
      ctx.stroke();

      // Blocked Warning "✕" Badge
      if (edge.status === 'BLOCKED') {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(midX, midY, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', midX, midY);
      }
    }

    // 2. Draw Highlighted Active Multi-Routes & Traveling Flow Particles
    for (const route of this.highlightedRoutes) {
      if (!route.path || route.path.length < 2) continue;

      ctx.beginPath();
      for (let i = 0; i < route.path.length; i++) {
        const node = this.nodes.find(n => n.id === route.path[i]);
        if (!node) continue;
        if (i === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
      }

      ctx.strokeStyle = route.color || '#10b981';
      ctx.lineWidth = 5;
      ctx.setLineDash([]);
      ctx.shadowColor = route.color || '#10b981';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Animated Directional Particles along path
      for (let i = 0; i < route.path.length - 1; i++) {
        const p1 = this.nodes.find(n => n.id === route.path[i]);
        const p2 = this.nodes.find(n => n.id === route.path[i + 1]);
        if (!p1 || !p2) continue;

        const pOffset = (this.animFrame + i * 0.3) % 1;
        const px = p1.x + (p2.x - p1.x) * pOffset;
        const py = p1.y + (p2.y - p1.y) * pOffset;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = route.color || '#10b981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // 3. Draw Fleet Dispatches (Moving Rescue Vehicles)
    for (const dispatch of this.dispatches) {
      if (dispatch.status !== 'IN_TRANSIT' && dispatch.status !== 'REROUTED') continue;

      const pathNodes = dispatch.path.map(id => this.nodes.find(n => n.id === id)).filter(Boolean);
      if (pathNodes.length >= 2) {
        const start = pathNodes[0];
        const end = pathNodes[pathNodes.length - 1];
        const pct = (dispatch.progressPercent || 0) / 100;
        const currX = start.x + (end.x - start.x) * pct;
        const currY = start.y + (end.y - start.y) * pct;

        // Vehicle Pulsing Aura
        const auraColor = dispatch.status === 'REROUTED' ? 'rgba(236,72,153,0.4)' : 'rgba(0,240,255,0.4)';
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(currX, currY, 14 + Math.sin(this.animFrame * 5) * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dispatch.status === 'REROUTED' ? '#ec4899' : '#00f0ff';
        ctx.beginPath();
        ctx.arc(currX, currY, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚑', currX, currY);
      }
    }

    // 4. Draw Nodes (Shelters, Hospitals, Incidents, Hubs)
    for (const node of this.nodes) {
      const isHovered = this.hoveredNodeId === node.id;
      const isFocused = this.focusedNodeId === node.id;

      // Glowing Focus Ring for Selected Node
      if (isFocused) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 24 + Math.sin(this.animFrame * 5) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pulsing Ring for Incidents
      if (node.type === 'INCIDENT' || node.strandedCount > 0) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 18 + Math.sin(this.animFrame * 4) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, isFocused ? 18 : (isHovered ? 16 : 14), 0, Math.PI * 2);

      switch (node.type) {
        case 'SHELTER': ctx.fillStyle = '#00f0ff'; break;
        case 'HOSPITAL': ctx.fillStyle = '#ef4444'; break;
        case 'SUPPLY_DEPOT': ctx.fillStyle = '#10b981'; break;
        case 'INCIDENT': ctx.fillStyle = '#f59e0b'; break;
        default: ctx.fillStyle = '#475569'; break;
      }

      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = isHovered ? 18 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node ID & Name Tag
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, node.x, node.y - 20);
    }

    ctx.restore();
  }
}
