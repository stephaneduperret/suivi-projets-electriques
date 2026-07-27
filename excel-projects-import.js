(() => {
  'use strict';

  const KEY = 'voe-project-manager-v1';
  const seed = window.EXCEL_PROJECTS_SEED;
  window.EXCEL_IMPORT_APPLIED = false;
  if (!seed || !Array.isArray(seed.rows) || !seed.rows.length) return;

  const slug = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const userId = (name) => `erp-user-${slug(name)}`;
  const projectId = (number) => `erp-${String(number).replace(/[^a-zA-Z0-9]+/g, '-')}`;

  function phase(start, end) {
    return start || end ? { start: start || '', end: end || '' } : null;
  }

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Array.isArray(saved.projects) && Array.isArray(saved.users)) return saved;
    } catch {}
    return { activeUserId: '', users: [], projects: [] };
  }

  const state = readState();
  if (state.excelSeedVersion === seed.version) return;

  state.users = state.users.filter((user) => user && user.id);
  seed.users.forEach((name) => {
    const id = userId(name);
    const existing = state.users.find((user) => user.id === id || String(user.name || '').toUpperCase() === name);
    if (existing) {
      existing.id = id;
      existing.name = name;
      existing.role = 'Responsable';
      existing.initials = name.slice(0, 2).toUpperCase();
    } else {
      state.users.push({ id, name, role: 'Responsable', initials: name.slice(0, 2).toUpperCase() });
    }
  });

  // Retire uniquement les trois exemples livrés avec la première version du site.
  state.projects = state.projects.filter((project) => !['p1', 'p2', 'p3'].includes(project?.id));

  const existingByNumber = new Map(state.projects.map((project) => [String(project.affairNumber || ''), project]));

  seed.rows.forEach((row) => {
    const [number, cda, name, responsable, status, erpState, studyStart, studyEnd, procedureStart, procedureEnd, realizationStart, realizationEnd, closureStart, closureEnd] = row;
    const existing = existingByNumber.get(String(number)) || null;
    const phases = {};
    const study = phase(studyStart, studyEnd);
    const procedure = phase(procedureStart, procedureEnd);
    const realization = phase(realizationStart, realizationEnd);
    const closure = phase(closureStart, closureEnd);
    if (study) phases['31'] = study;
    if (procedure) phases['33'] = procedure;
    if (realization) phases['52'] = realization;
    if (closure) phases['53'] = closure;

    const imported = {
      id: existing?.id || projectId(number),
      affairNumber: String(number),
      cda: String(cda || ''),
      voltage: existing?.voltage || '',
      commune: existing?.commune || '',
      name: String(name || number),
      description: existing?.description || '',
      ownerId: userId(responsable),
      status: String(status || 'À définir').trim() || 'À définir',
      erpState: String(erpState || ''),
      budget: existing?.budget || { planned: 0, committed: 0, actual: 0, reference: '' },
      phases
    };

    if (existing) Object.assign(existing, imported);
    else state.projects.push(imported);
  });

  if (!state.activeUserId || !state.users.some((user) => user.id === state.activeUserId)) {
    state.activeUserId = userId('DUPERRET');
  }

  state.excelSeedVersion = seed.version;
  localStorage.setItem(KEY, JSON.stringify(state));
  window.EXCEL_IMPORT_APPLIED = true;
})();
