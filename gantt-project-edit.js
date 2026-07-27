(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const wrap = document.getElementById('ganttWrap');
  if (!wrap) return;

  const style = document.createElement('style');
  style.id = 'ganttProjectEditStyles';
  style.textContent = `
    #ganttWrap .gantt-label:not(.header){cursor:pointer;transition:background .14s ease,box-shadow .14s ease}
    #ganttWrap .gantt-label:not(.header):hover,
    #ganttWrap .gantt-label:not(.header):focus-visible{background:#fff8e6;box-shadow:inset 3px 0 0 #f2b600;outline:none}
    #ganttWrap .gantt-label:not(.header) strong{text-decoration-thickness:1px;text-underline-offset:3px}
    #ganttWrap .gantt-label:not(.header):hover strong{text-decoration:underline;text-decoration-color:#f2b600}
    #ganttWrap .gantt-bar{cursor:pointer}
  `;
  document.head.appendChild(style);

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return state && Array.isArray(state.projects) ? state : { projects: [] };
    } catch {
      return { projects: [] };
    }
  }

  function getLabelNode(target) {
    const label = target.closest('.gantt-label:not(.header)');
    if (label) return label;

    const bar = target.closest('.gantt-bar');
    if (!bar) return null;
    const timeline = bar.closest('.gantt-timeline');
    return timeline?.previousElementSibling?.classList.contains('gantt-label')
      ? timeline.previousElementSibling
      : null;
  }

  function projectFromLabel(labelNode) {
    const state = readState();
    const heading = (labelNode.querySelector('strong')?.textContent || labelNode.textContent || '').trim();
    const affairMatch = heading.match(/^([0-9]{4,5}\.[0-9]+)/);

    if (affairMatch) {
      const byAffair = state.projects.find((project) => String(project.affairNumber || '').trim() === affairMatch[1]);
      if (byAffair) return byAffair;
    }

    const name = heading.includes(' — ') ? heading.split(' — ').slice(1).join(' — ').trim() : heading;
    return state.projects.find((project) => String(project.name || '').trim() === name) || null;
  }

  function openProject(project) {
    if (!project) return;

    const selector = `[data-edit="${CSS.escape(project.id)}"]`;
    const editButton = document.querySelector(`#budgetTableBody ${selector}`)
      || document.querySelector(`#projectsTableBody ${selector}`)
      || document.querySelector(selector);

    if (editButton) {
      editButton.click();
      return;
    }

    const toast = document.getElementById('toastContainer');
    if (toast) {
      const item = document.createElement('div');
      item.className = 'toast';
      item.textContent = 'Impossible d’ouvrir ce projet pour le moment.';
      toast.appendChild(item);
      window.setTimeout(() => item.remove(), 3500);
    }
  }

  function activate(labelNode) {
    openProject(projectFromLabel(labelNode));
  }

  wrap.addEventListener('click', (event) => {
    const labelNode = getLabelNode(event.target);
    if (!labelNode) return;
    activate(labelNode);
  });

  wrap.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const labelNode = event.target.closest('.gantt-label:not(.header)');
    if (!labelNode) return;
    event.preventDefault();
    activate(labelNode);
  });

  function enhanceLabels() {
    wrap.querySelectorAll('.gantt-label:not(.header)').forEach((label) => {
      label.tabIndex = 0;
      label.setAttribute('role', 'button');
      label.title = 'Cliquer pour modifier ce projet';
    });
    wrap.querySelectorAll('.gantt-bar').forEach((bar) => {
      const base = bar.getAttribute('title') || '';
      if (!base.includes('Cliquer pour modifier')) {
        bar.setAttribute('title', `${base}${base ? ' · ' : ''}Cliquer pour modifier le projet`);
      }
    });
  }

  new MutationObserver(enhanceLabels).observe(wrap, { childList: true, subtree: true });
  enhanceLabels();
})();