// Core App Logic
const q = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function uuid(){ return crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(16).slice(2)+Date.now()); }

const defaults = {
  categories: [
    {id: uuid(), name:'Courses alimentaires', monthlyLimit:50000, isSavings:false},
    {id: uuid(), name:'École privée', monthlyLimit:25000, isSavings:false},
    {id: uuid(), name:'Caisse épouse & enfants', monthlyLimit:30000, isSavings:false},
    {id: uuid(), name:'Caisse maman', monthlyLimit:5000, isSavings:false},
    {id: uuid(), name:'Caisse personnelle', monthlyLimit:30000, isSavings:false},
    {id: uuid(), name:'Véhicule', monthlyLimit:20000, isSavings:false},
    {id: uuid(), name:'Voyage & Loisirs', monthlyLimit:50000, isSavings:false},
    {id: uuid(), name:'Épargne & Investissement', monthlyLimit:40000, isSavings:true},
    {id: uuid(), name:'Maison (aménagement)', monthlyLimit:60000, isSavings:false},
    {id: uuid(), name:'Bonus / Prime', monthlyLimit:null, isSavings:false}
  ],
  envelopes: [
    {id: uuid(), name:'Voyage famille', balance:0, targetAmount:600000, monthlyAllocation:55000, isLocked:true},
    {id: uuid(), name:'Projet maison', balance:0, targetAmount:1200000, monthlyAllocation:60000, isLocked:true}
  ],
  settings: {
    currency:'DZD', lockOnLaunch:true, lockEnvelopes:true, notifyOnOverspend:true,
    pinHash:null
  }
};

let state = {
  categories: [], envelopes: [], transactions: [], settings: {}
};

// Simple hash (not cryptographic) for PIN — just obfuscation.
async function hashPIN(pin){
  const enc = new TextEncoder().encode('bm::'+pin);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function saveSettings(){ await BMDB.dbPut(BMDB.STORE.settings, {key:'settings', ...state.settings}); }
async function loadAll(){
  const [cats, txs, envs, st] = await Promise.all([
    BMDB.dbGetAll(BMDB.STORE.cat),
    BMDB.dbGetAll(BMDB.STORE.tx),
    BMDB.dbGetAll(BMDB.STORE.env),
    BMDB.dbGetAll(BMDB.STORE.settings)
  ]);
  state.categories = cats;
  state.transactions = txs;
  state.envelopes = envs;
  state.settings = (st.find(s=>s.key==='settings') || defaults.settings);
  if (!cats.length){ await BMDB.dbBulkPut(BMDB.STORE.cat, defaults.categories); state.categories = defaults.categories; }
  if (!envs.length){ await BMDB.dbBulkPut(BMDB.STORE.env, defaults.envelopes); state.envelopes = defaults.envelopes; }
  if (!st.length){ await saveSettings(); }
}

function fmt(val){ return `${Math.round(val).toLocaleString('fr-DZ')} ${state.settings.currency||'DZD'}`; }

function currentMonthBounds(){
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth()+1, 1);
  return {start, end};
}

function monthlySpend(catId){
  const {start,end} = currentMonthBounds();
  return state.transactions.filter(t=>!t.isIncome && t.date>=start.getTime() && t.date<end.getTime() && t.categoryId===catId)
    .reduce((s,t)=>s+t.amount,0);
}

function totalMonthlySpend(){
  const {start,end} = currentMonthBounds();
  return state.transactions.filter(t=>!t.isIncome && t.date>=start.getTime() && t.date<end.getTime())
    .reduce((s,t)=>s+t.amount,0);
}

async function render(){
  // Lock gate
  const lock = q('#lock');
  if (state.settings.lockOnLaunch && state.settings.pinHash){
    lock.classList.remove('hidden');
  } else {
    lock.classList.add('hidden');
  }

  // Dashboard
  q('#totalSpend').textContent = fmt(totalMonthlySpend());
  const catList = q('#catList'); catList.innerHTML='';
  state.categories.forEach(cat=>{
    const spent = monthlySpend(cat.id);
    const cap = cat.monthlyLimit;
    const div = document.createElement('div');
    const ratio = cap ? Math.min(spent / cap, 1) : 0;
    div.innerHTML = `
      <div class="row">
        <div>
          <div style="font-weight:700">${cat.name}</div>
          <small>${cap? fmt(spent)+' / '+fmt(cap): fmt(spent)}</small>
        </div>
        <div style="width:160px" class="progress"><i style="width:${ratio*100}%"></i></div>
      </div>`;
    if (cap && spent>cap && state.settings.notifyOnOverspend){ notify('Budget dépassé', `Catégorie ${cat.name}: ${fmt(spent)} / ${fmt(cap)}`); }
    catList.appendChild(div);
  });

  // Chart
  const labels = state.categories.map(c=>c.name);
  const values = state.categories.map(c=>monthlySpend(c.id));
  BMCharts.drawBarChart(q('#chart'), labels, values);

  // TX form category options
  const txCat = q('#txCat'); txCat.innerHTML = `<option value="">—</option>` + state.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

  // TX list
  const list = q('#txList'); list.innerHTML='';
  state.transactions.sort((a,b)=>b.date-a.date).forEach(t=>{
    const cat = state.categories.find(c=>c.id===t.categoryId);
    const row = document.createElement('div'); row.className='row';
    row.innerHTML = `<div><div style="font-weight:700">${t.isIncome?'Revenu':(cat?cat.name:'Sans catégorie')}</div>
      <small>${t.note||''}</small><div><small>${new Date(t.date).toLocaleDateString('fr-DZ')}</small></div></div>
      <div style="font-weight:600;${t.isIncome?'color:#22c55e':''}">${t.isIncome?'+':'-'} ${fmt(Math.abs(t.amount))}</div>`;
    list.appendChild(row);
  });

  // Envelopes
  const envList = q('#envList'); envList.innerHTML='';
  state.envelopes.forEach(env=>{
    const p = document.createElement('div'); p.className='card';
    const prog = env.targetAmount? Math.min(env.balance / env.targetAmount, 1) : 0;
    p.innerHTML = `<div class="row"><div>
      <div style="font-weight:700">${env.name}</div>
      <small>Solde: ${fmt(env.balance)}${env.targetAmount? ' — Objectif: '+fmt(env.targetAmount): ''}</small>
      </div><div style="width:160px" class="progress"><i style="width:${prog*100}%"></i></div></div>
      <div class="row" style="margin-top:8px">
        <input type="number" placeholder="Montant" class="env-amt">
        <button class="primary env-add">Ajouter</button>
        <button class="primary env-sub">Retirer</button>
      </div>`;
    p.querySelector('.env-add').onclick = async ()=>{
      if (state.settings.lockEnvelopes && state.settings.pinHash && !(await unlockedOnce())){ alert('Déverrouille d’abord.'); return; }
      const val = Number(p.querySelector('.env-amt').value)||0; env.balance += val; await BMDB.dbPut(BMDB.STORE.env, env); render();
    };
    p.querySelector('.env-sub').onclick = async ()=>{
      if (state.settings.lockEnvelopes && state.settings.pinHash && !(await unlockedOnce())){ alert('Déverrouille d’abord.'); return; }
      const val = Number(p.querySelector('.env-amt').value)||0; env.balance = Math.max(0, env.balance - val); await BMDB.dbPut(BMDB.STORE.env, env); render();
    };
    envList.appendChild(p);
  });

  // Settings
  q('#currency').value = state.settings.currency||'DZD';
  q('#lockOnLaunch').checked = !!state.settings.lockOnLaunch;
  q('#lockEnvelopes').checked = !!state.settings.lockEnvelopes;
}

let _unlockStamp = 0;
async function unlockedOnce(){
  return Date.now() - _unlockStamp < 5*60*1000; // 5 minutes grace
}

// Tabs
$$('.tab').forEach(b=>b.onclick = ()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  ['dashboard','tx','envelopes','settings'].forEach(id=> q('#'+id).classList.add('hidden'));
  q('#'+b.dataset.tab).classList.remove('hidden');
});

// Actions
q('#btnAddTx').onclick = async ()=>{
  const type = q('#txType').value;
  const amount = Math.abs(Number(q('#txAmount').value)||0);
  const catId = q('#txCat').value || null;
  const note = q('#txNote').value.trim();
  const isIncome = type==='in';
  const isReimb = q('#txReimb').checked;
  if (!amount) return;
  const tx = { id: uuid(), date: Date.now(), amount, categoryId: isIncome? null : catId, note, isIncome, isReimbursable: isReimb };
  await BMDB.dbPut(BMDB.STORE.tx, tx);
  state.transactions.push(tx);
  q('#txAmount').value=''; q('#txNote').value=''; q('#txReimb').checked=false;
  render();
};

q('#btnAddEnv').onclick = async ()=>{
  const name = q('#envName').value.trim()||'Sans nom';
  const monthly = Number(q('#envMonthly').value)||0;
  const target = Number(q('#envTarget').value)||0;
  const env = { id: uuid(), name, balance:0, targetAmount: target||null, monthlyAllocation: monthly, isLocked:true };
  await BMDB.dbPut(BMDB.STORE.env, env);
  state.envelopes.push(env);
  q('#envName').value=''; q('#envMonthly').value=''; q('#envTarget').value='';
  render();
};

q('#btnDefaults').onclick = async ()=>{
  await BMDB.dbBulkPut(BMDB.STORE.cat, defaults.categories);
  state.categories = defaults.categories;
  render();
};

q('#currency').onchange = async (e)=>{ state.settings.currency = e.target.value.toUpperCase(); await saveSettings(); render(); };
q('#lockOnLaunch').onchange = async (e)=>{ state.settings.lockOnLaunch = e.target.checked; await saveSettings(); };
q('#lockEnvelopes').onchange = async (e)=>{ state.settings.lockEnvelopes = e.target.checked; await saveSettings(); };

q('#btnSetPin').onclick = async ()=>{
  const p1 = q('#pin1').value.trim(), p2 = q('#pin2').value.trim();
  if (p1.length!==4 || p1!==p2){ alert('PIN invalide ou non identique.'); return; }
  state.settings.pinHash = await hashPIN(p1);
  await saveSettings();
  alert('PIN défini.');
};

// Lock screen
const pinInputs = Array.from(document.querySelectorAll('#lock .pin-wrap input'));
pinInputs.forEach((input, idx)=>{
  input.addEventListener('input', ()=>{
    input.value = input.value.replace(/[^0-9]/g,'');
    if (input.value && idx<pinInputs.length-1) pinInputs[idx+1].focus();
  });
});
q('#btnUnlock').onclick = async ()=>{
  const pin = pinInputs.map(i=>i.value).join('');
  if (pin.length!==4){ q('#lockMsg').textContent='PIN incomplet.'; return; }
  const h = await hashPIN(pin);
  if (h === state.settings.pinHash){
    q('#lock').classList.add('hidden');
    _unlockStamp = Date.now();
    pinInputs.forEach(i=>i.value='');
    q('#lockMsg').textContent='';
  } else {
    q('#lockMsg').textContent='PIN incorrect.';
  }
};
q('#btnResetPin').onclick = async ()=>{
  if (confirm('Supprimer le PIN ?')){
    state.settings.pinHash = null;
    await saveSettings();
    q('#lock').classList.add('hidden');
  }
};

// Export / Import
q('#btnExport').onclick = async ()=>{
  const payload = {
    categories: state.categories,
    envelopes: state.envelopes,
    transactions: state.transactions,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'budgetmaster-backup.json'; a.click();
  URL.revokeObjectURL(url);
};
q('#btnImport').onclick = async ()=>{
  const file = q('#fileImport').files[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  // replace all
  state.categories = data.categories||[];
  state.envelopes = data.envelopes||[];
  state.transactions = (data.transactions||[]).map(t=>({...t, date: typeof t.date==='number'?t.date: Date.parse(t.date)}));
  state.settings = data.settings || state.settings;
  await Promise.all([
    BMDB.dbBulkPut(BMDB.STORE.cat, state.categories),
    BMDB.dbBulkPut(BMDB.STORE.env, state.envelopes)
  ]);
  // tx: put one by one to avoid key conflicts
  for (const t of state.transactions){ await BMDB.dbPut(BMDB.STORE.tx, t); }
  await saveSettings();
  alert('Import terminé.');
  render();
};

// Notifications
async function notify(title, body){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted'){
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied'){
    const p = await Notification.requestPermission();
    if (p === 'granted') new Notification(title, { body });
  }
}
q('#btnNotify').onclick = ()=> notify('BudgetMaster', 'Notifications activées ✅');

// Init
(async function init(){
  await loadAll();
  // prefill example
  if (!state.transactions.length){
    const salary = { id: uuid(), date: Date.now(), amount: 263000, categoryId: null, note:'Salaire mensuel', isIncome:true, isReimbursable:false };
    await BMDB.dbPut(BMDB.STORE.tx, salary);
    state.transactions.push(salary);
  }
  render();
  // Lock if enabled
  if (state.settings.lockOnLaunch && state.settings.pinHash){
    q('#lock').classList.remove('hidden');
  }
})();