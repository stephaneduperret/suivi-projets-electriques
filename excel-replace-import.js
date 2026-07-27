(() => {
  'use strict';

  const STORAGE_KEY = 'voe-project-manager-v1';
  const input = document.getElementById('projectExcelImportInput');
  const button = document.getElementById('projectExcelImportBtn');
  if (!input || !button) return;

  const style = document.createElement('style');
  style.textContent = `
    .excel-import-wrap{padding:8px 0 14px}
    .excel-import-button{width:100%;min-height:46px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.055);color:#eef3fa;display:flex;align-items:center;gap:11px;padding:11px 14px;font-weight:750;cursor:pointer;transition:.16s ease}
    .excel-import-button:hover{background:rgba(255,255,255,.09);border-color:rgba(242,182,0,.45);color:#f2b600}
    .excel-import-button:disabled{opacity:.55;cursor:wait}
    .excel-import-icon{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:rgba(242,182,0,.14);color:#f2b600;font-size:16px;flex:0 0 auto}
    .excel-import-copy{display:grid;text-align:left;line-height:1.15}
    .excel-import-copy small{color:#9fb0c5;font-size:9px;font-weight:500;margin-top:3px}
    @media(max-width:1050px){.excel-import-wrap{padding-bottom:12px}}
  `;
  document.head.appendChild(style);

  const normalize = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const slug = (value) => normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'inconnu';

  const userId = (name) => `erp-user-${slug(name)}`;
  const projectId = (number, suffix = '') => `erp-${String(number).replace(/[^a-zA-Z0-9]+/g, '-')}${suffix}`;

  function toast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      window.alert(message);
      return;
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    container.appendChild(item);
    window.setTimeout(() => item.remove(), 4500);
  }

  function dateToIso(value) {
    if (value === null || value === undefined || value === '') return '';

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, '0');
      const day = String(value.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof value === 'number' && window.XLSX?.SSF?.parse_date_code) {
      const parsed = window.XLSX.SSF.parse_date_code(value);
      if (parsed?.y && parsed?.m && parsed?.d) {
        return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }

    const text = String(value).trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const swiss = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if (swiss) return `${swiss[3]}-${swiss[2].padStart(2, '0')}-${swiss[1].padStart(2, '0')}`;

    return '';
  }

  function findHeaderRow(rows) {
    for (let index = 0; index < Math.min(rows.length, 40); index += 1) {
      const headers = (rows[index] || []).map(normalize);
      const hasNumber = headers.some((h) => h === 'numero +' || h.startsWith('numero'));
      const hasLabel = headers.some((h) => h.startsWith('libelle'));
      const hasOwner = headers.some((h) => h === 'responsable');
      if (hasNumber && hasLabel && hasOwner) return index;
    }
    return -1;
  }

  function columnMap(headerRow) {
    const headers = headerRow.map(normalize);
    const exact = (name) => headers.findIndex((h) => h === name);
    const includesAll = (...terms) => headers.findIndex((h) => terms.every((term) => h.includes(term)));

    return {
      number: headers.findIndex((h) => h === 'numero +' || h.startsWith('numero')),
      cda: exact('cda'),
      label: headers.findIndex((h) => h.startsWith('libelle')),
      erpState: includesAll('code', 'etat'),
      owner: exact('responsable'),
      status: headers.findIndex((h) => h === 'status' || h.startsWith('status')),
      studyStart: includesAll('etude', 'debut'),
      studyEnd: includesAll('etude', 'fin'),
      procedureStart: includesAll('procedure', 'debut'),
      procedureEnd: includesAll('procedure', 'fin'),
      realizationStart: includesAll('realisation', 'debut'),
      realizationEnd: includesAll('realisation', 'fin'),
      closureStart: headers.findIndex((h) => (h.includes('facture') || h.includes('cloture')) && h.includes('debut')),
      closureEnd: headers.findIndex((h) => (h.includes('facture') || h.includes('cloture')) && h.includes('fin'))
    };
  }

  function cell(row, index) {
    return index >= 0 ? row[index] : '';
  }

  function makePhase(start, end) {
    const startIso = dateToIso(start);
    const endIso = dateToIso(end);
    if (!startIso && !endIso) return null;
    return { start: startIso || endIso, end: endIso || startIso };
  }

  function parseWorkbook(workbook) {
    const preferred = workbook.SheetNames.find((name) => normalize(name) === 'suivi_projet');
    const candidates = preferred
      ? [preferred, ...workbook.SheetNames.filter((name) => name !== preferred)]
      : workbook.SheetNames;

    let rows = null;
    let sheetName = '';
    let headerIndex = -1;

    for (const name of candidates) {
      const sheet = workbook.Sheets[name];
      const data = window.XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: '',
        blankrows: false
      });
      const index = findHeaderRow(data);
      if (index >= 0) {
        rows = data;
        sheetName = name;
        headerIndex = index;
        break;
      }
    }

    if (!rows || headerIndex < 0) {
      throw new Error('Aucune feuille de suivi reconnue. Le fichier doit contenir les colonnes « Numéro + », « Libellé » et « Responsable ».');
    }

    const map = columnMap(rows[headerIndex]);
    if (map.number < 0 || map.label < 0 || map.owner < 0) {
      throw new Error('Le tableau de suivi ne contient pas toutes les colonnes obligatoires.');
    }

    const projects = [];
    const usersById = new Map();
    const duplicateCounts = new Map();

    for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const number = String(cell(row, map.number) ?? '').trim();
      const name = String(cell(row, map.label) ?? '').trim();
      if (!number || !number.includes('.') || !name) continue;

      const ownerName = String(cell(row, map.owner) ?? '').trim().toUpperCase();
      const owner = ownerName ? userId(ownerName) : '';
      if (ownerName && !usersById.has(owner)) {
        usersById.set(owner, {
          id: owner,
          name: ownerName,
          role: 'Responsable',
          initials: ownerName.slice(0, 3).toUpperCase()
        });
      }

      const phases = {};
      const study = makePhase(cell(row, map.studyStart), cell(row, map.studyEnd));
      const procedure = makePhase(cell(row, map.procedureStart), cell(row, map.procedureEnd));
      const realization = makePhase(cell(row, map.realizationStart), cell(row, map.realizationEnd));
      const closure = makePhase(cell(row, map.closureStart), cell(row, map.closureEnd));
      if (study) phases['31'] = study;
      if (procedure) phases['33'] = procedure;
      if (realization) phases['52'] = realization;
      if (closure) phases['53'] = closure;

      const duplicateNumber = duplicateCounts.get(number) || 0;
      duplicateCounts.set(number, duplicateNumber + 1);
      const suffix = duplicateNumber ? `-${duplicateNumber + 1}` : '';

      const rawStatus = String(cell(row, map.status) ?? '').trim();
      projects.push({
        id: projectId(number, suffix),
        affairNumber: number,
        cda: String(cell(row, map.cda) ?? '').trim(),
        voltage: '',
        commune: '',
        name,
        description: '',
        ownerId: owner,
        status: rawStatus || 'À définir',
        erpState: String(cell(row, map.erpState) ?? '').trim(),
        budget: { planned: 0, committed: 0, actual: 0, reference: '' },
        phases
      });
    }

    if (!projects.length) {
      throw new Error('Aucun projet valide n’a été trouvé dans le tableau.');
    }

    const users = [...usersById.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr-CH'));
    return { projects, users, sheetName };
  }

  async function importExcel(file) {
    if (!window.XLSX) throw new Error('Le module de lecture Excel n’a pas pu être chargé. Rechargez la page et réessayez.');

    const previous = (() => {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
    })();
    const previousActiveName = previous.users?.find((user) => user.id === previous.activeUserId)?.name || '';

    const data = await file.arrayBuffer();
    const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
    const parsed = parseWorkbook(workbook);

    const previousActiveId = parsed.users.find((user) => normalize(user.name) === normalize(previousActiveName))?.id;
    const duperret = parsed.users.find((user) => normalize(user.name) === 'duperret')?.id;
    const activeUserId = previousActiveId || duperret || parsed.users[0]?.id || '';

    const replacement = {
      activeUserId,
      users: parsed.users,
      projects: parsed.projects,
      excelImport: {
        fileName: file.name,
        sheetName: parsed.sheetName,
        importedAt: new Date().toISOString(),
        projectCount: parsed.projects.length
      }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(replacement));
    return replacement;
  }

  button.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
      toast('Sélectionnez un fichier Excel .xlsx, .xlsm ou .xls.');
      return;
    }

    const confirmed = window.confirm(
      `Importer « ${file.name} » ?\n\nTous les projets et utilisateurs actuellement enregistrés seront effacés et remplacés par le contenu du fichier Excel.`
    );
    if (!confirmed) return;

    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<span class="excel-import-icon">⌛</span><span class="excel-import-copy">Import en cours…<small>Lecture du fichier Excel</small></span>';

    try {
      const result = await importExcel(file);
      button.innerHTML = `<span class="excel-import-icon">✓</span><span class="excel-import-copy">${result.projects.length} projets importés<small>Rechargement du tableau de bord…</small></span>`;
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.innerHTML = original;
      toast(error?.message || 'Impossible d’importer ce fichier Excel.');
    }
  });
})();