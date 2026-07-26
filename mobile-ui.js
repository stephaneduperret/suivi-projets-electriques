(() => {
  'use strict';

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

  toggle.addEventListener('click', () => {
    window.requestAnimationFrame(syncMenuState);
  });

  closeButton.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);

  sidebar.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      if (isMobile()) closeMenu();
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
  });

  window.addEventListener('pageshow', syncMenuState);
  syncMenuState();
})();
