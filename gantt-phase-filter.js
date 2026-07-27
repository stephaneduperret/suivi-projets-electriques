(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let selectedPhases = null; // null = toutes les phases
  let timer = null;

  function phaseClassFromNode(node) {
    if (!node) return '';
    const icon = node.matches?.('i') ? node : node.querySelector?.('i');
    if (!icon) return '';
    return [...icon.classList].find((cls) => cls.startsWith('sia-')) || '';
  }

  function ensureStyles() {
    if ($('ganttPhaseFilterStyles')) return;
    const style = document.createElement('style');
    style.id = 'ganttPhaseFilterStyles';
    style.textContent = `
      #ganttView .legend span[data-phase-toggle]{
        display:inline-flex;
        align-items:center;
        gap:6px;
        min-height:30px;
        padding:5px 9px;
        border:1px solid #dfe5ec;
        border-radius:999px;
        background:#fff;
        cursor:pointer;
        user-select:none;
        transition:opacity .15s ease,border-color .15s ease,box-shadow .15s ease,background .15s ease;
      }
      #ganttView .legend span[data-phase-toggle]:hover{
        border-color:#aeb9c7;
        box-shadow:0 2px 8px rgba(15,23,42,.07);
      }
      #ganttView .legend span[data-phase-toggle][aria-pressed="true"]{
        font-weight:750;
        border-color:#b9c5d3;
        background:#f8fafc;
      }
      #ganttView .legend span[data-phase-toggle][aria-pressed="true"]::after{
        content:'✓';
        font-size:10px;
        color:#64748b;
        margin-left:1px;
      }
      #ganttView .legend span[data-phase-toggle][aria-pressed="false"]{
        opacity:.32;
        filter:saturate(.35);
      }
      #ganttView .legend span[data-phase-toggle]:focus-visible{
        outline:2px solid #f2b600;
        outline-offset:2px;
      }
      #ganttView .legend{
        gap:6px;
        flex-wrap:wrap;
      }
      @media(max-width:760px){
        #ganttView .legend span[data-phase-toggle]{min-height:34px;padding:6px 10px}
      }
    `;
    document.head.appendChild(style);
  }

  function getLegendItems() {
    return [...document.querySelectorAll('#ganttView .legend span')]
      .map((item) => ({ item, phaseClass: phaseClassFromNode(item) }))
      .filter((entry) => entry.phaseClass);
  }

  function restoreOwnHiddenNodes() {
    document.querySelectorAll('#ganttWrap [data-phase-filter-hidden="true"]').forEach((node) => {
      node.style.display = '';
      delete node.dataset.phaseFilterHidden;
    });
  }

  function decorateLegend() {
    const items = getLegendItems();
    items.forEach(({ item, phaseClass }) => {
      item.dataset.phaseToggle = phaseClass;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('title', 'Cliquer pour afficher cette phase. Plusieurs phases peuvent être sélectionnées.');
      const active = selectedPhases === null || selectedPhases.has(phaseClass);
      item.setAttribute('aria-pressed', String(active));
    });
    return items;
  }

  function updateCount() {
    const count = $('ganttFilterCount');
    if (!count || $('ganttMode')?.value === 'selected') return;

    const labels = [...document.querySelectorAll('#ganttWrap .gantt-grid > .gantt-label:not(.header)')];
    if (!labels.length) return;

    const visible = labels.filter((label) => label.style.display !== 'none').length;
    const statusActive = Boolean($('ganttStatusFilter')?.value);
    const queryActive = Boolean(($('ganttSearchInput')?.value || '').trim());
    const phaseActive = selectedPhases !== null;

    if (statusActive || queryActive || phaseActive) {
      count.textContent = `${visible} / ${labels.length} projet${labels.length > 1 ? 's' : ''}`;
    }
  }

  function applyPhaseFilter() {
    ensureStyles();
    restoreOwnHiddenNodes();

    const legendItems = decorateLegend();
    if (!legendItems.length) return;

    const selected = selectedPhases;
    const grid = document.querySelector('#ganttWrap .gantt-grid');
    if (!grid) return;

    const labels = [...grid.querySelectorAll(':scope > .gantt-label:not(.header)')];

    labels.forEach((labelNode) => {
      const timeline = labelNode.nextElementSibling;
      if (!timeline?.classList.contains('gantt-timeline')) return;

      // Respecte d’abord les filtres Etat / utilisateur / recherche déjà appliqués.
      if (labelNode.style.display === 'none' || timeline.style.display === 'none') return;

      const bars = [...timeline.querySelectorAll('.gantt-bar')];
      if (!bars.length) return;

      let visibleBars = 0;
      bars.forEach((bar) => {
        const phaseClass = [...bar.classList].find((cls) => cls.startsWith('sia-')) || '';
        const show = selected === null || !phaseClass || selected.has(phaseClass);
        if (show) {
          visibleBars += 1;
        } else {
          bar.style.display = 'none';
          bar.dataset.phaseFilterHidden = 'true';
        }
      });

      if (selected !== null && visibleBars === 0) {
        labelNode.style.display = 'none';
        timeline.style.display = 'none';
        labelNode.dataset.phaseFilterHidden = 'true';
        timeline.dataset.phaseFilterHidden = 'true';
      }
    });

    updateCount();
  }

  function scheduleApply(delay = 30) {
    window.clearTimeout(timer);
    timer = window.setTimeout(applyPhaseFilter, delay);
  }

  function togglePhase(phaseClass) {
    const available = new Set(getLegendItems().map((entry) => entry.phaseClass));
    if (!available.has(phaseClass)) return;

    if (selectedPhases === null) {
      // Premier clic : isole immédiatement la phase choisie.
      selectedPhases = new Set([phaseClass]);
    } else if (selectedPhases.has(phaseClass)) {
      if (selectedPhases.size === 1) {
        // Recliquer sur la seule phase active réaffiche tout.
        selectedPhases = null;
      } else {
        selectedPhases.delete(phaseClass);
      }
    } else {
      selectedPhases.add(phaseClass);
    }

    applyPhaseFilter();
  }

  document.addEventListener('click', (event) => {
    const item = event.target.closest('#ganttView .legend span[data-phase-toggle]');
    if (!item) return;
    event.preventDefault();
    togglePhase(item.dataset.phaseToggle || phaseClassFromNode(item));
  });

  document.addEventListener('keydown', (event) => {
    const item = event.target.closest?.('#ganttView .legend span[data-phase-toggle]');
    if (!item || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    togglePhase(item.dataset.phaseToggle || phaseClassFromNode(item));
  });

  ['ganttStatusFilter', 'ganttOwnerFilter', 'ganttMode', 'ganttProjectSelect'].forEach((id) => {
    $(id)?.addEventListener('change', () => scheduleApply(60));
  });
  $('ganttSearchInput')?.addEventListener('input', () => scheduleApply(130));

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.view === 'gantt') scheduleApply(80);
    });
  });

  const wrap = $('ganttWrap');
  if (wrap) {
    new MutationObserver(() => scheduleApply(60)).observe(wrap, { childList: true, subtree: true });
  }

  const legend = document.querySelector('#ganttView .legend');
  if (legend) {
    new MutationObserver(() => scheduleApply(30)).observe(legend, { childList: true, subtree: true });
  }

  window.addEventListener('pageshow', () => scheduleApply(80));
  scheduleApply(100);
})();