// --- Brandex prints v6: small top logo, aligned bank accounts ---
const STAGE_LABEL_P = { S1: 'Stage 1', S2: 'Stage 2', S3: 'Stage 3', S4: 'Stage 4' };
function stageLabelP(s) { return (typeof stageLabel === 'function' ? stageLabel(s) : (STAGE_LABEL_P[s] || s || '—')); }
function stagePill(stage) {
  const label = stageLabelP(stage) || 'General';
  return `<span class="print-pill">${label}</span>`;
}
function tmPill(tm) {
  if (!tm || tm === '—') return '<span class="print-pill muted">No TM</span>';
  return `<span class="print-pill tm">TM ${tm}</span>`;
}

function buildAckHTML(entry, copyLabel) {
  const client = entry.clients || (mem.clients || []).find(c => c.id === entry.client_id) || {};
  const tm = entry.cases?.tm_no || '—';
  const app = entry.cases?.application_name || '—';
  const series = client.series?.code || '';
  return `
  <div class="ack-sheet ack-page print-document">
    <div class="ack-copy-bar"><span class="ack-copy">${copyLabel}</span></div>
    <h1 class="print-document-title">PAYMENT ACKNOWLEDGMENT</h1>

    <div class="print-group">
      <div class="print-group-title">CLIENT</div>
      <div class="print-big">${series ? series + ' · ' : ''}${client.client_code || '—'}</div>
      <div class="print-big-sub">${client.client_name || '—'}</div>
      <div class="print-meta">${client.phone || '—'} · ${client.email || '—'} · ${client.city || '—'}</div>
    </div>

    <div class="print-group">
      <div class="print-group-title">CASE / TM</div>
      <div class="print-pills">${tmPill(tm)} ${stagePill(entry.stage)}</div>
      <div class="print-meta"><strong>Application:</strong> ${app}</div>
    </div>

    <div class="print-group">
      <div class="print-group-title">PAYMENT</div>
      <div class="ack-row"><span>Receipt No</span><span><strong>${entry.receipt_no || '—'}</strong></span></div>
      <div class="ack-row"><span>Entry Date</span><span>${entry.entry_date || ''}</span></div>
      <div class="ack-row"><span>Details / Transfer Date</span><span>${entry.details || ''}</span></div>
      <div class="ack-row total"><span>Amount Received</span><span>PKR ${fmt(entry.amount_received)}</span></div>
    </div>

    <div class="print-signs">
      <div>_________________<br>Received by</div>
      <div>_________________<br>Client / Bearer</div>
    </div>
  </div>`;
}

function printAck(entryId) {
  const entry = mem.entries.find(e => e.id === entryId);
  if (!entry) return toast('Entry not found');
  const area = document.getElementById('printArea');
  if (!area) return toast('Print area missing');
  area.innerHTML = buildAckHTML(entry, 'OFFICE COPY') + buildAckHTML(entry, 'CLIENT COPY');
  area.style.display = 'block';
  document.title = 'Ack_' + (entry.receipt_no || String(entryId).slice(0, 8)) + '_A4';
  setTimeout(function () {
    window.print();
    area.style.display = 'none';
    area.innerHTML = '';
    document.title = 'BRANDEX LAW ASSOCIATE — CLIENT LEDGER';
  }, 200);
}

function printLedgerA4() {
  if (!currentClientId) return toast('Open a client ledger first');
  const c = mem.clients.find(x => x.id === currentClientId) || {};
  let rows = window._ledgerRows || mem.entries.filter(e => e.client_id === currentClientId);
  const caseId = document.getElementById('ledgerCaseFilter')?.value;
  if (caseId) rows = rows.filter(e => e.cases?.id === caseId);
  rows = (typeof activeEntries === 'function') ? activeEntries(rows) : rows.filter(e => !e.voided_at);
  const series = c.series?.code || (mem.series || []).find(s => s.id === c.series_id)?.code || '';

  const byTm = {};
  rows.forEach(e => {
    const key = e.cases?.tm_no || e.cases?.application_name || e.cases?.folder_no || 'General / No TM';
    if (!byTm[key]) byTm[key] = [];
    byTm[key].push(e);
  });

  let body = `<div class="ack-sheet print-document"><h1 class="print-document-title">CLIENT LEDGER</h1>
    <div class="print-group">
      <div class="print-group-title">CLIENT</div>
      <div class="print-big">${series ? series + ' · ' : ''}${c.client_code || '—'}</div>
      <div class="print-big print-client-name">${c.client_name || '—'}</div>
      <div class="print-meta">Phone: ${c.phone || '—'} · Email: ${c.email || '—'} · City: ${c.city || '—'}</div>
    </div>`;

  Object.keys(byTm).sort().forEach(tmKey => {
    const list = byTm[tmKey];
    const stageSet = [...new Set(list.map(e => e.stage).filter(Boolean))];
    body += `<div class="print-group">
      <div class="print-group-title">CASE / PAYMENT</div>
      <div class="print-pills">${tmPill(tmKey === 'General / No TM' ? null : tmKey)} ${stageSet.map(stagePill).join(' ')}</div>
      <table class="print-table">
        <thead><tr>
          <th>Date</th><th>Type</th><th>Stage</th><th>Application</th><th>Details</th><th style="text-align:right;">Due</th><th style="text-align:right;">Rec</th>
        </tr></thead><tbody>`;
    list.forEach(e => {
      body += `<tr>
        <td>${e.entry_date || ''}</td>
        <td><span class="entry-kind ${e.entry_type || ''}">${e.entry_type === 'receiving' ? 'RECEIVING' : 'CHARGE'}</span></td>
        <td>${stagePill(e.stage)}</td>
        <td>${e.cases?.application_name || '—'}</td>
        <td>${e.details || ''}</td>
        <td class="amt">${e.amount_due ? fmt(e.amount_due) : ''}</td>
        <td class="amt">${e.amount_received ? fmt(e.amount_received) : ''}</td>
      </tr>`;
    });
    body += '</tbody></table></div>';
  });
  if (!rows.length) body += '<div class="print-meta" style="text-align:center;">No entries</div>';
  body += '</div>';

  const area = document.getElementById('printArea');
  area.innerHTML = body;
  area.style.display = 'block';
  document.title = (c.client_code || 'Ledger') + '_Ledger_A4';
  setTimeout(() => { window.print(); area.style.display = 'none'; area.innerHTML = ''; document.title = 'BRANDEX LAW ASSOCIATE — CLIENT LEDGER'; }, 200);
}

runReport = function() {
  const safeVal = (id) => { const el = document.getElementById(id); return el ? (el.value || '') : ''; };
  const q = (safeVal('reportSearch') || '').toLowerCase();
  const stage = safeVal('reportStage');
  const clientId = safeVal('reportClient');
  const group = safeVal('reportGroup') || 'client';
  const from = safeVal('reportFrom');
  const to = safeVal('reportTo');
  let list = [...(mem.entries || [])];
  if (typeof activeEntries === 'function') list = activeEntries(list);
  if (clientId) list = list.filter(e => e.client_id === clientId);
  if (stage) list = list.filter(e => e.stage === stage);
  if (from) list = list.filter(e => (e.entry_date || '') >= from);
  if (to) list = list.filter(e => (e.entry_date || '') <= to);
  if (q) list = list.filter(e => {
    const code = (e.clients?.client_code || '').toLowerCase();
    const tm = (e.cases?.tm_no || '').toLowerCase();
    const app = (e.cases?.application_name || '').toLowerCase();
    const det = (e.details || '').toLowerCase();
    return code.includes(q) || tm.includes(q) || app.includes(q) || det.includes(q);
  });
  window._reportRows = list;
  if (typeof selectedRows !== 'undefined') selectedRows.clear();
  const wrap = document.getElementById('reportOutput') || document.getElementById('reportContent');
  if (!wrap) return toast('Report panel missing');

  const groups = {};
  list.forEach(e => {
    let key = '—';
    if (group === 'client') key = (e.clients?.client_code || '—') + ' — ' + (e.clients?.client_name || '');
    else if (group === 'case') key = (e.cases?.tm_no || e.cases?.application_name || e.cases?.folder_no || 'No TM / case');
    else if (group === 'stage') key = stageLabelP(e.stage) || 'General';
    else key = 'All';
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  let html = `<div class="report-overview"><span class="report-eyebrow">REPORT RESULTS</span><strong>${list.length.toLocaleString()} <small>ENTRIES</small></strong><span class="report-range">${from || 'EARLIEST'} — ${to || 'LATEST'}</span></div>`;
  const groupKeys = Object.keys(groups).sort();
  groupKeys.forEach((k, groupIndex) => {
    const groupDue = groups[k].reduce((sum, e) => sum + Number(e.amount_due || 0), 0);
    const groupReceived = groups[k].reduce((sum, e) => sum + Number(e.amount_received || 0), 0);
    html += `<section class="report-group">
      <header class="report-group-head"><div class="report-group-identity"><span class="report-group-mark" aria-hidden="true">${String(groupIndex + 1).padStart(2, '0')}</span><div><h2>${clientDisplayText(k)}</h2><p>${groups[k].length} ${groups[k].length === 1 ? 'ENTRY' : 'ENTRIES'}</p></div></div><div class="report-group-totals"><span>CHARGED <strong>PKR ${fmt(groupDue)}</strong></span><span>RECEIVED <strong>PKR ${fmt(groupReceived)}</strong></span></div>
      <label class="report-select"><input type="checkbox" onchange="toggleGroupChecks(this)"> SELECT GROUP</label></header>
      <div class="report-table-wrap"><table class="lt report-screen-table"><thead><tr>
        <th></th><th>Date</th><th>Client</th><th>Type</th><th>Stage</th><th>TM</th><th>Details</th><th>Due</th><th>Received</th>
      </tr></thead><tbody>`;
    groups[k].forEach(e => { html += reportRowHTML(e); });
    html += '</tbody></table></div></section>';
  });
  if (!Object.keys(groups).length) html = '<div class="report-empty-state"><span>—</span><h2>NO RECORDS MATCH THESE FILTERS</h2><p>Adjust the filters or choose another date range.</p></div>';
  wrap.innerHTML = html;
  toast(list.length + ' row(s)');
};

function reportRowHTML(e) {
  const code = e.clients?.client_code || '—';
  const tm = e.cases?.tm_no || e.cases?.application_name || '—';
  const badge = (typeof stageBadge === 'function') ? stageBadge(e.stage) : (e.stage || '—');
  return `<tr class="${e.entry_type}-row" data-id="${e.id}">
    <td><input type="checkbox" class="row-check" aria-label="Select ${clientDisplayText(code)} ${clientDisplayText(e.entry_date || '')} ${clientDisplayText(e.entry_type)}" value="${e.id}" onchange="toggleRow('${e.id}',this.checked)"></td>
    <td class="date-cell">${e.entry_date || ''}</td>
    <td><strong>${clientDisplayText(code)}</strong></td>
    <td>${e.entry_type}</td>
    <td>${badge}</td>
    <td><strong>${clientDisplayText(tm)}</strong></td>
    <td>${clientDisplayText(e.details || '')}</td>
    <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
    <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
  </tr>`;
}

function resetReportFilters() {
  ['reportSearch', 'reportClient', 'reportStage', 'reportFrom', 'reportTo'].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });
  const group = document.getElementById('reportGroup');
  if (group) group.value = 'client';
  if (typeof selectedRows !== 'undefined') selectedRows.clear();
  runReport();
}

function toggleGroupChecks(el) {
  const table = el.closest('.report-group')?.querySelector('table');
  if (!table) return;
  table.querySelectorAll('.row-check').forEach(cb => {
    cb.checked = el.checked;
    if (typeof toggleRow === 'function') toggleRow(cb.value, el.checked);
  });
}

function printSelectedA4() {
  let list = window._reportRows || mem.entries;
  if (selectedRows.size) list = list.filter(e => selectedRows.has(e.id));
  if (!list.length) return toast('Select rows or run report first');
  printEntriesA4(list, 'Ledger_Selected_A4');
}

function printReportA4() {
  const list = window._reportRows || [];
  if (!list.length) return toast('Run report first');
  printEntriesA4(list, 'Ledger_Report_A4');
}

function printEntriesA4(list, title) {
  const byClient = {};
  (list || []).forEach(e => {
    const ck = (e.clients?.client_code || '—') + ' — ' + (e.clients?.client_name || '');
    if (!byClient[ck]) byClient[ck] = {};
    const tk = e.cases?.tm_no || e.cases?.application_name || 'General';
    if (!byClient[ck][tk]) byClient[ck][tk] = [];
    byClient[ck][tk].push(e);
  });

  let body = `<div class="ack-sheet print-document"><h1 class="print-document-title">LEDGER REPORT</h1>`;
  Object.keys(byClient).sort().forEach(ck => {
    body += `<div class="print-group"><div class="print-group-title">CLIENT</div><div class="print-big">${ck}</div>`;
    Object.keys(byClient[ck]).sort().forEach(tk => {
      const rows = byClient[ck][tk];
      const stages = [...new Set(rows.map(e => e.stage).filter(Boolean))];
      body += `<div class="print-pills" style="margin:8px 0;">${tmPill(tk === 'General' ? null : tk)} ${stages.map(stagePill).join(' ')}</div>
        <table class="print-table report-print-table"><thead><tr>
          <th>Date</th><th>Type</th><th>Stage</th><th>Details</th><th style="text-align:right;">Due</th><th style="text-align:right;">Rec</th>
        </tr></thead><tbody>`;
      rows.forEach(e => {
        body += `<tr>
          <td>${e.entry_date || ''}</td><td><span class="entry-kind ${e.entry_type || ''}">${e.entry_type === 'receiving' ? 'RECEIVING' : 'CHARGE'}</span></td><td>${stagePill(e.stage)}</td>
          <td>${e.details || ''}</td>
          <td class="amt">${e.amount_due ? fmt(e.amount_due) : ''}</td>
          <td class="amt">${e.amount_received ? fmt(e.amount_received) : ''}</td>
        </tr>`;
      });
      body += '</tbody></table>';
    });
    body += '</div>';
  });
  if (!(list || []).length) body += '<div class="print-meta" style="text-align:center;">No rows</div>';
  body += '</div>';

  const area = document.getElementById('printArea');
  area.innerHTML = body;
  area.style.display = 'block';
  document.title = title || 'Ledger_A4';
  setTimeout(() => { window.print(); area.style.display = 'none'; area.innerHTML = ''; document.title = 'BRANDEX LAW ASSOCIATE — CLIENT LEDGER'; }, 200);
}

console.log('Brandex gaps-print v6 loaded (small logo + aligned banks)');
