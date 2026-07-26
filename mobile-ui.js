(() => {
  'use strict';

  const mobileStyle = document.createElement('style');
  mobileStyle.id = 'mobileResponsivePatch';
  mobileStyle.textContent = `
    .mobile-bottom-nav { display: none; }

    @media (max-width: 760px) {
      html, body { max-width: 100%; overflow-x: hidden; }

      .main {
        width: 100% !important;
        min-width: 0 !important;
        padding: 12px 10px calc(94px + env(safe-area-inset-bottom)) !important;
      }

      .topbar {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
        margin-bottom: 14px !important;
      }

      .topbar-heading,
      .topbar > div:first-child {
        display: grid !important;
        grid-template-columns: 44px minmax(0, 1fr) !important;
        align-items: center !important;
        gap: 10px !important;
        width: 100% !important;
        min-height: 0 !important;
        padding: 0 !important;
        position: static !important;
      }

      .topbar-heading > div { min-width: 0; }

      #toggleSidebar {
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: 44px !important;
        height: 44px !important;
        margin: 0 !important;
        border-radius: 13px !important;
      }

      .page-eyebrow {
        font-size: 11px !important;
        margin: 0 0 1px !important;
      }

      .topbar h1 {
        font-size: 22px !important;
        line-height: 1.1 !important;
        letter-spacing: -.02em !important;
        white-space: normal !important;
      }

      .topbar p {
        font-size: 12px !important;
        line-height: 1.35 !important;
        margin-top: 3px !important;
      }

      .top-actions {
        display: flex !important;
        grid-template-columns: none !important;
        flex-wrap: nowrap !important;
        justify-content: flex-end !important;
        align-items: center !important;
        gap: 7px !important;
        width: 100% !important;
      }

      .top-actions .round-action {
        width: 40px !important;
        height: 40px !important;
        min-width: 40px !important;
        min-height: 40px !important;
        flex: 0 0 40px !important;
        box-shadow: 0 2px 8px rgba(15, 23, 42, .06) !important;
      }

      #newProjectBtn {
        grid-column: auto !important;
        width: 40px !important;
        min-height: 40px !important;
        font-size: 22px !important;
      }

      .stats-grid.dashboard-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px !important;
        margin-bottom: 12px !important;
      }

      .premium-stat {
        min-height: 116px !important;
        padding: 13px 12px !important;
        border-radius: 16px !important;
      }

      .premium-stat span { font-size: 11px !important; }
      .premium-stat strong {
        font-size: 18px !important;
        line-height: 1.12 !important;
        margin-top: 8px !important;
        overflow-wrap: anywhere;
      }
      .premium-stat small { font-size: 9px !important; }
      .premium-stat .stat-icon {
        width: 31px !important;
        height: 31px !important;
        right: 10px !important;
        bottom: 10px !important;
        font-size: 14px !important;
      }

      .dashboard-grid {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 12px !important;
      }

      .dashboard-card {
        min-width: 0 !important;
        padding: 14px !important;
        border-radius: 18px !important;
        overflow: hidden !important;
      }

      .dashboard-card-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 9px !important;
        margin-bottom: 13px !important;
      }

      .dashboard-card-header h2,
      .recent-projects-heading h2,
      .new-project-cta h2,
      .view-heading h2 {
        font-size: 18px !important;
      }

      .dashboard-card-actions {
        width: 100% !important;
        justify-content: space-between !important;
      }

      .dashboard-select {
        max-width: calc(100% - 36px) !important;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .budget-preview-layout {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 14px !important;
      }

      .budget-preview-copy { min-width: 0 !important; }
      .dashboard-total {
        font-size: 24px !important;
        margin: 7px 0 14px !important;
        overflow-wrap: anywhere;
      }

      .budget-legend-row {
        max-width: none !important;
        grid-template-columns: 10px minmax(0, 1fr) 42px !important;
        margin: 10px 0 !important;
      }

      .budget-donut {
        width: min(48vw, 168px) !important;
        height: min(48vw, 168px) !important;
        margin: 6px auto 2px !important;
      }

      .budget-donut::after { inset: 19px !important; }
      .budget-donut-center strong { font-size: 18px !important; }

      .phase-preview {
        min-height: 0 !important;
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding-bottom: 5px !important;
        -webkit-overflow-scrolling: touch;
      }

      .phase-preview-grid {
        min-width: 700px !important;
        grid-template-columns: 160px minmax(520px, 1fr) !important;
        gap: 10px !important;
      }

      .recent-projects-section { margin: 18px 0 14px !important; }
      .recent-projects-heading {
        align-items: flex-start !important;
        gap: 8px !important;
      }

      .recent-project-card {
        grid-template-columns: 38px minmax(0, 1fr) auto !important;
        gap: 8px 10px !important;
        padding: 11px !important;
        border-radius: 15px !important;
      }

      .recent-project-icon {
        width: 38px !important;
        height: 38px !important;
      }

      .recent-project-main { min-width: 0 !important; }
      .recent-project-main strong,
      .recent-project-main small {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .recent-project-main strong { font-size: 12px !important; }
      .recent-project-main small { font-size: 10px !important; }

      .recent-project-status {
        grid-column: 2 !important;
        grid-row: 2 !important;
      }

      .recent-project-budget {
        grid-column: 2 !important;
        grid-row: 3 !important;
      }

      .progress-ring {
        grid-column: 3 !important;
        grid-row: 1 / span 2 !important;
        width: 44px !important;
        height: 44px !important;
      }

      .recent-kebab {
        grid-column: 3 !important;
        grid-row: 3 !important;
        justify-self: center !important;
      }

      .new-project-cta {
        grid-template-columns: 44px minmax(0, 1fr) !important;
        gap: 10px !important;
        padding: 13px !important;
      }

      .new-project-icon {
        width: 42px !important;
        height: 42px !important;
      }

      .cta-create-btn {
        grid-column: 1 / -1 !important;
        min-width: 0 !important;
        width: 100% !important;
        min-height: 44px !important;
      }

      .all-projects-card > summary { padding: 14px !important; }
      .all-projects-content { padding: 0 10px 10px !important; }
      .view-heading { align-items: flex-start !important; }
      .premium-panel { padding: 12px !important; }
      .gantt-card { padding: 10px !important; }

      #projectsView .table-card {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      #projectsView .table-scroll { overflow: visible !important; }
      #projectsView .project-table {
        display: block !important;
        min-width: 0 !important;
        width: 100% !important;
      }
      #projectsView .project-table thead { display: none !important; }
      #projectsView .project-table tbody {
        display: grid !important;
        gap: 10px !important;
      }
      #projectsView .project-table tr {
        display: block !important;
        border-radius: 14px !important;
        overflow: hidden !important;
      }
      #projectsView .project-table td {
        display: grid !important;
        grid-template-columns: 92px minmax(0, 1fr) !important;
        width: 100% !important;
        padding: 9px 10px !important;
      }
      #projectsView .project-table td:nth-child(9) {
        display: flex !important;
        justify-content: flex-end !important;
      }

      .modal, .modal-large {
        width: 100% !important;
        max-width: none !important;
        max-height: 94dvh !important;
        border-radius: 18px 18px 0 0 !important;
      }

      .mobile-bottom-nav {
        position: fixed;
        left: 8px;
        right: 8px;
        bottom: calc(8px + env(safe-area-inset-bottom));
        z-index: 104;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, .12);
        border-radius: 18px;
        background: rgba(6, 27, 58, .96);
        box-shadow: 0 12px 32px rgba(3, 22, 47, .28);
        backdrop-filter: blur(14px);
      }

      .mobile-bottom-nav button {
        min-width: 0;
        min-height: 50px;
        border: 0;
        border-radius: 13px;
        background: transparent;
        color: #cbd5e1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        font-size: 10px;
        font-weight: 700;
      }

      .mobile-bottom-nav button > span {
        font-size: 17px;
        line-height: 1;
      }

      .mobile-bottom-nav button.active {
        color: #f2b600;
        background: rgba(255, 255, 255, .09);
      }
    }

    @media (max-width: 420px) {
      .main {
        padding-left: 8px !important;
        padding-right: 8px !important;
      }

      .topbar p { display: none !important; }
      .topbar h1 { font-size: 20px !important; }
      .premium-stat strong { font-size: 16.5px !important; }
      .premium-stat { min-height: 108px !important; }
      .budget-donut {
        width: 150px !important;
        height: 150px !important;
      }
      .dashboard-card { padding: 12px !important; }
      .mobile-bottom-nav { left: 6px; right: 6px; bottom: calc(6px + env(safe-area-inset-bottom)); }
    }
  `;
  document.head.appendChild(mobileStyle);

  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('toggleSidebar');
  if (!sidebar || !toggle) return;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'sidebar-close';
  closeButton.setAttribute('aria-label', 'Fermer le menu');
  closeButton.title = 'Fermer le menu';
  closeButton.textContent = '×';
  sidebar.appendChild(closeButton);

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';
  document.body.appendChild(overlay);

  const bottomNav = document.createElement('nav');
  bottomNav.className = 'mobile-bottom-nav';
  bottomNav.setAttribute('aria-label', 'Navigation mobile');
  bottomNav.innerHTML = `
    <button type="button" data-mobile-view="projects"><span>▦</span><small>Projets</small></button>
    <button type="button" data-mobile-view="gantt"><span>☷</span><small>Gantt</small></button>
    <button type="button" data-mobile-view="budgets"><span>CHF</span><small>Budgets</small></button>
    <button type="button" data-mobile-view="users"><span>♧</span><small>Équipe</small></button>
  `;
  document.body.appendChild(bottomNav);

  toggle.setAttribute('aria-controls', 'sidebar');
  toggle.setAttribute('aria-expanded', 'false');

  const isMobile = () => window.matchMedia('(max-width: 1050px)').matches;

  function syncMenuState() {
    const open = sidebar.classList.contains('open') && isMobile();
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function syncBottomNav() {
    const activeView = sidebar.querySelector('.nav-item.active')?.dataset.view || 'projects';
    bottomNav.querySelectorAll('[data-mobile-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.mobileView === activeView);
    });
  }

  toggle.addEventListener('click', () => {
    window.requestAnimationFrame(syncMenuState);
  });

  closeButton.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  sidebar.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      if (isMobile()) closeMenu();
      syncBottomNav();
    });
  });

  bottomNav.querySelectorAll('[data-mobile-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = sidebar.querySelector(`.nav-item[data-view="${button.dataset.mobileView}"]`);
      target?.click();
      syncBottomNav();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) closeMenu();
  });

  let touchStartX = null;
  sidebar.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0]?.clientX ?? null;
  }, { passive: true });

  sidebar.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    if (touchStartX - endX > 60) closeMenu();
    touchStartX = null;
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!isMobile()) closeMenu();
    else syncMenuState();
    syncBottomNav();
  });

  window.addEventListener('pageshow', () => {
    syncMenuState();
    syncBottomNav();
  });

  syncMenuState();
  syncBottomNav();
})();