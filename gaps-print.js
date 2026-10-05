// --- Acknowledgment: 2 copies, A4, branded ---
const STAGE_LABEL_P = { S1: 'Stage 1', S2: 'Stage 2', S3: 'Stage 3', S4: 'Stage 4' };
function stageLabelP(s) { return (typeof stageLabel === 'function' ? stageLabel(s) : (STAGE_LABEL_P[s] || s || '—')); }
const BRAND_P = (typeof BRAND !== 'undefined') ? BRAND : {
  name: 'Brandex Law Associates', email: 'info@brandex.pk', tagline: 'Intellectual Property · Trademarks',
  banks: [{ name: 'Meezan Bank Limited', note: 'Use account details on invoice' }, { name: 'National Bank of Pakistan', note: 'Use account details on invoice' }]
};

function buildAckHTML(entry, copyLabel) {
  const client = entry.clients || mem.clients.find(c => c.id === entry.client_id) || {};
  const tm = entry.cases?.tm_no || '—';
  const app = entry.cases?.application_name || '—';
  return `
  <div class="ack-sheet ack-page">
    <div class="ack-head">
      <div style="display:flex;align-items:center;">
        <img src="assets/brandex-logo-15.png" alt="Brandex" class="ack-logo" onerror="this.style.display='none'">
        <div>
          <div class="ack-brand">${BRAND_P.name}</div>
          <div class="ack-sub">${BRAND_P.tagline || ''}</div>
          <div class="ack-sub">${BRAND_P.email} · brandex.pk</div>
        </div>
      </div>
      <div class="ack-copy">${copyLabel}</div>
    </div>
    <div class="ack-title">PAYMENT ACKNOWLEDGMENT</div>
    <div class="ack-row"><span>Receipt No</span><span>${entry.receipt_no || '—'}</span></div>
    <div class="ack-row"><span>Date</span><span>${entry.entry_date || ''}</span></div>
    <div class="ack-row"><span>Client</span><span>${client.client_code || ''} — ${client.client_name || ''}</span></div>
    <div class="ack-row"><span>Phone</span><span>${client.phone || '—'}</span></div>
    <div class="ack-row"><span>Email</span><span>${client.email || '—'}</span></div>
    <div class="ack-row"><span>TM Number</span><span>${tm}</span></div>
    <div class="ack-row"><span>Application</span><span>${app}</span></div>
    <div class="ack-row"><span>Stage</span><span>${stageLabelP(entry.stage) || 'General'}</span></div>
    <div class="ack-row"><span>Method</span><span>${entry.payment_method || '—'}</span></div>
    <div class="ack-row"><span>Details</span><span>${entry.details || ''}</span></div>
    <div class="ack-row total"><span>Amount Received</span><span>PKR ${fmt(entry.amount_received)}</span></div>
    <div class="ack-banks">
      <strong>Bank payment details</strong><br>
      ${(BRAND_P.banks || []).map(b => b.name + (b.note ? ' — ' + b.note : '')).join('<br>')}
    </div>
    <div style="margin-top:28px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:11px;">
      <div>_________________<br>Received by</div>
      <div>_________________<br>Client / Bearer</div>
    </div>
    <div style="margin-top:16px;text-align:center;font-family:'DM Mono',monospace;font-size:9px;color:#555;">Thank you · ${BRAND_P.name}</div>
  </div>`;
}

function printAck(entryId) {
  const entry = mem.entries.find(e => e.id === entryId);
  if (!entry) return toast('Entry not found');
  const area = document.getElementById('printArea');
  area.innerHTML = buildAckHTML(entry, 'OFFICE COPY') + buildAckHTML(entry, 'CLIENT COPY');
  area.style.display = 'block';
  document.title = 'Ack_' + (entry.receipt_no || entryId.slice(0, 8)) + '_A4';
  setTimeout(() => { window.print(); area.style.display = 'none'; document.title = 'Brandex Law Associates — Client Ledger'; }, 150);
}

function printLedgerA4() {
  if (!currentClientId) return;
  const c = mem.clients.find(x => x.id === currentClientId);
  let rows = window._ledgerRows || mem.entries.filter(e => e.client_id === currentClientId);
  const caseId = document.getElementById('ledgerCaseFilter')?.value;
  if (caseId) rows = rows.filter(e => e.cases?.id === caseId);
  rows = (typeof activeEntries === 'function') ? activeEntries(rows) : rows;
  const name = (c?.client_code || 'Ledger') + '_Ledger_A4';
  let body = `<div class="ack-sheet"><div class="ack-brand">${BRAND_P.name}</div>
    <div class="ack-sub">${BRAND_P.email} · Client Ledger</div>
    <div style="font-family:Bebas Neue;font-size:24px;margin:10px 0;">${c?.client_code || ''} — ${c?.client_name || ''}</div>
    <div class="ack-sub">Phone: ${c?.phone || '—'} · Email: ${c?.email || '—'}</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:11px;">
      <thead><tr style="background:#0C0C0C;color:#FAF6EE;">
        <th style="padding:6px;text-align:left;">Date</th><th>Type</th><th>Stage</th><th>TM</th><th>Details</th><th>Due</th><th>Rec</th>
      </tr></thead><tbody>`;
  rows.forEach(e => {
    body += `<tr style="border-bottom:1px solid #ccc;">
      <td style="padding:5px;">${e.entry_date || ''}</td>
      <td>${e.entry_type}</td><td>${stageLabelP(e.stage)}</td>
      <td>${e.cases?.tm_no || '—'}</td><td>${e.details || ''}</td>
      <td>${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td>${e.amount_received ? fmt(e.amount_received) : ''}</td></tr>`;
  });
  body += '</tbody></table></div>';
  const area = document.getElementById('printArea');
  area.innerHTML = body;
  area.style.display = 'block';
  document.title = name;
  setTimeout(() => { window.print(); area.style.display = 'none'; document.title = 'Brandex Law Associates — Client Ledger'; }, 150);
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
  if (group === 'flat') {
    wrap.innerHTML = `<table class="lt" id="reportTable" style="width:100%;min-width:700px;">
      <thead><tr>
        <th><input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)"></th>
        <th>Date</th><th>Client</th><th>Type</th><th>Stage</th><th>TM</th><th>Details</th><th>Due</th><th>Received</th>
      </tr></thead><tbody></tbody></table>`;
    const tbody = wrap.querySelector('tbody');
    list.forEach(e => { tbody.innerHTML += reportRowHTML(e); });
    if (!list.length) tbody.innerHTML = '<tr><td colspan="9" class="empty">No rows</td></tr>';
  } else {
    const groups = {};
    list.forEach(e => {
      let key = '—';
      if (group === 'client') key = (e.clients?.client_code || '—') + ' — ' + (e.clients?.client_name || '');
      else if (group === 'case') key = (e.cases?.tm_no || e.cases?.application_name || e.cases?.folder_no || 'No TM / case');
      else if (group === 'stage') key = stageLabelP(e.stage) || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    let html = '';
    Object.keys(groups).sort().forEach(k => {
      html += `<div class="report-group"><h3>${k} <span style="font-size:12px;color:var(--muted);">(${groups[k].length})</span>
        <label style="font-size:11px;margin-left:8px;"><input type="checkbox" onchange="toggleGroupChecks(this)"> all</label></h3>
        <table class="lt" style="width:100%;min-width:640px;"><thead><tr>
          <th></th><th>Date</th><th>Client</th><th>Type</th><th>Stage</th><th>TM</th><th>Details</th><th>Due</th><th>Received</th>
        </tr></thead><tbody>`;
      groups[k].forEach(e => { html += reportRowHTML(e); });
      html += '</tbody></table></div>';
    });
    if (!Object.keys(groups).length) html = '<div class="empty">No rows match filters</div>';
    wrap.innerHTML = html;
  }
  toast(list.length + ' row(s)');
};

function reportRowHTML(e) {
  const code = e.clients?.client_code || '—';
  const tm = e.cases?.tm_no || e.cases?.application_name || '—';
  const badge = (typeof stageBadge === 'function') ? stageBadge(e.stage) : (e.stage || '—');
  return `<tr class="${e.entry_type}-row" data-id="${e.id}">
    <td><input type="checkbox" class="row-check" value="${e.id}" onchange="toggleRow('${e.id}',this.checked)"></td>
    <td class="date-cell">${e.entry_date || ''}</td>
    <td>${code}</td>
    <td>${e.entry_type}</td>
    <td>${badge}</td>
    <td>${tm}</td>
    <td>${e.details || ''}${e.payment_method ? ' · ' + e.payment_method : ''}</td>
    <td class="amt-due">${e.amount_due ? fmt(e.amount_due) : ''}</td>
    <td class="amt-rec">${e.amount_received ? fmt(e.amount_received) : ''}</td>
  </tr>`;
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
  let body = `<div class="ack-sheet"><div class="ack-brand">${BRAND_P.name}</div>
    <div class="ack-sub">${BRAND_P.email} · Ledger export · A4</div>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:10px;">
      <thead><tr style="background:#0C0C0C;color:#FAF6EE;">
        <th style="padding:5px;text-align:left;">Date</th><th>Client</th><th>Type</th><th>Stage</th><th>TM</th><th>Details</th><th>Due</th><th>Rec</th>
      </tr></thead><tbody>`;
  list.forEach(e => {
    body += `<tr style="border-bottom:1px solid #ccc;">
      <td style="padding:4px;">${e.entry_date || ''}</td>
      <td>${e.clients?.client_code || '—'}</td>
      <td>${e.entry_type}</td><td>${stageLabelP(e.stage)}</td>
      <td>${e.cases?.tm_no || '—'}</td><td>${e.details || ''}</td>
      <td>${e.amount_due ? fmt(e.amount_due) : ''}</td>
      <td>${e.amount_received ? fmt(e.amount_received) : ''}</td></tr>`;
  });
  body += '</tbody></table></div>';
  const area = document.getElementById('printArea');
  area.innerHTML = body;
  area.style.display = 'block';
  document.title = title;
  setTimeout(() => { window.print(); area.style.display = 'none'; document.title = 'Brandex Law Associates — Client Ledger'; }, 150);
}

console.log('Brandex gaps-print loaded');
