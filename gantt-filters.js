(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const $ = (id) => document.getElementById(id);

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (state && Array.isArray(state.projects) && Array.isArray(state.users)) return state;
    } catch {}
    return { projects: [], users: [], activeUserId: '' };
  }

  function ensureStyles() {
    if ($('ganttFilterStyles')) return;
    const style = document.createElement('style');
    style.id = 'ganttFilterStyles';
    style.textContent = `
      .gantt-search-box{
        min-width:240px;
        height:42px;
        display:flex;
        align-items:center;
        gap:8px;
        padding:0 12px;
        border:1px solid var(--border,#dfe4ea);
        border-radius:12px;
        background:#fff;
      }
      .gantt-search-box:focus-within{
        border-color:#f2b600;
        box-shadow:0 0 0 2px rgba(242,182,0,.12);
      }
      .gantt-search-box span{color:#7c8ba1;font-size:16px;line-height:1}
      .gantt-search-box input{
        width:100%;min-width:0;border:0;outline:0;background:transparent;
        color:#10203a;font:inherit;font-size:13px;
      }
      .gantt-filter-count{
        display:inline-flex;align-items:center;min-height:42px;padding:0 10px;
        color:#65758b;font-size:11px;font-weight:650;white-space:nowrap;
      }
      .gantt-filter-disabled{opacity:.5;pointer-events:none}
      @media(max-width:900px){
        .gantt-search-box{width:100%;min-width:0}
        #ganttStatusFilter{width:100%}
        .gantt-filter-count{width:100%;min-height:auto;padding:2px 3px 0}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureControls() {
    const toolbar = document.querySelector('#ganttView .premium-toolbar');
    if (!toolbar) return false;

    if (!$('ganttStatusFilter')) {
      const status = document.createElement('select');
      status.id = 'ganttStatusFilter';
      status.className = 'control';
      status.setAttribute('aria-label', 'Filtrer le Gantt par état');
      status.innerHTML = '<option value="">Tous les états</option>';
      $('ganttOwnerFilter')?.insertAdjacentElement('afterend', status);
    }

    if (!$('ganttSearchInput')) {
      const box = document.createElement('label');
      box.className = 'gantt-search-box';
      box.innerHTML = '<span>⌕</span><input id="ganttSearchInput" type="search" placeholder="Rechercher un mot-clé…" autocomplete="off" aria-label="Rechercher un projet dans le Gantt">';
      $('ganttStatusFilter')?.insertAdjacentElement('afterend', box);
    }

    if (!$('ganttFilterCount')) {
      const count = document.createElement('span');
      count.id = 'ganttFilterCount';
      count.className = 'gantt-filter-count';
      const searchBox = $('ganttSearchInput')?.closest('.gantt-search-box');
      searchBox?.insertAdjacentElement('afterend', count);
    }

    return true;
  }

  function populateStatuses() {
    const select = $('ganttStatusFilter');
    if (!select) return;

    const old = select.value;
    const states = readState();
    const statuses = [...new Set(states.projects.map((project) => String(project.status || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'fr-CH', { sensitivity: 'base' }));

    select.innerHTML = '<option value="">Tous les états</option>' + statuses
      .map((status) => `<option value="${status.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${status.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</option>`)
      .join('');

    if (statuses.includes(old)) select.value = old;
  }

  function projectSearchText(project, usersById) {
    const phases = Object.entries(project.phases || {}).map(([code, phase]) => `${code} ${phase?.start || ''} ${phase?.end || ''}`).join(' ');
    return normalize([
      project.affairNumber,
      project.cda,
      project.name,
      project.commune,
      project.description,
      project.status,
      project.erpState,
      project.voltage,
      project.budget?.reference,
      usersById.get(project.ownerId) || '',
      phases
    ].join(' '));
  }

  function buildProjectMap(state) {
    const map = new Map();
    state.projects.forEach((project) => {
      const label = project.affairNumber ? `${project.affairNumber} — ${project.name}` : project.name;
      const key = normalize(label);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(project);
    });
    return map;
  }

  function setFilterAvailability() {
    const selectedMode = $('ganttMode')?.value === 'selected';
    const status = $('ganttStatusFilter');
    const search = $('ganttSearchInput');
    const box = search?.closest('.gantt-search-box');

    if (status) {
      status.disabled = selectedMode;
      status.classList.toggle('gantt-filter-disabled', selectedMode);
      status.title = selectedMode ? 'Disponible avec « Tous les projets »' : 'Filtrer par état';
    }
    if (search) {
      search.disabled = selectedMode;
      box?.classList.toggle('gantt-filter-disabled', selectedMode);
      search.title = selectedMode ? 'Disponible avec « Tous les projets »' : 'Recherche par mot-clé';
    }
  }

  let applying = false;
  function applyFilters() {
    if (applying) return;
    applying = true;

    try {
      setFilterAvailability();
      if ($('ganttMode')?.value === 'selected') {
        if ($('ganttFilterCount')) $('ganttFilterCount').textContent = '';
        return;
      }

      const grid = document.querySelector('#ganttWrap .gantt-grid');
      if (!grid) {
        if ($('ganttFilterCount')) $('ganttFilterCount').textContent = '';
        return;
      }

      const state = readState();
      const statusValue = $('ganttStatusFilter')?.value || '';
      const query = normalize($('ganttSearchInput')?.value || '');
      const usersById = new Map(state.users.map((user) => [user.id, user.name || '']));
      const projectMap = buildProjectMap(state);
      const labels = [...grid.querySelectorAll(':scope > .gantt-label:not(.header)')];
      let visible = 0;
      const visiblePhaseClasses = new Set();

      labels.forEach((labelNode) => {
        const timeline = labelNode.nextElementSibling;
        if (!timeline?.classList.contains('gantt-timeline')) return;

        const label = normalize(labelNode.querySelector('strong')?.textContent || labelNode.textContent || '');
        const candidates = projectMap.get(label) || [];
        const project = candidates[0] || null;

        const stateMatch = !statusValue || (project && project.status === statusValue);
        const text = project ? projectSearchText(project, usersById) : normalize(labelNode.textContent);
        const queryMatch = !query || text.includes(query);
        const show = stateMatch && queryMatch;

        labelNode.style.display = show ? '' : 'none';
        timeline.style.display = show ? '' : 'none';

        if (show) {
          visible += 1;
          timeline.querySelectorAll('.gantt-bar').forEach((bar) => {
            [...bar.classList].filter((cls) => cls.startsWith('sia-')).forEach((cls) => visiblePhaseClasses.add(cls));
          });
        }
      });

      const count = $('ganttFilterCount');
      if (count) {
        const total = labels.length;
        count.textContent = (statusValue || query) ? `${visible} / ${total} projet${total > 1 ? 's' : ''}` : `${total} projet${total > 1 ? 's' : ''}`;
      }

      document.querySelectorAll('#ganttView .legend span').forEach((item) => {
        const icon = item.querySelector('i');
        if (!icon) return;
        const phaseClass = [...icon.classList].find((cls) => cls.startsWith('sia-'));
        if (!phaseClass) return;
        item.style.display = (!statusValue && !query) || visiblePhaseClasses.has(phaseClass) ? '' : 'none';
      });

      if (statusValue || query) {
        const hint = $('ganttHint');
        if (hint) hint.textContent = `${visible} projet${visible > 1 ? 's' : ''} affiché${visible > 1 ? 's' : ''} selon les filtres`;
      }
    } finally {
      applying = false;
    }
  }

  let timer = null;
  function scheduleApply(delay = 0) {
    window.clearTimeout(timer);
    timer = window.setTimeout(applyFilters, delay);
  }

  function setup() {
    ensureStyles();
    if (!ensureControls()) return;
    populateStatuses();

    $('ganttStatusFilter')?.addEventListener('change', () => scheduleApply());
    $('ganttSearchInput')?.addEventListener('input', () => scheduleApply(80));
    $('ganttMode')?.addEventListener('change', () => scheduleApply());
    $('ganttOwnerFilter')?.addEventListener('change', () => scheduleApply());
    $('ganttProjectSelect')?.addEventListener('change', () => scheduleApply());
    $('activeUserSelect')?.addEventListener('change', () => {
      populateStatuses();
      scheduleApply(20);
    });

    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.view === 'gantt') scheduleApply(20);
      });
    });

    const wrap = $('ganttWrap');
    if (wrap) new MutationObserver(() => scheduleApply()).observe(wrap, { childList: true, subtree: true });

    window.addEventListener('storage', () => {
      populateStatuses();
      scheduleApply();
    });
    window.addEventListener('pageshow', () => {
      populateStatuses();
      scheduleApply(20);
    });

    scheduleApply(20);
  }

  setup();
})();