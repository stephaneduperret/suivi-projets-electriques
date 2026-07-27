(() => {
  'use strict';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
      document.head.appendChild(script);
    });
  }

  function addExcelImportButton() {
    const nav = document.querySelector('#sidebar .nav');
    if (!nav || document.getElementById('projectExcelImportBtn')) return;

    const wrap = document.createElement('div');
    wrap.className = 'excel-import-wrap';
    wrap.innerHTML = `
      <button type="button" id="projectExcelImportBtn" class="excel-import-button" title="Importer un nouveau fichier Excel de suivi">
        <span class="excel-import-icon">⇧</span>
        <span class="excel-import-copy">Importer Excel<small>Remplace tous les projets</small></span>
      </button>
      <input id="projectExcelImportInput" type="file" accept=".xlsx,.xlsm,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden>
    `;
    nav.insertAdjacentElement('afterend', wrap);
  }

  async function start() {
    // Conserve le tableau de bord par utilisateur de la version précédente.
    try {
      await loadScript('https://cdn.jsdelivr.net/gh/stephaneduperret/suivi-projets-electriques@1468bf2713069ef65314a1b8bea7477294d82454/dashboard-user-scope.js');
      await loadScript('dashboard-today-marker.js');
    } catch (error) {
      console.warn('Tableau de bord utilisateur :', error);
    }

    addExcelImportButton();

    try {
      if (!window.XLSX) {
        await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      }
      await loadScript('excel-replace-import.js');
    } catch (error) {
      console.error('Import Excel :', error);
      const button = document.getElementById('projectExcelImportBtn');
      if (button) {
        button.disabled = true;
        button.title = 'Le module Excel n’a pas pu être chargé';
      }
    }
  }

  start();
})();