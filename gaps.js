// ===== GAPS PATCH (loaded after app.js) =====
function isActiveEntry(e) { return !e.voided_at; }
function activeEntries(list) { return (list || []).filter(isActiveEntry); }

loadDashboard = async function() {
  await Promise.all([loadSeries(), loadClients(), loadEntries()]);
  const clients = mem.clients.length;
  let due = 0, rec = 0;
  activeEntries(mem.entries).forEach(e => {
    due += Number(e.amount_due || 0);
    rec += Number(e.amount_received || 0);
  });
  const outstanding = due - rec;
  document.getElementById('statClients').textContent = clients;
  document.getElementById('statReceived').textContent = fmt(rec);
  document.getElementById('statOutstanding').textContent = fmt(outstanding);
  document.getElementById('statEntries').textContent = mem.entries.length;
  document.getElementById('navClients').textContent = clients;
  document.getElementById('navOutstanding').textContent = fmt(outstanding);
  const tbody = document.querySelector('#recentTable tbody');
  tbody.innerHTML = '';
  mem.entries.slice(0, 12).forEach(e => {
    const code = e.clients?.client_code || '—';
    const tm = e.cases?.tm_no || e.cases?.application_name || e.details || '—';
    const voidMark = e.voided_at ? ' · VOID' : '';
    tbody.innerHTML += `<tr class="${e.entry_type}-row" style="${e.voided_at?'opacity:.45':''}">
      <td class="date-cell">${e.entry_date || ''}</td>
      <td>${e.entry_type}${voidMark}</td>
      <td>${e.stage ? `<span class="stage-b ${e.stage.toLowerCase()}">${e.stage}</span>` : '—'}</td>
      <td>${tm}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
    </tr>`;
  });
  if (!mem.entries.length) tbody.innerHTML = '<tr><td colspan="7" class="empty">No entries yet</td></tr>';
};

openClientLedger = async function(clientId) {
  currentClientId = clientId;
  currentViewMode = false;
  const c = mem.clients.find(x => x.id === clientId);
  if (!c) return;
  document.getElementById('ledgerTitle').textContent = c.client_code + ' · Ledger';
  document.getElementById('lhCode').textContent = c.client_code;
  document.getElementById('lhName').textContent = c.client_name || '—';
  let due = 0, rec = 0;
  const rows = mem.entries.filter(e => e.client_id === clientId);
  activeEntries(rows).forEach(e => { due += Number(e.amount_due || 0); rec += Number(e.amount_received || 0); });
  const bal = Number(c.header_balance || 0) + due - rec;
  document.getElementById('lhBal').textContent = fmt(bal);
  renderStageOutstanding(rows);
  renderClientEntries(rows);
  showPage('ledger');
};

function renderStageOutstanding(rows) {
  const box = document.getElementById('stageOutstanding');
  if (!box) return;
  const stages = ['S1','S2','S3','S4'];
  const active = activeEntries(rows);
  let any = false;
  box.innerHTML = '';
  stages.forEach(st => {
    let d = 0, r = 0;
    active.filter(e => e.stage === st).forEach(e => {
      d += Number(e.amount_due || 0);
      r += Number(e.amount_received || 0);
    });
    if (d || r) any = true;
    const out = Math.max(d - r, 0);
    const cls = out > 0 ? 'y' : (r > 0 ? 'g' : 'b');
    box.innerHTML += `<div class="sc ${cls}" style="padding:12px;">
      <div class="sc-lbl">${st}</div>
      <div class="sc-val" style="font-size:22px;">${fmt(out)}</div>
      <div class="sc-sub">Due ${fmt(d)} · Rec ${fmt(r)}</div>
    </div>`;
  });
  box.style.display = any ? 'grid' : 'none';
}

renderClientEntries = function(rows) {
  const tbody = document.querySelector('#clientLedgerTable tbody');
  tbody.innerHTML = '';
  let list = [...rows].sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  if (currentViewMode) list = list.slice(0, 6);
  list.forEach(e => {
    const tm = e.cases?.tm_no || e.cases?.folder_no || e.cases?.application_name || '—';
    const voided = !!e.voided_at;
    const typeLabel = voided ? e.entry_type + ' · VOID' : e.entry_type;
    const rowStyle = voided ? 'opacity:.45;text-decoration:line-through;' : '';
    const voidBtn = (!voided && e.id)
      ? `<button class="btn sm del" onclick="event.stopPropagation();voidEntry('${e.id}')">Void</button>`
      : '';
    tbody.innerHTML += `<tr class="${e.entry_type}-row" style="${rowStyle}">
      <td class="date-cell">${e.entry_date || ''}</td>
      <td>${typeLabel}</td>
      <td>${e.stage ? `<span class="stage-b ${e.stage.toLowerCase()}">${e.stage}</span>` : '—'}</td>
      <td class="folder-no">${tm}</td>
      <td>${e.details || ''}${e.linked_entry_id ? ' · linked' : ''}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
      <td class="date-cell">${e.receipt_no || ''} ${voidBtn}</td>
    </tr>`;
  });
  if (!list.length) tbody.innerHTML = '<tr><td colspan="8" class="empty">No entries</td></tr>';
};

async function voidEntry(id) {
  if (!confirm('Void this entry? It will be excluded from balances but kept in history.')) return;
  if (!sb) return toast('Supabase required');
  const reason = prompt('Void reason (optional)') || 'voided';
  const { error } = await sb.from('ledger_entries').update({
    voided_at: new Date().toISOString(),
    void_reason: reason
  }).eq('id', id);
  if (error) return toast(error.message + ' — run SQL migration 002_void_and_link.sql');
  toast('Entry voided');
  await loadEntries();
  if (currentClientId) openClientLedger(currentClientId);
  else loadDashboard();
}

const _openChargeModalGaps = openChargeModal;
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
  if (stage !== 'S1' && !tm) return toast('TM number required for ' + stage);
  const tmNorm = normalizeTM(tm);
  const appName = (document.getElementById('chAppName') && document.getElementById('chAppName').value.trim()) || null;
  let caseId = null;
  if (sb) {
    if (tmNorm) {
      let { data: existing } = await sb.from('cases').select('id, application_name, tm_no').eq('tm_no_normalized', tmNorm).eq('client_id', clientId).maybeSingle();
      if (existing) {
        caseId = existing.id;
        if (appName && !existing.application_name) await sb.from('cases').update({ application_name: appName }).eq('id', caseId);
      } else {
        const { data: created, error } = await sb.from('cases').insert({
          client_id: clientId, tm_no: tm, folder_no: document.getElementById('chFolder').value.trim() || null, application_name: appName
        }).select().single();
        if (error) return toast(error.message);
        caseId = created.id;
      }
    } else {
      const folder = document.getElementById('chFolder').value.trim() || null;
      const { data: created, error } = await sb.from('cases').insert({
        client_id: clientId, tm_no: null, folder_no: folder, application_name: appName
      }).select().single();
      if (error) return toast(error.message);
      caseId = created.id;
    }
    const { error: e2 } = await sb.from('ledger_entries').insert({
      client_id: clientId, case_id: caseId,
      entry_date: document.getElementById('chDate').value || today(),
      entry_type: 'charge', stage,
      details: document.getElementById('chDetails').value.trim() || ('Stage ' + stage + ' fee'),
      amount_due: amount
    });
    if (e2) return toast(e2.message);
    toast('Charge posted');
  } else toast('Connect Supabase to save charges');
  closeModal('modalCharge');
  await loadEntries();
  loadDashboard();
  if (currentClientId === clientId) openClientLedger(clientId);
};

const _openReceivingModalGaps = openReceivingModal;
openReceivingModal = function(preClientId) {
  _openReceivingModalGaps(preClientId);
  const sel = document.getElementById('rcClient');
  populateLinkedCharges(preClientId || sel.value);
  sel.onchange = function() { populateLinkedCharges(sel.value); };
};

function populateLinkedCharges(clientId) {
  const sel = document.getElementById('rcLinkedCharge');
  if (!sel) return;
  const charges = activeEntries(mem.entries).filter(e => e.client_id === clientId && e.entry_type === 'charge');
  sel.innerHTML = '<option value="">— None —</option>';
  charges.forEach(e => {
    const tm = e.cases?.tm_no || e.cases?.application_name || '';
    const label = (e.entry_date || '') + ' · ' + (e.stage || '—') + ' · Due ' + fmt(e.amount_due) + ' ' + tm;
    sel.innerHTML += '<option value="' + e.id + '" data-stage="' + (e.stage || '') + '">' + label + '</option>';
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
  const receiptNo = 'R-' + Date.now().toString().slice(-8);
  const linked = (document.getElementById('rcLinkedCharge') && document.getElementById('rcLinkedCharge').value) || null;
  let caseId = null;
  if (sb) {
    if (tm) {
      const tmNorm = normalizeTM(tm);
      let { data: existing } = await sb.from('cases').select('id').eq('tm_no_normalized', tmNorm).eq('client_id', clientId).maybeSingle();
      if (existing) caseId = existing.id;
      else {
        const { data: created } = await sb.from('cases').insert({ client_id: clientId, tm_no: tm }).select().single();
        if (created) caseId = created.id;
      }
    }
    const row = {
      client_id: clientId, case_id: caseId,
      entry_date: document.getElementById('rcDate').value || today(),
      entry_type: 'receiving', stage,
      details: document.getElementById('rcNotes').value.trim() || 'Payment received',
      amount_received: amount,
      payment_method: document.getElementById('rcMethod').value,
      receipt_no: receiptNo
    };
    if (linked) row.linked_entry_id = linked;
    let { data, error } = await sb.from('ledger_entries').insert(row).select().single();
    if (error && linked) {
      delete row.linked_entry_id;
      const r2 = await sb.from('ledger_entries').insert(row).select().single();
      data = r2.data; error = r2.error;
      if (!error) toast('Saved (run migration 002 for charge-link column)');
    }
    if (error) return toast(error.message);
    toast('Receiving saved');
    printReceipt(Object.assign({}, row, { clients: mem.clients.find(c => c.id === clientId), id: data.id }));
  } else toast('Connect Supabase to save');
  closeModal('modalReceiving');
  await loadEntries();
  loadDashboard();
  if (currentClientId === clientId) openClientLedger(clientId);
};

async function openEditCaseModal() {
  if (!currentClientId) return toast('Open a client ledger first');
  if (!sb) return toast('Supabase required');
  const { data: cases } = await sb.from('cases').select('*').eq('client_id', currentClientId).order('created_at', { ascending: false });
  const sel = document.getElementById('ecCaseSelect');
  if (!sel) return toast('Edit case UI missing — hard refresh');
  sel.innerHTML = '';
  (cases || []).forEach(c => {
    const label = (c.tm_no || '(no TM)') + ' · ' + (c.application_name || c.folder_no || c.id.slice(0, 8));
    sel.innerHTML += '<option value="' + c.id + '">' + label + '</option>';
  });
  if (!cases || !cases.length) return toast('No cases for this client yet — post a charge first');
  window._editCases = cases;
  onEditCaseSelect();
  openModal('modalEditCase');
}

function onEditCaseSelect() {
  const id = document.getElementById('ecCaseSelect').value;
  const c = (window._editCases || []).find(x => x.id === id);
  if (!c) return;
  document.getElementById('ecCaseId').value = c.id;
  document.getElementById('ecTM').value = c.tm_no || '';
  document.getElementById('ecFolder').value = c.folder_no || '';
  document.getElementById('ecAppName').value = c.application_name || '';
}

async function saveEditCase() {
  const id = document.getElementById('ecCaseId').value;
  if (!id || !sb) return;
  const payload = {
    tm_no: document.getElementById('ecTM').value.trim() || null,
    folder_no: document.getElementById('ecFolder').value.trim() || null,
    application_name: document.getElementById('ecAppName').value.trim() || null
  };
  const { error } = await sb.from('cases').update(payload).eq('id', id);
  if (error) return toast(error.message);
  toast('Case updated');
  closeModal('modalEditCase');
  await loadEntries();
  if (currentClientId) openClientLedger(currentClientId);
}

loadEntries = async function() {
  if (sb) {
    const { data } = await sb.from('ledger_entries')
      .select('*, clients(client_code, client_name), cases(id, tm_no, folder_no, application_name)')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) mem.entries = data;
  }
};
