// ============================================================
// CONFIG — set your Supabase project keys
// ============================================================
const SUPABASE_URL = localStorage.getItem('bx_supabase_url') || 'https://addiipgeoqdgrjbgytta.supabase.co';
const SUPABASE_ANON = localStorage.getItem('bx_supabase_anon') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkZGlpcGdlb3FkZ3JqYmd5dHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNjQ2MTUsImV4cCI6MjEwNjY0MDYxNX0.gIYzWCQ_12K0I3G8VwfbebgdKVF9duawdPuXozL7rLM';

let sb = null;
if (SUPABASE_URL && SUPABASE_ANON) {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
}

let mem = {
  series: [
    { id: 's1', code: 'A', name: 'A-Series', prefix: 'A-' },
    { id: 's2', code: 'X', name: 'X-Series', prefix: 'X-' }
  ],
  clients: [],
  rates: {},
  cases: [],
  entries: []
};

let currentClientId = null;
let currentViewMode = false;
let selectedRows = new Set();

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function fmt(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-PK', { maximumFractionDigits: 0 });
}
function normalizeTM(tm) {
  if (!tm) return null;
  const d = String(tm).replace(/[^0-9]/g, '');
  return d || null;
}
async function lookupCaseByTM(tm) {
  const tmNorm = normalizeTM(tm);
  if (!tmNorm || !sb) return null;
  const { data } = await sb.from('cases')
    .select('id, tm_no, application_name, folder_no, client_id, clients(client_code, client_name)')
    .eq('tm_no_normalized', tmNorm)
    .maybeSingle();
  return data;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openModal(id) { document.getElementById(id).classList.add('open'); }

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`.ni[data-page="${name}"]`);
  if (nav) nav.classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'clients') renderClients();
}

document.querySelectorAll('.ni').forEach(ni => {
  ni.addEventListener('click', () => showPage(ni.dataset.page));
});

async function loadSeries() {
  if (sb) {
    const { data, error } = await sb.from('series').select('*').order('sort_order');
    if (error) return toast('Could not load series: ' + error.message);
    if (data) mem.series = data;
  }
  const sel = document.getElementById('seriesFilter');
  const cSeries = document.getElementById('cSeries');
  if (sel) {
    sel.innerHTML = '<option value="">All Series</option>';
    mem.series.forEach(s => { sel.innerHTML += `<option value="${s.id}">${s.code} — ${s.name}</option>`; });
  }
  if (cSeries) {
    cSeries.innerHTML = '';
    mem.series.forEach(s => { cSeries.innerHTML += `<option value="${s.id}">${s.code} — ${s.name}</option>`; });
  }
}

async function loadClients() {
  if (sb) {
    const { data, error } = await sb.from('clients').select('*, series(code), client_stage_rates(*)').order('client_code');
    if (error) return toast('Could not load clients: ' + error.message);
    if (data) {
      mem.clients = data;
      mem.rates = {};
      data.forEach(c => {
        mem.rates[c.id] = {};
        (c.client_stage_rates || []).forEach(r => { mem.rates[c.id][r.stage] = r.amount; });
      });
    }
  }
}

async function loadEntries() {
  if (sb) {
    const { data, error } = await sb.from('ledger_entries')
      .select('*, clients(client_code, client_name), cases(tm_no, folder_no, application_name)')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) return toast('Could not load ledger entries: ' + error.message);
    if (data) mem.entries = data;
  }
}

async function loadDashboard() {
  await Promise.all([loadSeries(), loadClients(), loadEntries()]);
  const clients = mem.clients.length;
  let due = 0, rec = 0;
  mem.entries.forEach(e => {
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
  mem.entries.slice(0, 10).forEach(e => {
    const code = e.clients?.client_code || '—';
    const tm = e.cases?.tm_no || e.cases?.application_name || e.details || '—';
    tbody.innerHTML += `<tr class="${e.entry_type}-row">
      <td class="date-cell">${e.entry_date || ''}</td>
      <td>${code}</td>
      <td>${e.entry_type}</td>
      <td>${e.stage ? `<span class="stage-b ${e.stage.toLowerCase()}">${e.stage}</span>` : '—'}</td>
      <td>${tm}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
    </tr>`;
  });
  if (!mem.entries.length) tbody.innerHTML = '<tr><td colspan="7" class="empty">No entries yet — add a client, then post a charge or receiving</td></tr>';
}

function renderClients() {
  const q = (document.getElementById('clientSearch').value || '').toLowerCase();
  const seriesId = document.getElementById('seriesFilter').value;
  const grid = document.getElementById('clientsGrid');
  grid.innerHTML = '';
  let list = mem.clients;
  if (seriesId) list = list.filter(c => c.series_id === seriesId);
  if (q) list = list.filter(c =>
    (c.client_code || '').toLowerCase().includes(q) ||
    (c.client_name || '').toLowerCase().includes(q) ||
    (c.city || '').toLowerCase().includes(q)
  );
  if (!list.length) {
    grid.innerHTML = '<div class="empty">No clients yet. Click + New Client to start.</div>';
    return;
  }
  list.forEach(c => {
    const seriesCode = c.series?.code || mem.series.find(s => s.id === c.series_id)?.code || '—';
    let due = 0, rec = 0;
    mem.entries.filter(e => e.client_id === c.id).forEach(e => {
      due += Number(e.amount_due || 0);
      rec += Number(e.amount_received || 0);
    });
    const bal = Number(c.header_balance || 0) + due - rec;
    const balCls = bal > 0 ? 'neg' : bal < 0 ? 'pos' : '';
    grid.innerHTML += `
      <div class="client-card" onclick="openClientLedger('${c.id}')">
        <div class="cc-top">
          <div class="cc-no">${c.client_code}</div>
          <div class="cc-series">${seriesCode}</div>
        </div>
        <div class="cc-name">${c.client_name || '—'}</div>
        <div class="cc-divider"></div>
        <div class="cc-row"><span>City</span><span>${c.city || '—'}</span></div>
        <div class="cc-row"><span>Balance</span><span class="cc-bal ${balCls}">${fmt(bal)}</span></div>
      </div>`;
  });
}

async function openClientLedger(clientId) {
  currentClientId = clientId;
  currentViewMode = false;
  const c = mem.clients.find(x => x.id === clientId);
  if (!c) return;
  document.getElementById('ledgerTitle').textContent = c.client_code + ' · Ledger';
  document.getElementById('lhCode').textContent = c.client_code;
  document.getElementById('lhName').textContent = c.client_name || '—';
  let due = 0, rec = 0;
  const rows = mem.entries.filter(e => e.client_id === clientId);
  rows.forEach(e => { due += Number(e.amount_due || 0); rec += Number(e.amount_received || 0); });
  const bal = Number(c.header_balance || 0) + due - rec;
  document.getElementById('lhBal').textContent = fmt(bal);
  renderClientEntries(rows);
  showPage('ledger');
}

function renderClientEntries(rows) {
  const tbody = document.querySelector('#clientLedgerTable tbody');
  tbody.innerHTML = '';
  let list = [...rows].sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
  if (currentViewMode) list = list.slice(0, 6);
  list.forEach(e => {
    const tm = e.cases?.tm_no || e.cases?.folder_no || e.cases?.application_name || '—';
    tbody.innerHTML += `<tr class="${e.entry_type}-row">
      <td class="date-cell">${e.entry_date || ''}</td>
      <td>${e.entry_type}</td>
      <td>${e.stage ? `<span class="stage-b ${e.stage.toLowerCase()}">${e.stage}</span>` : '—'}</td>
      <td class="folder-no">${tm}</td>
      <td>${e.details || ''}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
      <td class="date-cell">${e.receipt_no || ''}</td>
    </tr>`;
  });
  if (!list.length) tbody.innerHTML = '<tr><td colspan="8" class="empty">No entries</td></tr>';
}

function toggleCurrentView() {
  currentViewMode = !currentViewMode;
  toast(currentViewMode ? 'Current view: last entry + 5 previous' : 'Full ledger');
  openClientLedger(currentClientId);
}

function openClientModal() {
  document.getElementById('cCode').value = '';
  document.getElementById('cName').value = '';
  document.getElementById('cCity').value = '';
  document.getElementById('cHeader').value = '0';
  document.getElementById('cBank').value = '';
  document.getElementById('cIban').value = '';
  document.getElementById('rS1').value = '0';
  document.getElementById('rS2').value = '0';
  document.getElementById('rS3').value = '0';
  document.getElementById('rS4').value = '0';
  openModal('modalClient');
}

async function saveClient() {
  const code = document.getElementById('cCode').value.trim();
  if (!code) return toast('Client code required');
  const payload = {
    series_id: document.getElementById('cSeries').value || null,
    client_code: code,
    client_name: document.getElementById('cName').value.trim(),
    city: document.getElementById('cCity').value.trim(),
    header_balance: Number(document.getElementById('cHeader').value) || 0,
    bank_name: document.getElementById('cBank').value.trim(),
    bank_iban: document.getElementById('cIban').value.trim()
  };
  const rates = {
    S1: Number(document.getElementById('rS1').value) || 0,
    S2: Number(document.getElementById('rS2').value) || 0,
    S3: Number(document.getElementById('rS3').value) || 0,
    S4: Number(document.getElementById('rS4').value) || 0
  };
  if (sb) {
    const { data, error } = await sb.from('clients').insert(payload).select().single();
    if (error) return toast(error.message);
    const rateRows = Object.entries(rates).map(([stage, amount]) => ({ client_id: data.id, stage, amount }));
    await sb.from('client_stage_rates').upsert(rateRows, { onConflict: 'client_id,stage' });
    toast('Client saved');
  } else {
    const id = 'c' + Date.now();
    mem.clients.push({ id, ...payload, series: mem.series.find(s => s.id === payload.series_id) });
    mem.rates[id] = rates;
    toast('Client saved (local)');
  }
  closeModal('modalClient');
  await loadClients();
  renderClients();
  loadDashboard();
}

function openChargeModal(preClientId) {
  const sel = document.getElementById('chClient');
  const activeClients = mem.clients.filter(c => c.is_active !== false);
  if (preClientId && !activeClients.some(c => c.id === preClientId)) return toast('THIS CLIENT IS INACTIVE. RESTORE IT BEFORE POSTING A CHARGE.');
  if (!activeClients.length) return toast('CREATE OR RESTORE AN ACTIVE CLIENT FIRST.');
  sel.innerHTML = activeClients.map(c => `<option value="${c.id}">${c.client_code} — ${c.client_name || ''}</option>`).join('');
  if (preClientId) sel.value = preClientId;
  document.getElementById('chTM').value = '';
  document.getElementById('chFolder').value = '';
  document.getElementById('chStage').value = 'S1';
  document.getElementById('chAmount').value = '';
  document.getElementById('chDetails').value = '';
  document.getElementById('chDate').value = today();
  onChargeClientChange();
  openModal('modalCharge');
  bindTMLookup('chTM', 'chTMInfo');
}
function onChargeClientChange() { applyStageRate(); }
function applyStageRate() {
  const clientId = document.getElementById('chClient').value;
  const stage = document.getElementById('chStage').value;
  const rate = (mem.rates[clientId] || {})[stage];
  if (rate != null) document.getElementById('chAmount').value = rate;
}

async function saveCharge() {
  const clientId = document.getElementById('chClient').value;
  const tm = document.getElementById('chTM').value.trim();
  const stage = document.getElementById('chStage').value;
  const amount = Number(document.getElementById('chAmount').value);
  if (!clientId || !amount) return toast('Client and amount required');
  // TM required for S2–S4; Stage 1 (filing) may not have TM yet
  if (stage !== 'S1' && !tm) return toast('TM number required for ' + stage + ' (allotted from Acknowledgment onward)');

  const tmNorm = normalizeTM(tm);
  let caseId = null;

  if (sb) {
    if (tmNorm) {
      let { data: existing } = await sb.from('cases').select('id, application_name, tm_no').eq('tm_no_normalized', tmNorm).eq('client_id', clientId).maybeSingle();
      if (existing) caseId = existing.id;
      else {
        const { data: created, error } = await sb.from('cases').insert({
          client_id: clientId, tm_no: tm, folder_no: document.getElementById('chFolder').value.trim() || null
        }).select().single();
        if (error) return toast(error.message);
        caseId = created.id;
      }
    } else {
      // Stage 1 pre-TM: placeholder case (folder only)
      const folder = document.getElementById('chFolder').value.trim() || null;
      const { data: created, error } = await sb.from('cases').insert({
        client_id: clientId, tm_no: null, folder_no: folder
      }).select().single();
      if (error) return toast(error.message);
      caseId = created.id;
    }
    const { error: e2 } = await sb.from('ledger_entries').insert({
      client_id: clientId,
      case_id: caseId,
      entry_date: document.getElementById('chDate').value || today(),
      entry_type: 'charge',
      stage,
      details: document.getElementById('chDetails').value.trim() || `Stage ${stage} fee`,
      amount_due: amount
    });
    if (e2) return toast(e2.message);
    toast('Charge posted');
  } else {
    toast('Connect Supabase to save charges');
  }
  closeModal('modalCharge');
  await loadEntries();
  loadDashboard();
  if (currentClientId === clientId) openClientLedger(clientId);
}

function bindTMLookup(inputId, infoId) {
  const el = document.getElementById(inputId);
  if (!el || el.dataset.bound) return;
  el.dataset.bound = '1';
  el.addEventListener('blur', async () => {
    const data = await lookupCaseByTM(el.value);
    let info = document.getElementById(infoId);
    if (!info) {
      info = document.createElement('div');
      info.id = infoId;
      info.style.cssText = 'font-family:DM Mono,monospace;font-size:11px;margin-top:6px;padding:8px;border:2px solid var(--black);background:var(--bg-alt);';
      el.parentElement.appendChild(info);
    }
    if (data) {
      const name = data.application_name || '—';
      const client = data.clients ? (data.clients.client_code + ' · ' + (data.clients.client_name || '')) : '—';
      info.innerHTML = '<strong>MATCH</strong> · App: ' + name + ' · Client: ' + client + (data.folder_no ? ' · Folder: ' + data.folder_no : '');
      info.style.borderColor = 'var(--accent2)';
    } else if (el.value.trim()) {
      info.textContent = 'No existing case for this TM — will create on save';
      info.style.borderColor = 'var(--accent3)';
    } else {
      info.textContent = '';
    }
  });
}

function openReceivingModal(preClientId) {
  const sel = document.getElementById('rcClient');
  const activeClients = mem.clients.filter(c => c.is_active !== false);
  if (preClientId && !activeClients.some(c => c.id === preClientId)) return toast('THIS CLIENT IS INACTIVE. RESTORE IT BEFORE POSTING A RECEIVING.');
  if (!activeClients.length) return toast('CREATE OR RESTORE AN ACTIVE CLIENT FIRST.');
  sel.innerHTML = activeClients.map(c => `<option value="${c.id}">${c.client_code} — ${c.client_name || ''}</option>`).join('');
  if (preClientId) sel.value = preClientId;
  document.getElementById('rcTM').value = '';
  document.getElementById('rcStage').value = '';
  document.getElementById('rcAmount').value = '';
  document.getElementById('rcMethod').value = 'Cash';
  document.getElementById('rcDate').value = today();
  document.getElementById('rcNotes').value = '';
  openModal('modalReceiving');
  bindTMLookup('rcTM', 'rcTMInfo');
}

async function saveReceiving() {
  const clientId = document.getElementById('rcClient').value;
  const amount = Number(document.getElementById('rcAmount').value);
  if (!clientId || !amount) return toast('Client and amount required');

  const tm = document.getElementById('rcTM').value.trim();
  const stage = document.getElementById('rcStage').value || null;
  const receiptNo = 'R-' + Date.now().toString().slice(-8);
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
      client_id: clientId,
      case_id: caseId,
      entry_date: document.getElementById('rcDate').value || today(),
      entry_type: 'receiving',
      stage,
      details: document.getElementById('rcNotes').value.trim() || 'Payment received',
      amount_received: amount,
      payment_method: document.getElementById('rcMethod').value,
      receipt_no: receiptNo
    };
    const { data, error } = await sb.from('ledger_entries').insert(row).select().single();
    if (error) return toast(error.message);
    toast('Receiving saved');
    printReceipt({ ...row, clients: mem.clients.find(c => c.id === clientId), id: data.id });
  } else {
    toast('Connect Supabase to save');
  }
  closeModal('modalReceiving');
  await loadEntries();
  loadDashboard();
  if (currentClientId === clientId) openClientLedger(clientId);
}

function printReceipt(entry) {
  const client = entry.clients || mem.clients.find(c => c.id === entry.client_id) || {};
  const area = document.getElementById('printArea');
  if (!area) return toast('Print area missing');
  area.innerHTML = `<div class="ack-sheet print-document">${window.BRANDEX_PRINT_HEADER('PAYMENT ACKNOWLEDGMENT')}
    <div class="print-group"><div class="print-group-title">Client</div><div class="print-big">${clientDisplayText(client.client_code || '—')}</div><div class="print-big-sub">${clientDisplayText(client.client_name || '—')}</div></div>
    <div class="print-group"><div class="print-group-title">Payment details</div>
      <div class="ack-row"><span>Receipt No</span><strong>${clientDisplayText(entry.receipt_no || '—')}</strong></div>
      <div class="ack-row"><span>Date</span><strong>${clientDisplayText(entry.entry_date || '—')}</strong></div>
      <div class="ack-row"><span>Stage</span><strong>${clientDisplayText(entry.stage || 'General')}</strong></div>
      <div class="ack-row"><span>Details</span><strong>${clientDisplayText(entry.details || '—')}</strong></div>
      <div class="ack-row total"><span>Amount received</span><strong>PKR ${fmt(entry.amount_received)}</strong></div>
    </div><div class="print-signs"><div>_________________<br>Received by</div><div>_________________<br>Client / Bearer</div></div>${window.BRANDEX_PRINT_FOOTER()}
  </div>`;
  area.style.display = 'block';
  document.title = 'Receipt_' + (entry.receipt_no || String(entry.id).slice(0, 8)) + '_A4';
  setTimeout(() => { window.print(); area.style.display = 'none'; area.innerHTML = ''; document.title = 'BRANDEX LAW ASSOCIATE — CLIENT LEDGER'; }, 200);
}
function printLedger() {
  if (currentClientId && typeof printLedgerA4 === 'function') return printLedgerA4();
  const rows = window._reportRows || (typeof activeEntries === 'function' ? activeEntries(mem.entries || []) : (mem.entries || []));
  if (rows.length && typeof printEntriesA4 === 'function') return printEntriesA4(rows, 'Ledger_A4');
  return toast('OPEN A CLIENT LEDGER OR RUN A REPORT FIRST');
}

function runReport() {
  const q = (document.getElementById('reportSearch').value || '').toLowerCase();
  const stage = document.getElementById('reportStage').value;
  let list = [...mem.entries];
  if (stage) list = list.filter(e => e.stage === stage);
  if (q) list = list.filter(e => {
    const code = (e.clients?.client_code || '').toLowerCase();
    const tm = (e.cases?.tm_no || '').toLowerCase();
    const det = (e.details || '').toLowerCase();
    return code.includes(q) || tm.includes(q) || det.includes(q);
  });
  const tbody = document.querySelector('#reportTable tbody');
  tbody.innerHTML = '';
  selectedRows.clear();
  list.forEach(e => {
    const code = e.clients?.client_code || '—';
    const tm = e.cases?.tm_no || '—';
    tbody.innerHTML += `<tr class="${e.entry_type}-row" data-id="${e.id}">
      <td><input type="checkbox" class="row-check" value="${e.id}" onchange="toggleRow('${e.id}',this.checked)"></td>
      <td class="date-cell">${e.entry_date || ''}</td>
      <td>${code}</td>
      <td>${e.entry_type}</td>
      <td>${e.stage || '—'}</td>
      <td>${tm}</td>
      <td>${e.details || ''}</td>
      <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
    </tr>`;
  });
  if (!list.length) tbody.innerHTML = '<tr><td colspan="9" class="empty">No rows</td></tr>';
}
function toggleRow(id, checked) { if (checked) selectedRows.add(id); else selectedRows.delete(id); }
function toggleSelectAll(el) {
  document.querySelectorAll('.row-check').forEach(cb => { cb.checked = el.checked; toggleRow(cb.value, el.checked); });
}
function exportCSV(selectedOnly) {
  let list = mem.entries;
  if (selectedOnly) list = list.filter(e => selectedRows.has(e.id));
  if (!list.length) return toast('Nothing to export');
  const header = ['Date','Client','Type','Stage','TM','Details','Amount Due','Amount Received','Receipt No'].map(value => value.toUpperCase());
  const rows = list.map(e => [e.entry_date||'', e.clients?.client_code||'', e.entry_type, e.stage||'', e.cases?.tm_no||'', (e.details||'').replace(/,/g,' '), e.amount_due||'', e.amount_received||'', e.receipt_no||'']
    .map(value => typeof value === 'string' ? value.toUpperCase() : value));
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `brandex-ledger-${today()}.csv`;
  a.click();
  toast('CSV downloaded');
}
function exportImage() {
  toast('Use Print → Save as PDF for now');
  if (currentClientId && typeof printLedgerA4 === 'function') return printLedgerA4();
  const rows = window._reportRows || [];
  if (rows.length && typeof printEntriesA4 === 'function') return printEntriesA4(rows, 'Ledger_Export_A4');
  return toast('RUN A REPORT FIRST');
}

(async function init() {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.warn('Supabase keys not set');
    toast('Local mode — keys missing');
  } else {
    toast('Connected to Supabase');
  }
  await loadSeries();
  await loadClients();
  await loadEntries();
  loadDashboard();
})();
