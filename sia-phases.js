(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const IMPORT_VERSION = '2026-06-02';
  const DATA_SCRIPTS = [
    'excel-projects-data.js',
    'excel-projects-data-1.js',
    'excel-projects-data-2.js',
    'excel-projects-data-3.js',
    'excel-projects-data-4.js',
    'excel-projects-data-5.js',
    'excel-projects-data-6.js',
    'excel-projects-import.js'
  ];

  const PHASES = {
    '31': { name: 'Etude', siaClass: 'sia-31', chipClass: 'phase-31' },
    '33': { name: 'Procédure', siaClass: 'sia-33', chipClass: 'phase-33' },
    '52': { name: 'Réalisation', siaClass: 'sia-52', chipClass: 'phase-52' },
    '53': { name: 'Facture / Clôture', siaClass: 'sia-53', chipClass: 'phase-53' }
  };

  const HIDDEN_PHASES = new Set(['32', '41', '51']);
  const STATUS_VALUES = ['À définir', 'Etude', 'Procédure', 'Réalisation', 'STANDBY', 'Facturation', 'Clôture', 'à supprimer'];
  const $ = (id) => document.getElementById(id);

  function readState() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return data && Array.isArray(data.projects) && Array.isArray(data.users)
        ? data
        : { activeUserId: '', users: [], projects: [] };
    } catch {
      return { activeUserId: '', users: [], projects: [] };
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${src}?v=${encodeURIComponent(IMPORT_VERSION)}`;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureExcelImport() {
    const state = readState();
    if (state.excelSeedVersion === IMPORT_VERSION) return false;

    try {
      for (const src of DATA_SCRIPTS) await loadScript(src);
      return window.EXCEL_IMPORT_APPLIED === true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function formatDate(value) {
    if (!value) return '—';
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return '—';
    return new Intl.DateTimeFormat('fr-CH').format(new Date(year, month - 1, day, 12));
  }

  function phaseCodeFromClass(node) {
    if (!node) return '';
    for (const code of Object.keys(PHASES)) {
      if (node.classList.contains(PHASES[code].siaClass) || node.classList.contains(PHASES[code].chipClass)) return code;
    }
    return '';
  }

  function addRuntimeStyles() {
    if ($('excelProjectRuntimeStyles')) return;
    const style = document.createElement('style');
    style.id = 'excelProjectRuntimeStyles';
    style.textContent = `
      .sia-chips{display:none!important}
      .project-phase-chips{margin-top:7px}
      .project-cda{font-weight:750;color:#334155}
      .status.a-definir{background:#e5e7eb;color:#475569}
      .status.etude{background:#dbeafe;color:#1d4ed8}
      .status.procedure{background:#ede9fe;color:#6d28d9}
      .status.realisation{background:#ffedd5;color:#c2410c}
      .status.standby{background:#fef3c7;color:#92400e}
      .status.facturation{background:#cffafe;color:#0e7490}
      .status.cloture{background:#dcfce7;color:#166534}
      .status.a-supprimer{background:#fee2e2;color:#b91c1c}
      #projectCda{font-variant-numeric:tabular-nums}
      @media(max-width:720px){
        #projectsView .project-table td:nth-child(5){display:grid!important;grid-template-columns:105px minmax(0,1fr)!important;gap:10px!important;justify-content:initial!important;border-bottom:1px solid #eef2f7!important}
        #projectsView .project-table td:nth-child(5)::before{content:"CDA"!important;display:block!important}
        #projectsView .project-table td:nth-child(6)::before{content:"Descriptif"!important}
        #projectsView .project-table td:nth-child(7)::before{content:"Responsable"!important}
        #projectsView .project-table td:nth-child(8)::before{content:"Budget"!important}
        #projectsView .project-table td:nth-child(9){display:grid!important;grid-template-columns:105px minmax(0,1fr)!important;gap:10px!important;justify-content:initial!important;border-bottom:1px solid #eef2f7!important;padding:10px 12px!important}
        #projectsView .project-table td:nth-child(9)::before{content:"Status"!important;display:block!important}
        #projectsView .project-table td:nth-child(10){display:flex!important;justify-content:flex-end!important;gap:8px!important;border-bottom:0!important;padding:8px 10px!important}
        #projectsView .project-table td:nth-child(10)::before{display:none!important}
      }
      @media(max-width:420px){
        #projectsView .project-table td:nth-child(5),
        #projectsView .project-table td:nth-child(9){grid-template-columns:92px minmax(0,1fr)!important;padding:9px 10px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function setupStatusOptions() {
    const filter = $('filterStatus');
    if (filter) {
      const current = filter.value;
      filter.innerHTML = '<option value="">Tous les status</option>' +
        STATUS_VALUES.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
      if (STATUS_VALUES.includes(current)) filter.value = current;
    }

    const select = $('projectStatus');
    if (select) {
      const current = select.value;
      select.innerHTML = STATUS_VALUES.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('');
      select.value = STATUS_VALUES.includes(current) ? current : 'À définir';
    }
  }

  function setupCdaField() {
    if ($('projectCda')) return;
    const affair = $('projectAffairNumber');
    if (!affair) return;

    const label = document.createElement('label');
    label.innerHTML = 'CDA<input id="projectCda" inputmode="numeric" placeholder="Ex. 90700509" />';
    affair.closest('label')?.insertAdjacentElement('afterend', label);

    const commune = $('projectCommune');
    if (commune) commune.required = false;
  }

  function syncProjectForm() {
    setupCdaField();
    setupStatusOptions();

    const state = readState();
    const id = $('projectId')?.value || '';
    const project = state.projects.find((item) => item.id === id) || null;

    if ($('projectCda')) $('projectCda').value = project?.cda || '';
    if ($('projectStatus')) $('projectStatus').value = project?.status || 'À définir';

    document.querySelectorAll('#siaPhasesForm .sia-row').forEach((row) => {
      const input = row.querySelector('[data-start]');
      const code = input?.dataset.start || '';
      if (HIDDEN_PHASES.has(code)) {
        row.style.display = 'none';
        return;
      }

      const meta = PHASES[code];
      if (!meta) return;
      row.style.display = '';
      const name = row.querySelector('.phase-name');
      if (name) name.innerHTML = `<span class="sia-dot ${meta.siaClass}"></span>${escapeHtml(meta.name)}`;
    });

    const phaseSection = $('siaPhasesForm')?.closest('.form-section');
    if (phaseSection) {
      const h3 = phaseSection.querySelector('h3');
      const p = phaseSection.querySelector('p');
      if (h3) h3.textContent = 'Phases du projet';
      if (p) p.textContent = 'Les dates alimentent automatiquement le diagramme de Gantt.';
    }
  }

  function createPhaseChips(project) {
    const entries = Object.entries(PHASES).flatMap(([code, meta]) => {
      const data = project?.phases?.[code];
      if (!data || (!data.start && !data.end)) return [];
      const title = `${meta.name} : ${formatDate(data.start)} → ${formatDate(data.end)}`;
      return [`<span class="phase-chip ${meta.chipClass}" title="${escapeHtml(title)}">${escapeHtml(meta.name)}</span>`];
    });

    return entries.length
      ? `<div class="phase-chips project-phase-chips">${entries.join('')}</div>`
      : '';
  }

  function enhanceProjectTable() {
    const table = document.querySelector('#projectsView .project-table');
    const tbody = $('projectsTableBody');
    if (!table || !tbody) return;

    const headerRow = table.querySelector('thead tr');
    if (headerRow && !headerRow.querySelector('[data-cda-header]')) {
      const th = document.createElement('th');
      th.dataset.cdaHeader = 'true';
      th.textContent = 'CDA';
      headerRow.children[3]?.insertAdjacentElement('afterend', th);
    }

    const state = readState();
    tbody.querySelectorAll('tr').forEach((row) => {
      const edit = row.querySelector('[data-edit]');
      const project = state.projects.find((item) => item.id === edit?.dataset.edit);
      if (!project) return;

      let cdaCell = row.querySelector('[data-cda-cell]');
      if (!cdaCell) {
        cdaCell = document.createElement('td');
        cdaCell.dataset.cdaCell = 'true';
        row.children[3]?.insertAdjacentElement('afterend', cdaCell);
      }
      cdaCell.innerHTML = `<span class="project-cda">${escapeHtml(project.cda || '—')}</span>`;

      const projectCell = row.children[3];
      if (projectCell) {
        projectCell.querySelector('.project-phase-chips')?.remove();
        projectCell.insertAdjacentHTML('beforeend', createPhaseChips(project));
      }
    });
  }

  function relabelGantt() {
    const legend = document.querySelector('#ganttView .legend');
    if (legend) {
      legend.querySelectorAll('span').forEach((span) => {
        const icon = span.querySelector('i');
        const code = phaseCodeFromClass(icon);
        if (code) span.innerHTML = `${icon.outerHTML} ${escapeHtml(PHASES[code].name)}`;
      });
    }

    document.querySelectorAll('#ganttWrap .gantt-bar').forEach((bar) => {
      const code = phaseCodeFromClass(bar);
      if (!code) return;
      const meta = PHASES[code];
      if (/^SIA\s+\d+/.test(bar.textContent.trim()) || !bar.textContent.trim()) bar.textContent = meta.name;
      if (bar.title) bar.title = bar.title.replace(/SIA\s+\d+\s+—\s+[^·:]+/, meta.name);
    });

    document.querySelectorAll('#ganttWrap .gantt-label strong').forEach((label) => {
      const match = label.textContent.match(/^SIA\s+(31|33|52|53)\b/);
      if (match) label.textContent = PHASES[match[1]].name;
    });

    const header = document.querySelector('#ganttWrap .gantt-label.header');
    if (header) header.textContent = header.textContent.replace('Phase SIA', 'Phase').replace('Projet / phases SIA', 'Projet / phases');

    if ($('ganttTitle')) $('ganttTitle').textContent = $('ganttTitle').textContent.replace(' — phases SIA', '');
    if ($('ganttHint')) $('ganttHint').textContent = $('ganttHint').textContent.replace(/phase\(s\) SIA/g, 'phase(s)').replace(/phases SIA/g, 'phases');

    document.querySelectorAll('.phase-preview-label').forEach((label) => {
      const code = phaseCodeFromClass(label.querySelector('i'));
      const text = label.querySelector('span');
      if (!code || !text) return;
      text.textContent = text.textContent.replace(/^SIA\s+\d+\s+—\s+/, `${PHASES[code].name} — `);
    });

    const sortOption = document.querySelector('#sortProjects option[value="sia"]');
    if (sortOption) sortOption.textContent = 'Trier : Phase (Etude / Procédure / Réalisation / Clôture)';
  }

  function parseDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day, 12) : null;
  }

  function saveProject(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const state = readState();
    const id = $('projectId')?.value || `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const affairNumber = String($('projectAffairNumber')?.value || '').trim().replace(/\s+/g, '');

    if (!/^\d{5}\.\d{5,6}$/.test(affairNumber)) {
      alert('N° d’affaire invalide. Formats acceptés : 20201.05000 ou 20202.100200');
      return;
    }

    if (state.projects.some((project) => project.id !== id && project.affairNumber === affairNumber)) {
      alert('Ce N° d’affaire est déjà utilisé par un autre projet.');
      return;
    }

    const phases = {};
    for (const code of Object.keys(PHASES)) {
      const start = document.querySelector(`[data-start="${code}"]`)?.value || '';
      const end = document.querySelector(`[data-end="${code}"]`)?.value || '';
      if (start && end && parseDate(end) < parseDate(start)) {
        alert(`La fin de la phase ${PHASES[code].name} est antérieure au début.`);
        return;
      }
      if (start || end) phases[code] = { start, end };
    }

    const index = state.projects.findIndex((project) => project.id === id);
    const previous = index >= 0 ? state.projects[index] : null;
    const project = {
      id,
      affairNumber,
      cda: String($('projectCda')?.value || '').trim(),
      voltage: $('projectVoltage')?.value || '',
      commune: String($('projectCommune')?.value || '').trim(),
      name: String($('projectName')?.value || '').trim(),
      description: String($('projectDescription')?.value || '').trim(),
      ownerId: $('projectOwner')?.value || state.activeUserId || '',
      status: $('projectStatus')?.value || 'À définir',
      erpState: previous?.erpState || '',
      budget: {
        planned: Number($('budgetPlannedInput')?.value || 0),
        committed: Number($('budgetCommittedInput')?.value || 0),
        actual: Number($('budgetActualInput')?.value || 0),
        reference: String($('budgetReferenceInput')?.value || '').trim()
      },
      phases
    };

    if (!project.name) {
      alert('Le nom du projet est obligatoire.');
      return;
    }

    if (index >= 0) state.projects[index] = project;
    else state.projects.push(project);

    writeState(state);
    window.location.reload();
  }

  let scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      addRuntimeStyles();
      setupStatusOptions();
      setupCdaField();
      enhanceProjectTable();
      relabelGantt();
    });
  }

  function bindUi() {
    setTimeout(addRuntimeStyles, 0);
    setupStatusOptions();
    setupCdaField();
    syncProjectForm();
    enhanceProjectTable();
    relabelGantt();

    const form = $('projectForm');
    if (form) form.addEventListener('submit', saveProject, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-edit], #newProjectBtn, #dashboardNewProjectBtn')) {
        setTimeout(syncProjectForm, 0);
      }
      if (event.target.closest('[data-view="gantt"], [data-gantt], #openGanttDashboard')) {
        setTimeout(scheduleEnhance, 0);
      }
    });

    const modal = $('projectModal');
    if (modal) {
      new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) setTimeout(syncProjectForm, 0);
      }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }

    const tbody = $('projectsTableBody');
    if (tbody) new MutationObserver(scheduleEnhance).observe(tbody, { childList: true });

    const gantt = $('ganttWrap');
    if (gantt) new MutationObserver(scheduleEnhance).observe(gantt, { childList: true, subtree: true });

    const dashboard = $('dashboardPhasePreview');
    if (dashboard) new MutationObserver(scheduleEnhance).observe(dashboard, { childList: true, subtree: true });

    window.addEventListener('pageshow', scheduleEnhance);
    scheduleEnhance();
  }

  (async () => {
    const imported = await ensureExcelImport();
    if (imported) {
      window.location.reload();
      return;
    }
    bindUi();
  })();
})();
