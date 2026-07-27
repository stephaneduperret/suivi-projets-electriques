(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const DAY = 86400000;
  const PHASES = {
    '31': { name: 'Etude', cls: 'sia-31' },
    '32': { name: 'Projet de l’ouvrage', cls: 'sia-32' },
    '33': { name: 'Procédure', cls: 'sia-33' },
    '41': { name: 'Appels d’offres', cls: 'sia-41' },
    '51': { name: 'Projet d’exécution', cls: 'sia-51' },
    '52': { name: 'Réalisation', cls: 'sia-52' },
    '53': { name: 'Facture / Clôture', cls: 'sia-53' }
  };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function parseDate(value) {
    if (!value) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day, 12, 0, 0) : null;
  }

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (state && Array.isArray(state.projects) && Array.isArray(state.users)) return state;
    } catch {}
    return { projects: [], users: [], activeUserId: '' };
  }

  function selectedProjects(state) {
    const globalMode = document.getElementById('dashboardScopeToggle')?.dataset.global === 'true';
    if (globalMode) return state.projects;
    return state.projects.filter((project) => project.ownerId === state.activeUserId);
  }

  function collectPhases(projects) {
    const rows = [];
    projects.forEach((project) => {
      Object.entries(project.phases || {}).forEach(([code, data]) => {
        const meta = PHASES[code] || { name: `SIA ${code}`, cls: `sia-${code}` };
        const start = parseDate(data?.start || data?.end);
        const end = parseDate(data?.end || data?.start);
        if (!start || !end) return;
        rows.push({
          code,
          name: meta.name,
          cls: meta.cls,
          start,
          end,
          projectName: project.name || ''
        });
      });
    });
    rows.sort((a, b) => a.start - b.start);
    return rows;
  }

  function ensureStyles() {
    if (document.getElementById('dashboardTodayMarkerStyles')) return;
    const style = document.createElement('style');
    style.id = 'dashboardTodayMarkerStyles';
    style.textContent = `
      .phase-preview-chart{position:relative}
      .phase-preview-today{
        position:absolute;
        top:0;
        bottom:0;
        width:2px;
        background:#ef4444;
        z-index:8;
        pointer-events:none;
        box-shadow:0 0 0 1px rgba(239,68,68,.05);
      }
      .phase-preview-today::before{
        content:'Aujourd’hui';
        position:absolute;
        top:-27px;
        left:50%;
        transform:translateX(-50%);
        padding:3px 6px;
        border-radius:7px;
        background:#fff;
        color:#ef4444;
        font-size:10px;
        font-weight:800;
        white-space:nowrap;
        box-shadow:0 1px 4px rgba(15,23,42,.08);
      }
      .phase-preview-today::after{
        content:'';
        position:absolute;
        top:-4px;
        left:50%;
        width:7px;
        height:7px;
        border-radius:50%;
        background:#ef4444;
        transform:translate(-50%,-50%);
      }
      .phase-preview-days .today-label{
        color:#ef4444;
        font-weight:800;
      }
      @media(max-width:760px){
        .phase-preview-today::before{font-size:9px;top:-25px}
      }
    `;
    document.head.appendChild(style);
  }

  let rendering = false;

  function renderTodayAwarePreview() {
    if (rendering) return;
    const wrap = document.getElementById('dashboardPhasePreview');
    if (!wrap) return;

    const existing = wrap.querySelector('.phase-preview-grid[data-today-aware="true"]');
    if (existing) return;

    const state = readState();
    const all = collectPhases(selectedProjects(state));
    if (!all.length) return;

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const upcoming = all.filter((phase) => phase.end >= today);
    const rows = (upcoming.length ? upcoming : [...all].reverse()).slice(0, 4);
    rows.sort((a, b) => a.start - b.start);

    const phaseMin = Math.min(...rows.map((row) => row.start.getTime()));
    const phaseMax = Math.max(...rows.map((row) => row.end.getTime()));

    let min = new Date(Math.min(phaseMin, today.getTime()));
    let max = new Date(Math.max(phaseMax, today.getTime()));

    // Laisse une marge quand aujourd’hui est au bord de la période.
    if (today.getTime() <= phaseMin) min = new Date(today.getTime() - 7 * DAY);
    if (today.getTime() >= phaseMax) max = new Date(today.getTime() + 7 * DAY);

    if (max <= min) max = new Date(min.getTime() + 13 * DAY);
    const spanDays = Math.max(13, Math.ceil((max - min) / DAY));
    max = new Date(min.getTime() + spanDays * DAY);

    const todayPct = Math.max(0, Math.min(100, (today - min) / (max - min) * 100));

    const dayLabels = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(min.getTime() + (spanDays * index / 13) * DAY);
      const distance = Math.abs(date - today);
      const className = distance <= (spanDays / 13 * DAY / 2) ? ' class="today-label"' : '';
      return `<span${className}>${date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' })}</span>`;
    }).join('');

    const labels = rows.map((row) => `
      <div class="phase-preview-label"><i class="${row.cls}"></i><span>${esc(row.name)} — ${esc(row.projectName)}</span></div>
    `).join('');

    const bars = rows.map((row) => {
      const left = Math.max(0, Math.min(100, (row.start - min) / (max - min) * 100));
      const right = Math.max(left, Math.min(100, (row.end - min) / (max - min) * 100));
      const width = Math.max(2, right - left);
      return `<div class="phase-preview-row"><div class="phase-preview-bar ${row.cls}" style="left:${left}%;width:${width}%" title="${esc(row.name)}"></div></div>`;
    }).join('');

    rendering = true;
    wrap.innerHTML = `
      <div class="phase-preview-grid" data-today-aware="true">
        <div class="phase-preview-labels">
          <div class="phase-month">${min.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })}</div>
          ${labels}
        </div>
        <div class="phase-preview-chart">
          <div class="phase-preview-days">${dayLabels}</div>
          <div class="phase-preview-rows">${bars}</div>
          <div class="phase-preview-today" style="left:${todayPct}%" title="Aujourd’hui — ${today.toLocaleDateString('fr-CH')}"></div>
        </div>
      </div>`;
    rendering = false;

    requestAnimationFrame(() => {
      const chart = wrap.querySelector('.phase-preview-chart');
      const marker = wrap.querySelector('.phase-preview-today');
      if (!chart || !marker || wrap.scrollWidth <= wrap.clientWidth) return;
      const target = chart.offsetLeft + marker.offsetLeft - (wrap.clientWidth / 2);
      wrap.scrollLeft = Math.max(0, Math.min(target, wrap.scrollWidth - wrap.clientWidth));
    });
  }

  ensureStyles();

  const wrap = document.getElementById('dashboardPhasePreview');
  if (wrap) {
    const observer = new MutationObserver(() => {
      if (rendering) return;
      if (!wrap.querySelector('.phase-preview-grid[data-today-aware="true"]')) {
        requestAnimationFrame(renderTodayAwarePreview);
      }
    });
    observer.observe(wrap, { childList: true, subtree: false });
  }

  document.getElementById('activeUserSelect')?.addEventListener('change', () => {
    setTimeout(renderTodayAwarePreview, 30);
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('#dashboardScopeToggle')) setTimeout(renderTodayAwarePreview, 30);
  });

  window.addEventListener('pageshow', () => setTimeout(renderTodayAwarePreview, 50));
  setTimeout(renderTodayAwarePreview, 50);
})();