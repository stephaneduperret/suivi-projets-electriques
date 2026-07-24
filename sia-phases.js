(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const SIA_PHASES = [
    { code: '31', name: 'Avant-projet', cls: 'phase-31' },
    { code: '32', name: 'Projet de l’ouvrage', cls: 'phase-32' },
    { code: '33', name: 'Procédure d’autorisation', cls: 'phase-33' },
    { code: '41', name: 'Appels d’offres', cls: 'phase-41' },
    { code: '51', name: 'Projet d’exécution', cls: 'phase-51' },
    { code: '52', name: 'Exécution', cls: 'phase-52' },
    { code: '53', name: 'Mise en service / achèvement', cls: 'phase-53' }
  ];

  let ganttOffsetMonths = 0;
  const $ = (id) => document.getElementById(id);

  function readState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data && Array.isArray(data.projects) && Array.isArray(data.users)
        ? data
        : { projects: [], users: [] };
    } catch {
      return { projects: [], users: [] };
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function localDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  function formatDate(value) {
    const date = typeof value === 'string' ? localDate(value) : value;
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date);
  }

  function getRecordedPhases(project) {
    return SIA_PHASES.map((phase) => {
      const data = project?.phases?.[phase.code] || {};
      return { ...phase, start: data.start || '', end: data.end || '' };
    }).filter((phase) => phase.start || phase.end);
  }

  function renderPhaseChips(project) {
    const recorded = getRecordedPhases(project);
    if (!recorded.length) {
      return '<div class="phase-chips empty"><span>Aucune phase SIA datée</span></div>';
    }
    return `<div class="phase-chips">${recorded.map((phase) => {
      const dates = `${formatDate(phase.start)} → ${formatDate(phase.end)}`;
      return `<span class="phase-chip ${phase.cls}" title="SIA ${phase.code} — ${escapeHtml(phase.name)} · ${escapeHtml(dates)}">SIA ${phase.code}</span>`;
    }).join('')}</div>`;
  }

  function enhanceProjectTable() {
    const state = readState();
    const tbody = $('projectsTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach((row) => {
      const edit = row.querySelector('[data-edit]');
      const project = state.projects.find((item) => item.id === edit?.dataset.edit);
      const projectCell = row.children[3];
      if (!project || !projectCell) return;

      const old = projectCell.querySelector('.phase-chips');
      if (old) old.remove();
      projectCell.insertAdjacentHTML('beforeend', renderPhaseChips(project));
    });
  }

  function enhanceSiaForm() {
    const rows = document.querySelectorAll('#siaPhasesForm .sia-row');
    rows.forEach((row, index) => {
      const phase = SIA_PHASES[index];
      if (!phase) return;
      SIA_PHASES.forEach((item) => row.classList.remove(item.cls));
      row.classList.add(phase.cls);
      const name = row.querySelector('.phase-name');
      if (name && !name.querySelector('.phase-dot')) {
        name.insertAdjacentHTML('afterbegin', `<span class="phase-dot ${phase.cls}"></span>`);
      }
    });
  }

  function enhanceLegend() {
    const legend = document.querySelector('#ganttView .legend');
    if (!legend) return;
    legend.classList.add('sia-legend');
    legend.innerHTML = SIA_PHASES.map((phase) =>
      `<span title="${escapeHtml(phase.name)}"><i class="phase-dot ${phase.cls}"></i> SIA ${phase.code}</span>`
    ).join('');
  }

  function percent(date, min, max) {
    const total = Math.max(1, (max.getTime() - min.getTime()) / 86400000);
    return Math.max(0, Math.min(100, ((date.getTime() - min.getTime()) / 86400000) / total * 100));
  }

  function assignLanes(segments) {
    const sorted = segments.map((segment) => ({ ...segment })).sort((a, b) =>
      (a.start || a.end).getTime() - (b.start || b.end).getTime()
    );
    const laneEnds = [];

    sorted.forEach((segment) => {
      const start = (segment.start || segment.end).getTime();
      const end = (segment.end || segment.start).getTime();
      let lane = laneEnds.findIndex((laneEnd) => laneEnd < start);
      if (lane < 0) lane = laneEnds.length;
      segment.lane = lane;
      laneEnds[lane] = end;
    });

    return { segments: sorted, laneCount: Math.max(1, laneEnds.length) };
  }

  function buildRows() {
    const state = readState();
    const mode = $('ganttMode')?.value || 'all';
    const ownerFilter = $('ganttOwnerFilter')?.value || '';
    const selectedProjectId = $('ganttProjectSelect')?.value || '';

    if (mode === 'selected') {
      const project = state.projects.find((item) => item.id === selectedProjectId);
      if (!project) return { rows: [], selected: true };
      const rows = getRecordedPhases(project).map((phase) => ({
        label: `SIA ${phase.code} — ${phase.name}`,
        subtitle: `${formatDate(phase.start)} → ${formatDate(phase.end)}`,
        segments: [{
          code: phase.code,
          name: phase.name,
          cls: phase.cls,
          start: localDate(phase.start),
          end: localDate(phase.end)
        }]
      }));
      if ($('ganttTitle')) $('ganttTitle').textContent = project.name;
      if ($('ganttHint')) $('ganttHint').textContent = `${project.commune} · ${project.voltage} · ${rows.length} phase(s) SIA datée(s)`;
      return { rows, selected: true };
    }

    const users = new Map(state.users.map((user) => [user.id, user]));
    const projects = state.projects.filter((project) => !ownerFilter || project.ownerId === ownerFilter);
    const rows = projects.map((project) => ({
      label: project.name,
      subtitle: `${users.get(project.ownerId)?.name || 'Sans responsable'} · ${project.commune} · ${project.voltage}`,
      segments: getRecordedPhases(project).map((phase) => ({
        code: phase.code,
        name: phase.name,
        cls: phase.cls,
        start: localDate(phase.start),
        end: localDate(phase.end)
      }))
    })).filter((row) => row.segments.length);

    const count = rows.reduce((sum, row) => sum + row.segments.length, 0);
    if ($('ganttTitle')) $('ganttTitle').textContent = 'Planning général';
    if ($('ganttHint')) $('ganttHint').textContent = `${rows.length} projet(s) · ${count} phase(s) SIA datée(s)`;
    return { rows, selected: false };
  }

  function renderEnhancedGantt() {
    const wrap = $('ganttWrap');
    if (!wrap) return;
    const { rows, selected } = buildRows();
    const segments = rows.flatMap((row) => row.segments).filter((segment) => segment.start || segment.end);

    if (!segments.length) {
      wrap.innerHTML = '<div class="gantt-empty">Ajoutez des dates SIA pour afficher le planning.</div>';
      return;
    }

    const dates = segments.flatMap((segment) => [segment.start, segment.end].filter(Boolean));
    let min = new Date(Math.min(...dates.map((date) => date.getTime())));
    let max = new Date(Math.max(...dates.map((date) => date.getTime())));
    min = new Date(min.getFullYear(), min.getMonth() - 1 + ganttOffsetMonths, 1);
    max = new Date(max.getFullYear(), max.getMonth() + 2 + ganttOffsetMonths, 0);
    const minimumSpan = new Date(min.getFullYear(), min.getMonth() + 6, 0);
    if (max < minimumSpan) max = minimumSpan;

    const months = [];
    for (let date = new Date(min.getFullYear(), min.getMonth(), 1); date <= max; date = new Date(date.getFullYear(), date.getMonth() + 1, 1)) {
      months.push(new Date(date));
    }

    const monthWidth = 92;
    const timelineWidth = Math.max(800, months.length * monthWidth);
    const labelWidth = selected ? 300 : 280;

    const body = rows.map((row) => {
      const laneData = selected
        ? { segments: row.segments.map((segment) => ({ ...segment, lane: 0 })), laneCount: 1 }
        : assignLanes(row.segments);
      const rowHeight = selected ? 48 : Math.max(52, 20 + laneData.laneCount * 30);

      const bars = laneData.segments.map((segment) => {
        const start = segment.start || segment.end;
        const end = segment.end || segment.start;
        const left = percent(start, min, max);
        const width = Math.max(0.8, percent(end, min, max) - left);
        const datesText = `${formatDate(start)} → ${formatDate(end)}`;
        const label = selected ? datesText : `SIA ${segment.code}`;
        return `<div class="gantt-bar ${segment.cls}" style="left:${left}%;width:${width}%;top:${8 + segment.lane * 30}px" title="SIA ${segment.code} — ${escapeHtml(segment.name)} · ${escapeHtml(datesText)}">${escapeHtml(label)}</div>`;
      }).join('');

      const chips = selected ? '' : `<div class="gantt-phase-chips">${row.segments.map((segment) =>
        `<span class="phase-chip ${segment.cls}">SIA ${segment.code}</span>`
      ).join('')}</div>`;

      return `<div class="gantt-label" style="min-height:${rowHeight}px"><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.subtitle)}</small>${chips}</div><div class="gantt-timeline" style="width:${timelineWidth}px;min-height:${rowHeight}px;--gantt-cell-width:${monthWidth}px">${bars}${todayLine(min, max)}</div>`;
    }).join('');

    wrap.innerHTML = `<div class="gantt-grid" style="grid-template-columns:${labelWidth}px ${timelineWidth}px"><div class="gantt-label header">${selected ? 'Phase SIA' : 'Projet / phases SIA'}</div><div class="gantt-months" style="grid-template-columns:repeat(${months.length},${monthWidth}px);width:${timelineWidth}px">${months.map((month) => `<div class="gantt-month">${month.toLocaleDateString('fr-CH', { month: 'short', year: '2-digit' })}</div>`).join('')}</div>${body}</div>`;
  }

  function todayLine(min, max) {
    const today = new Date();
    if (today < min || today > max) return '';
    return `<div class="gantt-today" style="left:${percent(today, min, max)}%" title="Aujourd’hui"></div>`;
  }

  function scheduleEnhancements() {
    window.setTimeout(() => {
      enhanceProjectTable();
      enhanceSiaForm();
      enhanceLegend();
      if ($('ganttView')?.classList.contains('active')) renderEnhancedGantt();
    }, 0);
  }

  function bind() {
    enhanceProjectTable();
    enhanceSiaForm();
    enhanceLegend();

    document.addEventListener('click', (event) => {
      const ganttProjectButton = event.target.closest('[data-gantt]');
      if (ganttProjectButton) {
        window.setTimeout(() => {
          if ($('ganttProjectSelect')) $('ganttProjectSelect').value = ganttProjectButton.dataset.gantt;
          renderEnhancedGantt();
        }, 0);
      }
      if (event.target.closest('[data-view="gantt"]')) window.setTimeout(renderEnhancedGantt, 0);
    });

    ['searchInput', 'filterVoltage', 'filterStatus', 'filterOwner'].forEach((id) => {
      $(id)?.addEventListener(id === 'searchInput' ? 'input' : 'change', () => window.setTimeout(enhanceProjectTable, 0));
    });

    $('projectForm')?.addEventListener('submit', scheduleEnhancements);
    $('importJsonInput')?.addEventListener('change', () => window.setTimeout(scheduleEnhancements, 50));
    $('ganttMode')?.addEventListener('change', () => window.setTimeout(renderEnhancedGantt, 0));
    $('ganttOwnerFilter')?.addEventListener('change', () => window.setTimeout(renderEnhancedGantt, 0));
    $('ganttProjectSelect')?.addEventListener('change', () => window.setTimeout(renderEnhancedGantt, 0));

    if ($('ganttPrevBtn')) $('ganttPrevBtn').onclick = () => { ganttOffsetMonths -= 6; renderEnhancedGantt(); };
    if ($('ganttTodayBtn')) $('ganttTodayBtn').onclick = () => { ganttOffsetMonths = 0; renderEnhancedGantt(); };
    if ($('ganttNextBtn')) $('ganttNextBtn').onclick = () => { ganttOffsetMonths += 6; renderEnhancedGantt(); };
  }

  bind();
})();
