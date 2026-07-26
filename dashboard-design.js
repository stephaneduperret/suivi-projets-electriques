(() => {
  'use strict';

  const KEY = 'voe-project-manager-v1';
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const PHASES = {
    '31': { name: 'Avant-projet', cls: 'sia-31' },
    '32': { name: 'Projet de l’ouvrage', cls: 'sia-32' },
    '33': { name: 'Procédure d’autorisation', cls: 'sia-33' },
    '41': { name: 'Appels d’offres', cls: 'sia-41' },
    '51': { name: 'Projet d’exécution', cls: 'sia-51' },
    '52': { name: 'Exécution', cls: 'sia-52' },
    '53': { name: 'Mise en service / achèvement', cls: 'sia-53' }
  };

  function readState() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return data && Array.isArray(data.projects) && Array.isArray(data.users)
        ? data
        : { projects: [], users: [], activeUserId: '' };
    } catch {
      return { projects: [], users: [], activeUserId: '' };
    }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }

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

  function statusClass(status) {
    return String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
  }

  function activeUser(state) {
    return state.users.find((user) => user.id === state.activeUserId) || state.users[0] || null;
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function renderHeader(state, view = 'projects') {
    const user = activeUser(state);
    const name = user?.name || 'Stéphane';
    setText('dashboardUserName', name);
    setText('dashboardUserInitial', (user?.initials || name.charAt(0) || 'S').slice(0, 1).toUpperCase());

    const copy = {
      projects: ['Bonjour,', `${name} 👋`, 'Vue d’ensemble de vos projets électriques.'],
      gantt: ['Planning', 'Gantt', 'Planning des phases SIA par projet ou pour l’ensemble des projets.'],
      budgets: ['Finances', 'Budgets', 'Suivi financier prévu, engagé et dépensé.'],
      users: ['Équipe', 'Utilisateurs', 'Gestion des responsables et vue multi-utilisateurs.']
    }[view] || ['', '', ''];

    setText('pageEyebrow', copy[0]);
    setText('pageTitle', copy[1]);
    setText('pageSubtitle', copy[2]);
  }

  function renderBudget(state) {
    const totals = state.projects.reduce((acc, project) => {
      acc.planned += Number(project.budget?.planned || 0);
      acc.committed += Number(project.budget?.committed || 0);
      acc.actual += Number(project.budget?.actual || 0);
      return acc;
    }, { planned: 0, committed: 0, actual: 0 });

    const available = Math.max(0, totals.planned - totals.actual);
    const committedPct = totals.planned ? Math.min(100, Math.round(totals.committed / totals.planned * 100)) : 0;
    const availablePct = totals.planned ? Math.max(0, Math.round(available / totals.planned * 100)) : 0;
    const activeProjects = state.projects.filter((project) => project.status !== 'Terminé').length;

    setText('statBudget', formatCompactMoney(totals.planned));
    setText('statBT', formatCompactMoney(totals.committed));
    setText('statMT', formatCompactMoney(available));
    setText('statProjects', String(activeProjects));
    setText('dashboardCommittedPercent', `${committedPct}% du budget`);
    setText('dashboardAvailablePercent', `${availablePct}% restant`);
    setText('dashboardActiveHint', activeProjects === 1 ? 'Projet actif' : 'En cours');

    setText('dashboardBudgetTotal', money(totals.planned));
    setText('dashboardCommitted', money(totals.committed));
    setText('dashboardAvailable', money(available));
    setText('dashboardCommittedPct', `${committedPct}%`);
    setText('dashboardAvailablePct', `${availablePct}%`);
    setText('dashboardDonutValue', formatCompactMoney(totals.planned).replace(' CHF', ''));

    const donut = $('dashboardDonut');
    if (donut) donut.style.setProperty('--committed', `${committedPct * 3.6}deg`);
  }

  function renderRecentProjects(state) {
    const wrap = $('dashboardRecentProjects');
    if (!wrap) return;

    const projects = [...state.projects].slice(-4).reverse();
    if (!projects.length) {
      wrap.innerHTML = '<div class="dashboard-empty card">Aucun projet enregistré.</div>';
      return;
    }

    wrap.innerHTML = projects.map((project) => {
      const planned = Number(project.budget?.planned || 0);
      const actual = Number(project.budget?.actual || 0);
      const pct = planned ? Math.min(100, Math.max(0, Math.round(actual / planned * 100))) : 0;
      const ring = project.status === 'Terminé' || pct >= 100 ? '#2fb35b' : '#e0a500';
      const icon = project.voltage === 'MT' ? 'MT' : 'BT';
      return `
        <article class="recent-project-card">
          <div class="recent-project-icon ${project.voltage === 'MT' ? 'mt' : 'bt'}">${icon}</div>
          <div class="recent-project-main">
            <strong>${esc(project.name)}</strong>
            <small>${esc(project.affairNumber ? `${project.affairNumber} · ${project.commune}` : project.commune)}</small>
          </div>
          <div class="recent-project-status"><span class="status ${statusClass(project.status)}">${esc(project.status)}</span></div>
          <div class="recent-project-budget"><span>Budget</span><strong>${money(planned)}</strong></div>
          <button class="progress-ring" type="button" data-dashboard-edit="${esc(project.id)}" style="--pct:${pct};--ring:${ring}" title="Modifier le projet"><span>${pct}%</span></button>
          <button class="recent-kebab" type="button" data-dashboard-gantt="${esc(project.id)}" title="Voir le Gantt">⋮</button>
        </article>`;
    }).join('');
  }

  function collectPhases(state) {
    const rows = [];
    state.projects.forEach((project) => {
      Object.entries(project.phases || {}).forEach(([code, data]) => {
        const meta = PHASES[code];
        if (!meta) return;
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

  function renderPhasePreview(state) {
    const wrap = $('dashboardPhasePreview');
    if (!wrap) return;

    const all = collectPhases(state);
    if (!all.length) {
      wrap.innerHTML = '<div class="dashboard-empty">Ajoutez des dates SIA pour afficher les prochaines phases.</div>';
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = all.filter((phase) => phase.end >= now);
    const rows = (upcoming.length ? upcoming : all.slice().reverse()).slice(0, 4);
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
      <div class="phase-preview-label"><i class="${row.cls}"></i><span>SIA ${row.code} — ${esc(row.projectName)}</span></div>
    `).join('');

    const bars = rows.map((row) => {
      const left = Math.max(0, Math.min(100, (row.start - min) / (max - min) * 100));
      const right = Math.max(left, Math.min(100, (row.end - min) / (max - min) * 100));
      const width = Math.max(2, right - left);
      return `<div class="phase-preview-row"><div class="phase-preview-bar ${row.cls}" style="left:${left}%;width:${width}%" title="SIA ${row.code} — ${esc(row.name)}"></div></div>`;
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

  function currentView() {
    const active = document.querySelector('.view.active');
    return active?.id?.replace('View', '') || 'projects';
  }

  function renderDashboard() {
    const state = readState();
    renderHeader(state, currentView());
    renderBudget(state);
    renderRecentProjects(state);
    renderPhasePreview(state);
  }

  let refreshTimer = null;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(renderDashboard, 0);
  }

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => setTimeout(() => renderHeader(readState(), button.dataset.view), 0));
  });

  $('dashboardNewProjectBtn')?.addEventListener('click', () => $('newProjectBtn')?.click());
  $('openGanttDashboard')?.addEventListener('click', () => document.querySelector('.nav-item[data-view="gantt"]')?.click());
  $('showAllProjectsBtn')?.addEventListener('click', () => {
    const panel = $('allProjectsPanel');
    if (!panel) return;
    panel.open = true;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('dashboardRecentProjects')?.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-dashboard-edit]');
    if (edit) {
      document.querySelector(`[data-edit="${CSS.escape(edit.dataset.dashboardEdit)}"]`)?.click();
      return;
    }
    const gantt = event.target.closest('[data-dashboard-gantt]');
    if (gantt) {
      const source = document.querySelector(`[data-gantt="${CSS.escape(gantt.dataset.dashboardGantt)}"]`);
      source?.click();
    }
  });

  const tableBody = $('projectsTableBody');
  if (tableBody) new MutationObserver(scheduleRefresh).observe(tableBody, { childList: true });
  window.addEventListener('storage', scheduleRefresh);
  window.addEventListener('pageshow', scheduleRefresh);

  renderDashboard();
})();
