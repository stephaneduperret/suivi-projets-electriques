(() => {
  'use strict';

  const KEY = 'voe-project-manager-v1';
  const year = new Date().getFullYear();
  const phases = [
    { code:'31', name:'Avant-projet', cls:'sia-31' },
    { code:'32', name:'Projet de l’ouvrage', cls:'sia-32' },
    { code:'33', name:'Procédure d’autorisation', cls:'sia-33' },
    { code:'41', name:'Appels d’offres', cls:'sia-41' },
    { code:'51', name:'Projet d’exécution', cls:'sia-51' },
    { code:'52', name:'Exécution', cls:'sia-52' },
    { code:'53', name:'Mise en service / achèvement', cls:'sia-53' }
  ];

  const defaults = {
    activeUserId:'u1',
    users:[
      {id:'u1',name:'Stéphane',role:'Responsable de projets',initials:'SD'},
      {id:'u2',name:'Collègue 1',role:'Chef de projet',initials:'C1'}
    ],
    projects:[
      {id:'p1',voltage:'BT',commune:'Ballaigues',name:'Rte Signal – Champ aux Oyes',description:'Assainissement',ownerId:'u1',status:'En cours',budget:{planned:80000,committed:35000,actual:18000,reference:'CAPEX-2026-001'},phases:{'31':{start:`${year}-01-15`,end:`${year}-02-15`},'32':{start:`${year}-02-16`,end:`${year}-03-20`},'52':{start:`${year}-07-01`,end:`${year}-09-15`}}},
      {id:'p2',voltage:'BT',commune:'Orbe',name:'Rte du Signal 24',description:'Nouveau raccordement et reprises des parcelles voisines',ownerId:'u1',status:'En cours',budget:{planned:120000,committed:68000,actual:42000,reference:'CAPEX-2026-002'},phases:{'31':{start:`${year}-02-01`,end:`${year}-02-28`},'32':{start:`${year}-03-01`,end:`${year}-04-15`},'52':{start:`${year}-08-01`,end:`${year}-10-15`}}},
      {id:'p3',voltage:'MT',commune:'Orbe',name:'PPNV / EPO',description:'Agrandissement de la prison',ownerId:'u1',status:'En cours',budget:{planned:850000,committed:420000,actual:210000,reference:'CAPEX-2026-004'},phases:{'31':{start:`${year}-01-05`,end:`${year}-02-28`},'32':{start:`${year}-03-01`,end:`${year}-05-15`},'33':{start:`${year}-03-15`,end:`${year}-06-30`},'52':{start:`${year}-10-16`,end:`${year+1}-04-30`}}}
    ]
  };

  let state = load();
  let selectedProjectId = state.projects[0]?.id || '';
  let ganttOffsetMonths = 0;

  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  const money = n => new Intl.NumberFormat('fr-CH',{style:'currency',currency:'CHF',maximumFractionDigits:0}).format(Number(n||0));
  const user = id => state.users.find(u=>u.id===id);
  const project = id => state.projects.find(p=>p.id===id);
  const save = msg => { localStorage.setItem(KEY,JSON.stringify(state)); if(msg) toast(msg); };

  function load(){
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      return saved && Array.isArray(saved.projects) && Array.isArray(saved.users) ? saved : structuredClone(defaults);
    } catch {
      return structuredClone(defaults);
    }
  }

  function toast(msg){
    const n=document.createElement('div');
    n.className='toast';
    n.textContent=msg;
    $('toastContainer').appendChild(n);
    setTimeout(()=>n.remove(),2500);
  }

  function parseDate(value){
    if(!value) return null;
    const [y,m,d]=value.split('-').map(Number);
    return y&&m&&d ? new Date(y,m-1,d,12,0,0) : null;
  }

  function formatDate(value){
    const d=parseDate(value);
    return d ? d.toLocaleDateString('fr-CH') : '—';
  }

  function datedPhases(p){
    return phases.flatMap(meta=>{
      const data=p.phases?.[meta.code];
      if(!data || (!data.start && !data.end)) return [];
      return [{...meta,start:data.start||data.end,end:data.end||data.start}];
    });
  }

  function phaseChips(p){
    const list=datedPhases(p);
    if(!list.length) return '';
    return `<div class="sia-chips">${list.map(ph=>`<span class="sia-chip ${ph.cls}" title="SIA ${ph.code} — ${esc(ph.name)} : ${formatDate(ph.start)} → ${formatDate(ph.end)}">SIA ${ph.code}</span>`).join('')}</div>`;
  }

  function renderSiaForm(){
    $('siaPhasesForm').innerHTML = phases.map(({code,name,cls})=>`
      <div class="sia-row ${cls}">
        <div class="phase-name"><span class="sia-dot ${cls}"></span>SIA ${code} — ${esc(name)}</div>
        <label>Début<input type="date" data-start="${code}"></label>
        <label>Fin<input type="date" data-end="${code}"></label>
      </div>`).join('');
  }

  function renderUserSelects(){
    const opts=state.users.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join('');
    $('activeUserSelect').innerHTML=opts;
    $('activeUserSelect').value=state.activeUserId || state.users[0]?.id || '';
    $('projectOwner').innerHTML=opts;
    ['filterOwner','ganttOwnerFilter'].forEach(id=>{
      const old=$(id).value;
      $(id).innerHTML='<option value="">Tous les utilisateurs</option>'+opts;
      if([...$(id).options].some(o=>o.value===old)) $(id).value=old;
    });
    $('ganttProjectSelect').innerHTML=state.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    if(selectedProjectId && project(selectedProjectId)) $('ganttProjectSelect').value=selectedProjectId;
    else selectedProjectId=state.projects[0]?.id || '';
  }

  function filteredProjects(){
    const q=$('searchInput').value.toLowerCase().trim(), v=$('filterVoltage').value, s=$('filterStatus').value, o=$('filterOwner').value;
    return state.projects.filter(p=>{
      const phaseText=datedPhases(p).map(ph=>`SIA ${ph.code} ${ph.name}`).join(' ');
      const txt=[p.voltage,p.commune,p.name,p.description,p.status,user(p.ownerId)?.name,p.budget?.reference,phaseText].join(' ').toLowerCase();
      return (!q||txt.includes(q))&&(!v||p.voltage===v)&&(!s||p.status===s)&&(!o||p.ownerId===o);
    });
  }

  function statusClass(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-'); }

  function renderProjects(){
    const rows=filteredProjects();
    $('projectsTableBody').innerHTML=rows.map((p,i)=>{
      const u=user(p.ownerId);
      return `<tr>
        <td>${i+1}</td>
        <td><span class="tag ${p.voltage.toLowerCase()}">${p.voltage}</span></td>
        <td>${esc(p.commune)}</td>
        <td><span class="link-like" data-edit="${p.id}">${esc(p.name)}</span></td>
        <td><div>${esc(p.description||'—')}</div>${phaseChips(p)}</td>
        <td><span class="owner-chip"><span class="avatar">${esc(u?.initials||'?')}</span>${esc(u?.name||'Non attribué')}</span></td>
        <td>${money(p.budget?.planned)}</td>
        <td><span class="status ${statusClass(p.status)}">${esc(p.status)}</span></td>
        <td><div class="row-actions"><button title="Voir le Gantt" data-gantt="${p.id}">▤</button><button title="Modifier" data-edit="${p.id}">✎</button></div></td>
      </tr>`;
    }).join('');
    $('projectsEmpty').classList.toggle('hidden',rows.length>0);
    $('statProjects').textContent=rows.length;
    $('statBT').textContent=rows.filter(p=>p.voltage==='BT').length;
    $('statMT').textContent=rows.filter(p=>p.voltage==='MT').length;
    $('statBudget').textContent=money(rows.reduce((a,p)=>a+Number(p.budget?.planned||0)-Number(p.budget?.actual||0),0));
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openProject(b.dataset.edit));
    document.querySelectorAll('[data-gantt]').forEach(b=>b.onclick=()=>{
      selectedProjectId=b.dataset.gantt;
      $('ganttMode').value='selected';
      renderUserSelects();
      switchView('gantt');
    });
  }

  function openProject(id=''){
    const p=id?project(id):null;
    $('projectModalTitle').textContent=p?'Modifier le projet':'Nouveau projet';
    $('projectId').value=p?.id||'';
    $('projectVoltage').value=p?.voltage||'BT';
    $('projectCommune').value=p?.commune||'';
    $('projectName').value=p?.name||'';
    $('projectDescription').value=p?.description||'';
    $('projectOwner').value=p?.ownerId||state.activeUserId;
    $('projectStatus').value=p?.status||'En cours';
    $('budgetPlannedInput').value=p?.budget?.planned||0;
    $('budgetCommittedInput').value=p?.budget?.committed||0;
    $('budgetActualInput').value=p?.budget?.actual||0;
    $('budgetReferenceInput').value=p?.budget?.reference||'';
    phases.forEach(({code})=>{
      document.querySelector(`[data-start="${code}"]`).value=p?.phases?.[code]?.start||'';
      document.querySelector(`[data-end="${code}"]`).value=p?.phases?.[code]?.end||'';
    });
    $('deleteProjectBtn').classList.toggle('hidden',!p);
    $('projectModal').classList.remove('hidden');
  }

  function closeProject(){ $('projectModal').classList.add('hidden'); }

  function renderBudgets(){
    const t=state.projects.reduce((a,p)=>{a.planned+=Number(p.budget?.planned||0);a.committed+=Number(p.budget?.committed||0);a.actual+=Number(p.budget?.actual||0);return a;},{planned:0,committed:0,actual:0});
    $('budgetTotal').textContent=money(t.planned);
    $('budgetCommitted').textContent=money(t.committed);
    $('budgetActual').textContent=money(t.actual);
    $('budgetRemaining').textContent=money(t.planned-t.actual);
    $('budgetTableBody').innerHTML=state.projects.map(p=>{
      const b=p.budget||{}, pct=b.planned?Math.min(100,Math.round(Number(b.actual||0)/Number(b.planned)*100)):0;
      return `<tr><td><span class="link-like" data-edit="${p.id}">${esc(p.name)}</span></td><td>${esc(user(p.ownerId)?.name||'—')}</td><td>${money(b.planned)}</td><td>${money(b.committed)}</td><td>${money(b.actual)}</td><td>${money(Number(b.planned||0)-Number(b.actual||0))}</td><td><div class="progress-wrap"><div class="progress"><span style="width:${pct}%"></span></div><small>${pct}%</small></div></td></tr>`;
    }).join('');
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openProject(b.dataset.edit));
  }

  function renderLegend(usedCodes){
    const legend=document.querySelector('.legend');
    const visible=phases.filter(ph=>usedCodes.has(ph.code));
    if(!visible.length){
      legend.innerHTML='<span>Aucune phase SIA datée</span>';
      return;
    }
    legend.innerHTML=visible.map(ph=>`<span><i class="legend-sia ${ph.cls}"></i>SIA ${ph.code}</span>`).join('');
  }

  function renderGantt(){
    const mode=$('ganttMode').value, ownerFilter=$('ganttOwnerFilter').value;
    $('ganttProjectSelect').classList.toggle('hidden',mode!=='selected');

    let rows=[];
    const usedCodes=new Set();

    if(mode==='selected'){
      selectedProjectId=$('ganttProjectSelect').value||selectedProjectId;
      const p=project(selectedProjectId);
      if(!p){
        $('ganttWrap').innerHTML='<div class="gantt-empty">Aucun projet.</div>';
        renderLegend(usedCodes);
        return;
      }
      $('ganttTitle').textContent=p.name;
      $('ganttHint').textContent=`${p.commune} · ${p.voltage} · seules les phases SIA avec une date sont affichées`;
      rows=datedPhases(p).map(ph=>{
        usedCodes.add(ph.code);
        return {
          label:`SIA ${ph.code} — ${ph.name}`,
          sub:`${formatDate(ph.start)} → ${formatDate(ph.end)}`,
          bars:[{start:ph.start,end:ph.end,cls:ph.cls,label:`SIA ${ph.code}`}],
          multi:false
        };
      });
    } else {
      const ps=state.projects.filter(p=>!ownerFilter||p.ownerId===ownerFilter);
      $('ganttTitle').textContent='Planning général — phases SIA';
      $('ganttHint').textContent=`${ps.length} projet(s) · chaque couleur correspond à une phase SIA`;
      rows=ps.map(p=>{
        const dp=datedPhases(p);
        dp.forEach(ph=>usedCodes.add(ph.code));
        return {
          label:p.name,
          sub:`${user(p.ownerId)?.name||'Sans responsable'} · ${p.commune} · ${p.voltage}`,
          bars:dp.map(ph=>({start:ph.start,end:ph.end,cls:ph.cls,label:`SIA ${ph.code}`})),
          multi:true
        };
      }).filter(r=>r.bars.length);
    }

    renderLegend(usedCodes);

    if(!rows.length){
      $('ganttWrap').innerHTML='<div class="gantt-empty">Ajoutez des dates SIA pour afficher le planning.</div>';
      return;
    }

    renderGanttRows(rows);
  }

  function renderGanttRows(rows){
    const allBars=rows.flatMap(r=>r.bars);
    const dates=allBars.flatMap(b=>[b.start,b.end].filter(Boolean).map(parseDate).filter(Boolean));
    if(!dates.length){
      $('ganttWrap').innerHTML='<div class="gantt-empty">Ajoutez des dates SIA pour afficher le planning.</div>';
      return;
    }

    let min=new Date(Math.min(...dates.map(d=>d.getTime())));
    let max=new Date(Math.max(...dates.map(d=>d.getTime())));
    min=new Date(min.getFullYear(),min.getMonth()-1+ganttOffsetMonths,1);
    max=new Date(max.getFullYear(),max.getMonth()+2+ganttOffsetMonths,0);
    const minSpan=new Date(min.getFullYear(),min.getMonth()+6,0);
    if(max<minSpan) max=minSpan;

    const total=Math.max(1,(max-min)/86400000);
    const months=[];
    let d=new Date(min.getFullYear(),min.getMonth(),1);
    while(d<=max){ months.push(new Date(d)); d=new Date(d.getFullYear(),d.getMonth()+1,1); }
    const timelineWidth=Math.max(900,months.length*100);

    const today=new Date();
    const todayLeft=today>=min&&today<=max ? ((today-min)/86400000)/total*100 : null;

    $('ganttWrap').innerHTML=`
      <div class="gantt-grid" style="grid-template-columns:250px ${timelineWidth}px">
        <div class="gantt-label header">Projet / phase</div>
        <div class="gantt-months" style="grid-template-columns:repeat(${months.length},100px)">
          ${months.map(m=>`<div class="gantt-month">${m.toLocaleDateString('fr-CH',{month:'short',year:'2-digit'})}</div>`).join('')}
        </div>
        ${rows.map(r=>{
          const timelineClass=r.multi?'gantt-timeline multi':'gantt-timeline';
          const bars=r.bars.map((b,index)=>{
            const s=parseDate(b.start||b.end), e=parseDate(b.end||b.start);
            const left=((s-min)/86400000)/total*100;
            const width=Math.max(.8,((e-s)/86400000)/total*100);
            const compact=r.multi?' compact':'';
            const top=r.multi ? 7 + index*8 : 10;
            const title=`${b.label} : ${formatDate(b.start)} → ${formatDate(b.end)}`;
            return `<div class="gantt-bar ${b.cls}${compact}" style="left:${left}%;width:${width}%;top:${top}px" title="${esc(title)}">${r.multi?'':esc(b.label)}</div>`;
          }).join('');
          return `<div class="gantt-label ${r.multi?'multi-label':''}"><strong>${esc(r.label)}</strong><small>${esc(r.sub)}</small></div><div class="${timelineClass}" style="width:${timelineWidth}px">${bars}${todayLeft===null?'':`<div class="gantt-today" style="left:${todayLeft}%" title="Aujourd’hui"></div>`}</div>`;
        }).join('')}
      </div>`;
  }

  function renderUsers(){
    $('usersList').innerHTML=state.users.map(u=>{
      const c=state.projects.filter(p=>p.ownerId===u.id).length;
      return `<div class="user-card"><span class="avatar">${esc(u.initials||'?')}</span><div class="meta"><strong>${esc(u.name)}</strong><span>${esc(u.role||'Utilisateur')}</span></div><span class="count">${c} projet(s)</span><button data-user="${u.id}">✎</button></div>`;
    }).join('');
    const max=Math.max(1,...state.users.map(u=>state.projects.filter(p=>p.ownerId===u.id).length));
    $('usersSummary').innerHTML=state.users.map(u=>{
      const c=state.projects.filter(p=>p.ownerId===u.id).length;
      return `<div class="summary-row"><span>${esc(u.name)}</span><div class="bar"><span style="width:${c/max*100}%"></span></div><strong>${c}</strong></div>`;
    }).join('');
    document.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>openUser(b.dataset.user));
  }

  function openUser(id=''){
    const u=id?user(id):null;
    $('userModalTitle').textContent=u?'Modifier l’utilisateur':'Nouvel utilisateur';
    $('userId').value=u?.id||'';
    $('userName').value=u?.name||'';
    $('userRole').value=u?.role||'';
    $('userInitials').value=u?.initials||'';
    $('deleteUserBtn').classList.toggle('hidden',!u);
    $('userModal').classList.remove('hidden');
  }

  function closeUser(){ $('userModal').classList.add('hidden'); }

  function renderAll(){ renderUserSelects(); renderProjects(); renderBudgets(); renderUsers(); renderGantt(); }

  function switchView(v){
    document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v+'View'));
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
    const t={
      projects:['Suivi des projets en cours','Gestion des projets électriques MT et BT'],
      gantt:['Planning Gantt','Planning des phases SIA par projet ou pour tous les projets'],
      budgets:['Budgets des projets','Suivi financier prévu, engagé et dépensé'],
      users:['Utilisateurs','Gestion des responsables et vue multi-utilisateurs']
    }[v];
    $('pageTitle').textContent=t[0];
    $('pageSubtitle').textContent=t[1];
    $('newProjectBtn').classList.toggle('hidden',v!=='projects');
    if(v==='gantt')renderGantt();
    if(v==='budgets')renderBudgets();
    if(v==='users')renderUsers();
  }

  document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $('toggleSidebar').onclick=()=>$('sidebar').classList.toggle('open');
  $('newProjectBtn').onclick=()=>openProject();
  document.querySelectorAll('[data-close-project]').forEach(b=>b.onclick=closeProject);
  document.querySelectorAll('[data-close-user]').forEach(b=>b.onclick=closeUser);
  $('newUserBtn').onclick=()=>openUser();

  ['searchInput','filterVoltage','filterStatus','filterOwner'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',renderProjects));
  $('resetFiltersBtn').onclick=()=>{ ['searchInput','filterVoltage','filterStatus','filterOwner'].forEach(id=>$(id).value=''); renderProjects(); };
  $('activeUserSelect').onchange=e=>{ state.activeUserId=e.target.value; save(); renderAll(); };
  $('ganttMode').onchange=renderGantt;
  $('ganttOwnerFilter').onchange=renderGantt;
  $('ganttProjectSelect').onchange=e=>{ selectedProjectId=e.target.value; renderGantt(); };
  $('ganttPrevBtn').onclick=()=>{ ganttOffsetMonths-=6; renderGantt(); };
  $('ganttNextBtn').onclick=()=>{ ganttOffsetMonths+=6; renderGantt(); };
  $('ganttTodayBtn').onclick=()=>{ ganttOffsetMonths=0; renderGantt(); };

  $('projectForm').onsubmit=e=>{
    e.preventDefault();
    const id=$('projectId').value||uid('p'), ph={};
    for(const {code} of phases){
      const s=document.querySelector(`[data-start="${code}"]`).value;
      const en=document.querySelector(`[data-end="${code}"]`).value;
      if(s&&en&&parseDate(en)<parseDate(s)) return toast(`La fin de la phase SIA ${code} est antérieure au début.`);
      if(s||en) ph[code]={start:s,end:en};
    }
    const p={
      id,
      voltage:$('projectVoltage').value,
      commune:$('projectCommune').value.trim(),
      name:$('projectName').value.trim(),
      description:$('projectDescription').value.trim(),
      ownerId:$('projectOwner').value,
      status:$('projectStatus').value,
      budget:{
        planned:Number($('budgetPlannedInput').value||0),
        committed:Number($('budgetCommittedInput').value||0),
        actual:Number($('budgetActualInput').value||0),
        reference:$('budgetReferenceInput').value.trim()
      },
      phases:ph
    };
    const i=state.projects.findIndex(x=>x.id===id);
    if(i>=0) state.projects[i]=p; else state.projects.push(p);
    selectedProjectId=id;
    save(i>=0?'Projet modifié.':'Projet ajouté.');
    closeProject();
    renderAll();
  };

  $('deleteProjectBtn').onclick=()=>{
    const id=$('projectId').value,p=project(id);
    if(p&&confirm(`Supprimer « ${p.name} » ?`)){
      state.projects=state.projects.filter(x=>x.id!==id);
      selectedProjectId=state.projects[0]?.id||'';
      save('Projet supprimé.');
      closeProject();
      renderAll();
    }
  };

  $('userForm').onsubmit=e=>{
    e.preventDefault();
    const id=$('userId').value||uid('u'),name=$('userName').value.trim();
    const u={id,name,role:$('userRole').value.trim(),initials:($('userInitials').value.trim()||name.split(/\s+/).map(x=>x[0]).join('').slice(0,3)).toUpperCase()};
    const i=state.users.findIndex(x=>x.id===id);
    if(i>=0)state.users[i]=u;else state.users.push(u);
    save(i>=0?'Utilisateur modifié.':'Utilisateur ajouté.');
    closeUser();
    renderAll();
  };

  $('deleteUserBtn').onclick=()=>{
    const id=$('userId').value,u=user(id),count=state.projects.filter(p=>p.ownerId===id).length;
    if(count)return toast(`Impossible : ${count} projet(s) attribué(s).`);
    if(state.users.length<=1)return toast('Il faut conserver au moins un utilisateur.');
    if(confirm(`Supprimer « ${u.name} » ?`)){
      state.users=state.users.filter(x=>x.id!==id);
      save('Utilisateur supprimé.');
      closeUser();
      renderAll();
    }
  };

  $('printBtn').onclick=()=>print();
  $('exportJsonBtn').onclick=()=>download(JSON.stringify({data:state},null,2),'projets-electriques.json','application/json');
  $('exportCsvBtn').onclick=()=>{
    const rows=[['Tension','Commune','Projet','Descriptif','Responsable','Etat','Phases SIA','Budget prévu','Engagé','Dépensé']].concat(state.projects.map(p=>[
      p.voltage,p.commune,p.name,p.description,user(p.ownerId)?.name||'',p.status,datedPhases(p).map(ph=>`SIA ${ph.code}`).join(' | '),p.budget?.planned||0,p.budget?.committed||0,p.budget?.actual||0
    ]));
    download('\uFEFF'+rows.map(r=>r.map(c=>`"${String(c).replaceAll('"','""')}"`).join(';')).join('\n'),'projets-electriques.csv','text/csv');
  };

  $('shareBtn').onclick=async()=>{
    try{
      if(navigator.share) await navigator.share({title:'Suivi des projets électriques',text:'Suivi des projets MT/BT',url:location.href});
      else { await navigator.clipboard.writeText(location.href); toast('Adresse copiée.'); }
    }catch{}
  };

  $('importJsonInput').onchange=e=>{
    const f=e.target.files?.[0];
    if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const x=JSON.parse(r.result), d=x.data||x;
        if(!Array.isArray(d.projects)||!Array.isArray(d.users))throw new Error('Format invalide');
        if(confirm('Remplacer les données actuelles ?')){
          state=d;
          selectedProjectId=state.projects[0]?.id||'';
          save('Données importées.');
          renderAll();
        }
      }catch{ toast('Fichier incompatible.'); }
    };
    r.readAsText(f);
  };

  function download(content,name,type){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([content],{type}));
    a.download=name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }

  renderSiaForm();
  renderAll();
})();