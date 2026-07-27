(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const $ = (id) => document.getElementById(id);
  let showAllUsers = false;
  let refreshTimer = null;

  const PHASES = {
    '31': { name: 'Etude', cls: 'sia-31' },
    '32': { name: 'Projet de l’ouvrage', cls: 'sia-32' },
    '33': { name: 'Procédure', cls: 'sia-33' },
    '41': { name: 'Appels d’offres', cls: 'sia-41' },
    '51': { name: 'Projet d’exécution', cls: 'sia-51' },
    '52': { name: 'Réalisation', cls: 'sia-52' },
    '53': { name: 'Facture / Clôture', cls: 'sia-53' }
  };

  const money = (value) => new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  function formatCompactMoney(value) {
    const number = Number(value || 0);
    if (Math.abs(number) >= 1000000) {
      return `${new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 2 }).format(number / 1000000)} M CHF`;
    }
    if (Math.abs(number) >= 1000) {
      return `${new Intl.NumberFormat('fr-CH', { maximumFractionDigits: 0 }).format(number / 1000)} k CHF`;
    }
    return money(number);
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function statusClass(status) {
    return String(status || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '-');
  }

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

  function getActiveUser(state) {
    return state.users.find((user) => user.id === state.activeUserId) || state.users[0] || null;
  }

  function scopedProjects(state) {
    if (showAllUsers) return state.projects;
    const user = getActiveUser(state);
    if (!user) return [];
    return state.projects.filter((project) => project.ownerId === user.id);
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function ensureScopeButton() {
    let button = $('dashboardScopeToggle');
    if (button) return button;

    const placeholder = document.querySelector('.budget-preview-card .dashboard-select');
    if (!placeholder) return null;

    button = document.createElement('button');
    button.type = 'button';
    button.id = 'dashboardScopeToggle';
    button.className = 'dashboard-scope-toggle';
    button.addEventListener('click', () => {
      showAllUsers = !showAllUsers;
      renderScopedDashboard();
    });
    placeholder.replaceWith(button);

    if (!$('dashboardScopeStyles')) {
      const style = document.createElement('style');
      style.id = 'dashboardScopeStyles';
      style.textContent = `
        .dashboard-scope-toggle{
          min-height:38px;
          padding:8px 13px;
          border:1px solid var(--border,#e8e8e4);
          border-radius:12px;
          background:#fff;
          color:var(--text,#10203a);
          font:inherit;
          font-size:12px;
          font-weight:750;
          cursor:pointer;
          box-shadow:0 1px 2px rgba(15,23,42,.03);
          transition:.15s ease;
        }
        .dashboard-scope-toggle:hover{border-color:#f2b600;background:#fffaf0}
        .dashboard-scope-toggle[data-global="true"]{background:#061b3a;color:#fff;border-color:#061b3a}
        @media(max-width:760px){
          .dashboard-scope-toggle{width:100%;min-height:42px;text-align:center}
          .budget-preview-card .dashboard-card-actions{width:100%;display:grid;grid-template-columns:1fr auto;gap:8px}
        }
      `;
      document.head.appendChild(style);
    }

    return button;
  }

  function renderScopeLabels(state, projects) {
    const user = getActiveUser(state);
    const userName = user?.name || 'Utilisateur';
    const scopeName = showAllUsers ? 'tous les utilisateurs' : userName;
    const button = ensureScopeButton();

    if (button) {
      button.dataset.global = String(showAllUsers);
      button.textContent = showAllUsers ? `Afficher ${userName}` : 'Voir tous les utilisateurs';
      button.title = showAllUsers
        ? `Revenir aux projets de ${userName}`
        : 'Afficher les projets de tous les utilisateurs';
    }

    const budgetSubtitle = document.querySelector('.budget-preview-card .dashboard-card-header p');
    if (budgetSubtitle) budgetSubtitle.textContent = showAllUsers
      ? 'Synthèse de tous les projets'
      : `Synthèse des projets de ${userName}`;

    const phasesSubtitle = document.querySelector('.phases-preview-card .dashboard-card-header p');
    if (phasesSubtitle) phasesSubtitle.textContent = showAllUsers
      ? 'Prochaines phases de tous les utilisateurs'
      : `Prochaines phases de ${userName}`;

    const recentSubtitle = document.querySelector('.recent-projects-heading p');
    if (recentSubtitle) recentSubtitle.textContent = showAllUsers
      ? 'Derniers projets de tous les utilisateurs'
      : `Derniers projets de ${userName}`;

    if ($('projectsView')?.classList.contains('active')) {
      setText('pageSubtitle', showAllUsers
        ? 'Vue d’ensemble de tous les projets électriques.'
        : `Vue d’ensemble des ${projects.length} projet${projects.length > 1 ? 's' : ''} de ${userName}.`);
    }

    setText('dashboardActiveHint', showAllUsers ? 'Tous utilisateurs' : userName);
    return scopeName;
  }

  function renderBudget(projects) {
    const totals = projects.reduce((acc, project) => {
      acc.planned += Number(project.budget?.planned || 0);
      acc.committed += Number(project.budget?.committed || 0);
      acc.actual += Number(project.budget?.actual || 0);
      return acc;
    }, { planned: 0, committed: 0, actual: 0 });

    const available = Math.max(0, totals.planned - totals.actual);
    const committedPct = totals.planned ? Math.min(100, Math.round(totals.committed / totals.planned * 100)) : 0;
    const availablePct = totals.planned ? Math.max(0, Math.round(available / totals.planned * 100)) : 0;

    setText('statBudget', formatCompactMoney(totals.planned));
    setText('statBT', formatCompactMoney(totals.committed));
    setText('statMT', formatCompactMoney(available));
    setText('statProjects', String(projects.length));
    setText('dashboardCommittedPercent', `${committedPct}% du budget`);
    setText('dashboardAvailablePercent', `${availablePct}% restant`);

    setText('dashboardBudgetTotal', money(totals.planned));
    setText('dashboardCommitted', money(totals.committed));
    setText('dashboardAvailable', money(available));
    setText('dashboardCommittedPct', `${committedPct}%`);
    setText('dashboardAvailablePct', `${availablePct}%`);
    setText('dashboardDonutValue', formatCompactMoney(totals.planned).replace(' CHF', ''));

    const donut = $('dashboardDonut');
    if (donut) donut.style.setProperty('--committed', `${committedPct * 3.6}deg`);
  }

  function renderRecentProjects(projects) {
    const wrap = $('dashboardRecentProjects');
    if (!wrap) return;

    const recent = [...projects].slice(-4).reverse();
    if (!recent.length) {
      wrap.innerHTML = '<div class="dashboard-empty card">Aucun projet pour cet utilisateur.</div>';
      return;
    }

    wrap.innerHTML = recent.map((project) => {
      const planned = Number(project.budget?.planned || 0);
      const actual = Number(project.budget?.actual || 0);
      const pct = planned ? Math.min(100, Math.max(0, Math.round(actual / planned * 100))) : 0;
      const ring = project.status === 'Terminé' || project.status === 'Clôture' || pct >= 100 ? '#2fb35b' : '#e0a500';
      const voltage = project.voltage === 'MT' ? 'MT' : 'BT';
      const place = [project.affairNumber, project.commune].filter(Boolean).join(' · ');

      return `
        <article class="recent-project-card">
          <div class="recent-project-icon ${voltage === 'MT' ? 'mt' : 'bt'}">${voltage}</div>
          <div class="recent-project-main">
            <strong>${esc(project.name)}</strong>
            <small>${esc(place || project.cda || '')}</small>
          </div>
          <div class="recent-project-status"><span class="status ${statusClass(project.status)}">${esc(project.status || 'À définir')}</span></div>
          <div class="recent-project-budget"><span>Budget</span><strong>${money(planned)}</strong></div>
          <button class="progress-ring" type="button" data-dashboard-edit="${esc(project.id)}" style="--pct:${pct};--ring:${ring}" title="Modifier le projet"><span>${pct}%</span></button>
          <button class="recent-kebab" type="button" data-dashboard-gantt="${esc(project.id)}" title="Voir le Gantt">⋮</button>
        </article>`;
    }).join('');
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
          projectName: project.name
        });
      });
    });
    rows.sort((a, b) => a.start - b.start);
    return rows;
  }

  function renderPhasePreview(projects) {
    const wrap = $('dashboardPhasePreview');
    if (!wrap) return;

    const all = collectPhases(projects);
    if (!all.length) {
      wrap.innerHTML = '<div class="dashboard-empty">Aucune phase planifiée pour cette sélection.</div>';
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = all.filter((phase) => phase.end >= now);
    const rows = (upcoming.length ? upcoming : [...all].reverse()).slice(0, 4);
    rows.sort((a, b) => a.start - b.start);

    let min = new Date(Math.min(...rows.map((row) => row.start.getTime())));
    let max = new Date(Math.max(...rows.map((row) => row.end.getTime())));
    if (max <= min) max = new Date(min.getTime() + 13 * 86400000);
    const spanDays = Math.max(13, Math.ceil((max - min) / 86400000));
    max = new Date(min.getTime() + spanDays * 86400000);

    const dayLabels = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(min.getTime() + (spanDays * index / 13) * 86400000);
      return `<span>${date.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' })}</span>`;
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

    wrap.innerHTML = `
      <div class="phase-preview-grid">
        <div class="phase-preview-labels">
          <div class="phase-month">${min.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })}</div>
          ${labels}
        </div>
        <div class="phase-preview-chart">
          <div class="phase-preview-days">${dayLabels}</div>
          <div class="phase-preview-rows">${bars}</div>
        </div>
      </div>`;
  }

  function renderScopedDashboard() {
    const state = readState();
    const projects = scopedProjects(state);
    renderScopeLabels(state, projects);
    renderBudget(projects);
    renderRecentProjects(projects);
    renderPhasePreview(projects);
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(renderScopedDashboard, 0);
  }

  $('activeUserSelect')?.addEventListener('change', () => {
    showAllUsers = false;
    scheduleRefresh();
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.view === 'projects') scheduleRefresh();
    });
  });

  const tableBody = $('projectsTableBody');
  if (tableBody) new MutationObserver(scheduleRefresh).observe(tableBody, { childList: true });

  window.addEventListener('storage', scheduleRefresh);
  window.addEventListener('pageshow', scheduleRefresh);

  renderScopedDashboard();
})();