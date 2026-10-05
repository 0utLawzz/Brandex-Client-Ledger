// ===== BRANDEX LEDGER GAPS v2 CORE =====
const STAGE_LABEL = { S1: 'Stage 1', S2: 'Stage 2', S3: 'Stage 3', S4: 'Stage 4' };
function stageLabel(s) { return STAGE_LABEL[s] || s || '—'; }
function stageBadge(s) {
  if (!s) return '—';
  return `<span class="stage-b ${String(s).toLowerCase()}">${stageLabel(s)}</span>`;
}
const BRAND = {
  name: 'Brandex Law Associates',
  email: 'info@brandex.pk',
  tagline: 'TRADEMARK REGISTRY',
  banks: [
    {
      name: 'United Bank Limited (UBL)',
      title: 'Brandex Pk',
      account: '0209301813886',
      iban: 'PK85UNIL0109000301813886'
    },
    {
      name: 'Meezan Bank Limited',
      title: 'Brandex.pk',
      account: '9814-0104862477',
      iban: 'PK12MEZN0098140104862477'
    }
  ],
  online: [
    {
      name: 'EasyPaisa',
      title: 'EHTASHAM UD DIN SIDDIQUI',
      account: '0336-0015009',
      note: 'Scan to pay · Merchant Till 214114'
    },
    {
      name: 'JazzCash / Raast ID',
      title: 'EHTASHAM UD DIN SIDDIQUI',
      account: '0336-0015004'
    }
  ]
};
function isActiveEntry(e) { return !e.voided_at; }
function activeEntries(list) { return (list || []).filter(isActiveEntry); }

function onPaymentMethodChange() {
  const m = document.getElementById('rcMethod')?.value;
  const wrap = document.getElementById('rcBankDateWrap');
  if (!wrap) return;
  const needsDate = m && m !== 'Cash';
  wrap.style.display = needsDate ? 'flex' : 'none';
  if (needsDate && document.getElementById('rcBankDate') && !document.getElementById('rcBankDate').value) {
    document.getElementById('rcBankDate').value = today();
  }
}

async function autofillFromTM(prefix) {
  const tmEl = document.getElementById(prefix === 'ch' ? 'chTM' : 'rcTM');
  if (!tmEl) return;
  const data = await lookupCaseByTM(tmEl.value);
  let info = document.getElementById(prefix + 'TMInfo');
  if (!info) {
    info = document.createElement('div');
    info.id = prefix + 'TMInfo';
    info.style.cssText = 'font-family:DM Mono,monospace;font-size:11px;margin-top:6px;padding:8px;border:2px solid var(--black);background:var(--bg-alt);grid-column:1/-1;';
    tmEl.closest('.fg')?.appendChild(info) || tmEl.parentElement.appendChild(info);
  }
  if (!data) {
    info.textContent = tmEl.value.trim() ? 'No existing case for this TM — will create on save' : '';
    info.style.borderColor = 'var(--accent3)';
    return;
  }
  const client = data.clients ? ((data.clients.client_code || '') + ' · ' + (data.clients.client_name || '')) : '—';
  info.innerHTML = '<strong>MATCH</strong> · App: ' + (data.application_name || '—') + ' · Client: ' + client + (data.folder_no ? ' · Folder: ' + data.folder_no : '');
  info.style.borderColor = 'var(--accent2)';
  if (prefix === 'ch') {
    if (data.application_name && document.getElementById('chAppName')) document.getElementById('chAppName').value = data.application_name;
    if (data.folder_no && document.getElementById('chFolder')) document.getElementById('chFolder').value = data.folder_no;
    if (data.client_id && document.getElementById('chClient')) document.getElementById('chClient').value = data.client_id;
  } else {
    if (data.client_id && document.getElementById('rcClient')) {
      document.getElementById('rcClient').value = data.client_id;
      if (typeof populateLinkedCharges === 'function') populateLinkedCharges(data.client_id);
    }
  }
}

loadEntries = async function() {
  if (sb) {
    const { data, error } = await sb.from('ledger_entries')
      .select('*, clients(client_code, client_name, email, phone, city), cases(id, tm_no, folder_no, application_name)')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) console.warn(error);
    if (data) mem.entries = data;
  }
};

loadClients = async function() {
  if (sb) {
    const { data } = await sb.from('clients').select('*, series(code, name), client_stage_rates(*)').order('client_code');
    if (data) {
      mem.clients = data;
      mem.rates = {};
      data.forEach(c => {
        mem.rates[c.id] = {};
        (c.client_stage_rates || []).forEach(r => { mem.rates[c.id][r.stage] = r.amount; });
      });
    }
  }
  const rc = document.getElementById('reportClient');
  if (rc) {
    const v = rc.value;
    rc.innerHTML = '<option value="">All Clients</option>';
    mem.clients.forEach(c => { rc.innerHTML += `<option value="${c.id}">${c.client_code} — ${c.client_name || ''}</option>`; });
    rc.value = v;
  }
};

loadDashboard = async function() {
  await Promise.all([loadSeries(), loadClients(), loadEntries()]);
  const clients = mem.clients.length;
  let due = 0, rec = 0;
  activeEntries(mem.entries).forEach(e => {
    due += Number(e.amount_due || 0);
    rec += Number(e.amount_received || 0);
  });
  const outstanding = due - rec;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('statClients', clients);
  set('statReceived', fmt(rec));
  set('statOutstanding', fmt(outstanding));
  set('statEntries', mem.entries.length);
  set('navClients', clients);
  set('navOutstanding', fmt(outstanding));

  const tbody = document.getElementById('recentTableBody') || document.querySelector('#recentTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const rows = mem.entries.slice(0, 15);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No entries yet — add a client, then post a charge or receiving</td></tr>';
    return;
  }
  rows.forEach(e => {
    const code = e.clients?.client_code || '—';
    const tm = e.cases?.tm_no || e.cases?.application_name || e.details || '—';
    const voidMark = e.voided_at ? ' · VOID' : '';
    tbody.innerHTML += `<tr class="${e.entry_type}-row" style="${e.voided_at ? 'opacity:.45' : ''}">
      <td class="date-cell">${e.entry_date || ''}</td>
      <td>${code}</td>
      <td>${e.entry_type}${voidMark}</td>
      <td>${stageBadge(e.stage)}</td>
      <td>${tm}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
    </tr>`;
  });
};

renderClients = function() {
  const q = (document.getElementById('clientSearch').value || '').toLowerCase();
  const seriesId = document.getElementById('seriesFilter').value;
  const grid = document.getElementById('clientsGrid');
  grid.innerHTML = '';
  let list = mem.clients;
  if (seriesId) list = list.filter(c => c.series_id === seriesId);
  if (q) list = list.filter(c =>
    (c.client_code || '').toLowerCase().includes(q) ||
    (c.client_name || '').toLowerCase().includes(q) ||
    (c.city || '').toLowerCase().includes(q) ||
    (c.phone || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q)
  );
  if (!list.length) {
    grid.innerHTML = '<div class="empty">No clients yet. Click + New Client to start.</div>';
    return;
  }
  const bySeries = {};
  list.forEach(c => {
    const sc = c.series?.code || mem.series.find(s => s.id === c.series_id)?.code || '—';
    const sn = c.series?.name || sc;
    if (!bySeries[sc]) bySeries[sc] = { name: sn, items: [] };
    bySeries[sc].items.push(c);
  });
  Object.keys(bySeries).sort().forEach(sc => {
    const g = bySeries[sc];
    grid.innerHTML += `<div style="grid-column:1/-1;margin-top:8px;"><div class="series-banner">${sc}</div><div style="font-family:DM Mono,monospace;font-size:11px;color:var(--muted);margin-bottom:8px;">${g.name} SERIES</div></div>`;
    g.items.forEach(c => {
      let due = 0, rec = 0;
      activeEntries(mem.entries).filter(e => e.client_id === c.id).forEach(e => {
        due += Number(e.amount_due || 0);
        rec += Number(e.amount_received || 0);
      });
      const bal = Number(c.header_balance || 0) + due - rec;
      const balCls = bal > 0 ? 'neg' : bal < 0 ? 'pos' : '';
      grid.innerHTML += `
        <div class="client-card" onclick="openClientLedger('${c.id}')">
          <div class="cc-top"><div class="cc-no">${c.client_code}</div><div class="cc-series">${sc}</div></div>
          <div class="cc-name">${c.client_name || '—'}</div>
          <div class="cc-divider"></div>
          <div class="cc-row"><span>City</span><span>${c.city || '—'}</span></div>
          <div class="cc-row"><span>Phone</span><span>${c.phone || '—'}</span></div>
          <div class="cc-row"><span>Email</span><span>${c.email || '—'}</span></div>
          <div class="cc-row"><span>Balance</span><span class="cc-bal ${balCls}">${fmt(bal)}</span></div>
        </div>`;
    });
  });
};

openClientModal = function() {
  ['cCode','cName','cCity','cEmail','cPhone'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('cHeader').value = '0';
  ['rS1','rS2','rS3','rS4'].forEach(id => { document.getElementById(id).value = '0'; });
  openModal('modalClient');
};

saveClient = async function() {
  const code = document.getElementById('cCode').value.trim();
  if (!code) return toast('Client code required');
  const payload = {
    series_id: document.getElementById('cSeries').value || null,
    client_code: code,
    client_name: document.getElementById('cName').value.trim(),
    city: document.getElementById('cCity').value.trim(),
    email: (document.getElementById('cEmail') && document.getElementById('cEmail').value.trim()) || null,
    phone: (document.getElementById('cPhone') && document.getElementById('cPhone').value.trim()) || null,
    header_balance: Number(document.getElementById('cHeader').value) || 0
  };
  const rates = { S1: Number(document.getElementById('rS1').value)||0, S2: Number(document.getElementById('rS2').value)||0, S3: Number(document.getElementById('rS3').value)||0, S4: Number(document.getElementById('rS4').value)||0 };
  if (!sb) return toast('Supabase required');
  let { data, error } = await sb.from('clients').insert(payload).select().single();
  if (error && (String(error.message).includes('email') || String(error.message).includes('phone'))) {
    delete payload.email; delete payload.phone;
    const r2 = await sb.from('clients').insert(payload).select().single();
    data = r2.data; error = r2.error;
    if (!error) toast('Client saved (run migration 003 for email/phone)');
  }
  if (error) return toast(error.message);
  const rateRows = Object.entries(rates).map(([stage, amount]) => ({ client_id: data.id, stage, amount }));
  await sb.from('client_stage_rates').upsert(rateRows, { onConflict: 'client_id,stage' });
  toast('Client saved');
  closeModal('modalClient');
  await loadClients(); renderClients(); loadDashboard();
};

openClientLedger = async function(clientId) {
  currentClientId = clientId; currentViewMode = false;
  const c = mem.clients.find(x => x.id === clientId);
  if (!c) return;
  const title = document.getElementById('ledgerTitle');
  if (title) title.textContent = c.client_code + ' · Ledger';
  const sub = document.getElementById('ledgerSub');
  if (sub) sub.textContent = (c.client_name || '—');
  let due = 0, rec = 0;
  const rows = mem.entries.filter(e => e.client_id === clientId);
  activeEntries(rows).forEach(e => { due += Number(e.amount_due || 0); rec += Number(e.amount_received || 0); });
  const balEl = document.getElementById('lhBal');
  if (balEl) balEl.textContent = fmt(Number(c.header_balance || 0) + due - rec);
  if (typeof renderStageOutstanding === 'function') renderStageOutstanding(rows);
  if (typeof populateLedgerCaseFilter === 'function') populateLedgerCaseFilter(rows);
  window._ledgerRows = rows;
  if (typeof renderClientEntries === 'function') renderClientEntries(rows);
  showPage('ledger');
};

function populateLedgerCaseFilter(rows) {
  const bar = document.getElementById('caseFilterBar');
  const sel = document.getElementById('ledgerCaseFilter');
  if (!sel) return;
  const cases = {};
  rows.forEach(e => {
    if (e.cases?.id) cases[e.cases.id] = e.cases.tm_no || e.cases.application_name || e.cases.folder_no || e.cases.id.slice(0, 8);
  });
  const keys = Object.keys(cases);
  if (bar) bar.style.display = keys.length ? 'flex' : 'none';
  sel.innerHTML = '<option value="">All cases</option>';
  keys.forEach(k => { sel.innerHTML += `<option value="${k}">${cases[k]}</option>`; });
}
function filterLedgerByCase() {
  const id = document.getElementById('ledgerCaseFilter').value;
  let rows = window._ledgerRows || [];
  if (id) rows = rows.filter(e => e.cases?.id === id);
  if (typeof renderStageOutstanding === 'function') renderStageOutstanding(rows);
  if (typeof renderClientEntries === 'function') renderClientEntries(rows);
}
function renderStageOutstanding(rows) {
  const box = document.getElementById('stageOutstanding');
  if (!box) return;
  box.style.display = 'none';
  box.innerHTML = '';
}

renderClientEntries = function(rows) {
  const tbody = document.querySelector('#clientLedgerTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  let list = [...rows].sort((a, b) => (b.entry_date||'').localeCompare(a.entry_date||'') || (b.created_at||'').localeCompare(a.created_at||''));
  if (currentViewMode) list = list.slice(0, 6);
  list.forEach(e => {
    const tm = e.cases?.tm_no || e.cases?.folder_no || e.cases?.application_name || '—';
    const voided = !!e.voided_at;
    let actions = '';
    if (!voided && e.id) {
      if (e.entry_type === 'receiving') actions += `<button class="btn sm ok" onclick="event.stopPropagation();printAck('${e.id}')">Print Ack</button> `;
      actions += `<button class="btn sm del" onclick="event.stopPropagation();voidEntry('${e.id}')">Void</button>`;
    }
    tbody.innerHTML += `<tr class="${e.entry_type}-row" style="${voided?'opacity:.45;text-decoration:line-through;':''}">
      <td class="date-cell">${e.entry_date||''}</td>
      <td>${voided ? e.entry_type+' · VOID' : e.entry_type}</td>
      <td>${stageBadge(e.stage)}</td>
      <td class="folder-no"><strong>${tm}</strong></td>
      <td>${e.details||''}${e.payment_method ? ' · '+e.payment_method : ''}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
      <td class="date-cell no-print">${actions}</td>
    </tr>`;
  });
  if (!list.length) tbody.innerHTML = '<tr><td colspan="8" class="empty">No entries</td></tr>';
};

async function voidEntry(id) {
  if (!confirm('Void this entry?')) return;
  if (!sb) return toast('Supabase required');
  const reason = prompt('Void reason (optional)') || 'voided';
  const { error } = await sb.from('ledger_entries').update({ voided_at: new Date().toISOString(), void_reason: reason }).eq('id', id);
  if (error) return toast(error.message + ' — run migration 002');
  toast('Entry voided');
  await loadEntries();
  if (currentClientId) openClientLedger(currentClientId); else loadDashboard();
}

const _openChargeModalGaps = typeof openChargeModal === 'function' ? openChargeModal : function(){};
openChargeModal = function(preClientId) {
  _openChargeModalGaps(preClientId);
  if (document.getElementById('chAppName')) document.getElementById('chAppName').value = '';
};

saveCharge = async function() {
  const clientId = document.getElementById('chClient').value;
  const tm = document.getElementById('chTM').value.trim();
  const stage = document.getElementById('chStage').value;
  const amount = Number(document.getElementById('chAmount').value);
  if (!clientId || !amount) return toast('Client and amount required');
  if (stage !== 'S1' && !tm) return toast('TM required for ' + stageLabel(stage));
  const tmNorm = normalizeTM(tm);
  const appName = document.getElementById('chAppName')?.value.trim() || null;
  let caseId = null;
  if (!sb) return toast('Supabase required');
  if (tmNorm) {
    let { data: existing } = await sb.from('cases').select('id, application_name').eq('tm_no_normalized', tmNorm).eq('client_id', clientId).maybeSingle();
    if (existing) {
      caseId = existing.id;
      if (appName && !existing.application_name) await sb.from('cases').update({ application_name: appName }).eq('id', caseId);
    } else {
      const { data: created, error } = await sb.from('cases').insert({ client_id: clientId, tm_no: tm, folder_no: document.getElementById('chFolder').value.trim()||null, application_name: appName }).select().single();
      if (error) return toast(error.message);
      caseId = created.id;
    }
  } else {
    const { data: created, error } = await sb.from('cases').insert({ client_id: clientId, tm_no: null, folder_no: document.getElementById('chFolder').value.trim()||null, application_name: appName }).select().single();
    if (error) return toast(error.message);
    caseId = created.id;
  }
  const { error: e2 } = await sb.from('ledger_entries').insert({ client_id: clientId, case_id: caseId, entry_date: document.getElementById('chDate').value||today(), entry_type: 'charge', stage, details: document.getElementById('chDetails').value.trim()||(stageLabel(stage)+' fee'), amount_due: amount });
  if (e2) return toast(e2.message);
  toast('Charge posted');
  closeModal('modalCharge');
  await loadEntries(); loadDashboard();
  if (currentClientId === clientId) openClientLedger(clientId);
};

const _openReceivingModalGaps = typeof openReceivingModal === 'function' ? openReceivingModal : function(){};
openReceivingModal = function(preClientId) {
  _openReceivingModalGaps(preClientId);
  const sel = document.getElementById('rcClient');
  if (sel) {
    populateLinkedCharges(preClientId || sel.value);
    sel.onchange = function() { populateLinkedCharges(sel.value); };
  }
  onPaymentMethodChange();
};

function populateLinkedCharges(clientId) {
  const sel = document.getElementById('rcLinkedCharge');
  if (!sel) return;
  const charges = activeEntries(mem.entries).filter(e => e.client_id === clientId && e.entry_type === 'charge');
  sel.innerHTML = '<option value="">— None —</option>';
  charges.forEach(e => {
    const tm = e.cases?.tm_no || e.cases?.application_name || '';
    sel.innerHTML += '<option value="'+e.id+'" data-stage="'+(e.stage||'')+'">'+(e.entry_date||'')+' · '+stageLabel(e.stage)+' · Due '+fmt(e.amount_due)+' '+tm+'</option>';
  });
  sel.onchange = function() {
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.stage) document.getElementById('rcStage').value = opt.dataset.stage;
  };
}

saveReceiving = async function() {
  const clientId = document.getElementById('rcClient').value;
  const amount = Number(document.getElementById('rcAmount').value);
  if (!clientId || !amount) return toast('Client and amount required');
  const tm = document.getElementById('rcTM').value.trim();
  const stage = document.getElementById('rcStage').value || null;
  const method = document.getElementById('rcMethod').value;
  const bankDate = document.getElementById('rcBankDate')?.value || null;
  const receiptNo = 'R-' + Date.now().toString().slice(-8);
  const linked = document.getElementById('rcLinkedCharge')?.value || null;
  let caseId = null;
  if (!sb) return toast('Supabase required');
  if (tm) {
    const tmNorm = normalizeTM(tm);
    let { data: existing } = await sb.from('cases').select('id').eq('tm_no_normalized', tmNorm).eq('client_id', clientId).maybeSingle();
    if (existing) caseId = existing.id;
    else {
      const { data: created } = await sb.from('cases').insert({ client_id: clientId, tm_no: tm }).select().single();
      if (created) caseId = created.id;
    }
  }
  let details = document.getElementById('rcNotes').value.trim() || 'Payment received';
  if (bankDate && method !== 'Cash') details += ' · Transfer date: ' + bankDate;
  const row = { client_id: clientId, case_id: caseId, entry_date: document.getElementById('rcDate').value||today(), entry_type: 'receiving', stage, details, amount_received: amount, payment_method: method, receipt_no: receiptNo };
  if (linked) row.linked_entry_id = linked;
  let { data, error } = await sb.from('ledger_entries').insert(row).select().single();
  if (error && linked) {
    delete row.linked_entry_id;
    const r2 = await sb.from('ledger_entries').insert(row).select().single();
    data = r2.data; error = r2.error;
  }
  if (error) return toast(error.message);
  toast('Payment saved · Print Ack from ledger when ready');
  closeModal('modalReceiving');
  await loadEntries(); loadDashboard();
  if (currentClientId === clientId) openClientLedger(clientId);
};

async function openEditCaseModal() {
  if (!currentClientId) return toast('Open a client ledger first');
  const rows = (mem.entries || []).filter(e => e.client_id === currentClientId && e.cases);
  const cases = {};
  rows.forEach(e => { if (e.cases?.id) cases[e.cases.id] = e.cases; });
  const sel = document.getElementById('ecCaseSelect');
  if (!sel) return toast('Edit case modal missing');
  sel.innerHTML = '';
  Object.keys(cases).forEach(id => {
    const c = cases[id];
    sel.innerHTML += `<option value="${id}">${c.tm_no || c.application_name || c.folder_no || id.slice(0,8)}</option>`;
  });
  if (!Object.keys(cases).length) return toast('No cases for this client');
  onEditCaseSelect();
  openModal('modalEditCase');
}
function onEditCaseSelect() {
  const id = document.getElementById('ecCaseSelect').value;
  document.getElementById('ecCaseId').value = id;
  const rows = (mem.entries || []).filter(e => e.cases?.id === id);
  const c = rows[0]?.cases || {};
  document.getElementById('ecTM').value = c.tm_no || '';
  document.getElementById('ecFolder').value = c.folder_no || '';
  document.getElementById('ecAppName').value = c.application_name || '';
}
async function saveEditCase() {
  const id = document.getElementById('ecCaseId').value;
  if (!id || !sb) return;
  const { error } = await sb.from('cases').update({
    tm_no: document.getElementById('ecTM').value.trim() || null,
    folder_no: document.getElementById('ecFolder').value.trim() || null,
    application_name: document.getElementById('ecAppName').value.trim() || null
  }).eq('id', id);
  if (error) return toast(error.message);
  toast('Case updated');
  closeModal('modalEditCase');
  await loadEntries();
  if (currentClientId) openClientLedger(currentClientId);
}

console.log('Brandex gaps v5 core loaded (accounts + methods)');
