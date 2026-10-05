// --- Brandex prints v5: brand card, dark-orange, full payment accounts ---
const STAGE_LABEL_P = { S1: 'Stage 1', S2: 'Stage 2', S3: 'Stage 3', S4: 'Stage 4' };
function stageLabelP(s) { return (typeof stageLabel === 'function' ? stageLabel(s) : (STAGE_LABEL_P[s] || s || '—')); }
const BRAND_P = (typeof BRAND !== 'undefined') ? BRAND : {
  name: 'Brandex Law Associates', email: 'info@brandex.pk', tagline: 'TRADEMARK REGISTRY',
  banks: [
    { name: 'United Bank Limited (UBL)', title: 'Brandex Pk', account: '0209301813886', iban: 'PK85UNIL0109000301813886' },
    { name: 'Meezan Bank Limited', title: 'Brandex.pk', account: '9814-0104862477', iban: 'PK12MEZN0098140104862477' }
  ],
  online: [
    { name: 'EasyPaisa', title: 'EHTASHAM UD DIN SIDDIQUI', account: '0336-0015009', note: 'Merchant Till 214114' },
    { name: 'JazzCash / Raast ID', title: 'EHTASHAM UD DIN SIDDIQUI', account: '0336-0015004' }
  ]
};
const PRINT_CARD = 'assets/brandex-social-preview-20261003.png';
const DARK_ORANGE = '#8B3A00';
const THEME_GREEN = '#0D9970';
const ACCENT_ORANGE = '#C94A00';

function printBrandHeader(subtitle) {
  const logo = 'assets/brandex-logo-15.png';
  return `<div class="print-card-wrap">
    <img src="${PRINT_CARD}" alt="Brandex Law Associates" class="print-card-img" onerror="this.style.display='none'">
    <div class="print-card-fallback">
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:6px;">
        <img src="${logo}" alt="" style="width:44px;height:44px;border-radius:50%;border:2px solid #8B3A00;" onerror="this.style.display='none'">
        <div class="print-brand">${BRAND_P.name}</div>
      </div>
      <div class="print-sub" style="color:${ACCENT_ORANGE};font-weight:700;">${BRAND_P.tagline || 'TRADEMARK REGISTRY'}</div>
      <div class="print-sub">${BRAND_P.email} · brandex.pk</div>
    </div>
    ${subtitle ? `<div class="print-subtitle">${subtitle}</div>` : ''}
  </div>`;
}

function stagePill(stage) {
  const label = stageLabelP(stage) || 'General';
  return `<span class="print-pill">${label}</span>`;
}
function tmPill(tm) {
  if (!tm || tm === '—') return '<span class="print-pill muted">No TM</span>';
  return `<span class="print-pill tm">TM ${tm}</span>`;
}

function paymentAccountsHTML() {
  const banks = BRAND_P.banks || [];
  const online = BRAND_P.online || [];
  let h = '<div class="ack-banks"><div class="print-group-title" style="margin-bottom:8px;">BANK ACCOUNTS</div>';
  banks.forEach(b => {
    h += `<div class="pay-acct"><strong>${b.name}</strong><br>
      Title: ${b.title || '—'} · AC#: ${b.account || '—'}<br>
      IBAN: ${b.iban || '—'}</div>`;
  });
  if (online.length) {
    h += '<div class="print-group-title" style="margin:12px 0 8px;">ONLINE / WALLET</div>';
    online.forEach(o => {
      h += `<div class="pay-acct"><strong>${o.name}</strong><br>
        ${o.title || ''} · ${o.account || ''}${o.note ? '<br>' + o.note : ''}</div>`;
    });
  }
  h += '</div>';
  return h;
}

function buildAckHTML(entry, copyLabel) {
  const client = entry.clients || (mem.clients || []).find(c => c.id === entry.client_id) || {};
  const tm = entry.cases?.tm_no || '—';
  const app = entry.cases?.application_name || '—';
  const series = client.series?.code || '';
  return `
  <div class="ack-sheet ack-page">
    ${printBrandHeader('PAYMENT ACKNOWLEDGMENT')}
    <div class="ack-copy-bar"><span class="ack-copy">${copyLabel}</span></div>

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
      <div class="ack-row"><span>Payment Method</span><span><strong>${entry.payment_method || '—'}</strong></span></div>
      <div class="ack-row"><span>Details / Transfer Date</span><span>${entry.details || ''}</span></div>
      <div class="ack-row total"><span>Amount Received</span><span>PKR ${fmt(entry.amount_received)}</span></div>
    </div>

    ${paymentAccountsHTML()}
    <div class="print-signs">
      <div>_________________<br>Received by</div>
      <div>_________________<br>Client / Bearer</div>
    </div>
    <div class="print-thanks">Thank you · ${BRAND_P.name} · brandex.pk</div>
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
    document.title = 'Brandex Law Associates — Client Ledger';
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

  let body = `<div class="ack-sheet">
    ${printBrandHeader('CLIENT LEDGER · A4')}
    <div class="print-group">
      <div class="print-group-title">CLIENT</div>
      <div class="print-big">${series ? series + ' · ' : ''}${c.client_code || '—'}</div>
      <div class="print-big-sub">${c.client_name || '—'}</div>
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
          <th>Date</th><th>Type</th><th>Stage</th><th>Details</th><th style="text-align:right;">Due</th><th style="text-align:right;">Rec</th>
        </tr></thead><tbody>`;
    list.forEach(e => {
      body += `<tr>
        <td>${e.entry_date || ''}</td>
        <td>${e.entry_type || ''}</td>
        <td>${stagePill(e.stage)}</td>
        <td>${e.details || ''}${e.payment_method ? ' · ' + e.payment_method : ''}</td>
        <td class="amt">${e.amount_due ? fmt(e.amount_due) : ''}</td>
        <td class="amt">${e.amount_received ? fmt(e.amount_received) : ''}</td>
      </tr>`;
    });
    body += '</tbody></table></div>';
  });
  if (!rows.length) body += '<div class="print-meta" style="text-align:center;">No entries</div>';
  body += paymentAccountsHTML() + '</div>';

  const area = document.getElementById('printArea');
  area.innerHTML = body;
  area.style.display = 'block';
  document.title = (c.client_code || 'Ledger') + '_Ledger_A4';
  setTimeout(() => { window.print(); area.style.display = 'none'; area.innerHTML = ''; document.title = 'Brandex Law Associates — Client Ledger'; }, 200);
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
  let html = '';
  Object.keys(groups).sort().forEach(k => {
    html += `<div class="report-group report-divider">
      <h3><strong>${k}</strong> <span style="font-size:12px;color:var(--muted);">(${groups[k].length})</span>
      <label style="font-size:11px;margin-left:8px;"><input type="checkbox" onchange="toggleGroupChecks(this)"> all</label></h3>
      <table class="lt" style="width:100%;min-width:640px;"><thead><tr>
        <th></th><th>Date</th><th>Client</th><th>Type</th><th>Stage</th><th>TM</th><th>Details</th><th>Due</th><th>Received</th>
      </tr></thead><tbody>`;
    groups[k].forEach(e => { html += reportRowHTML(e); });
    html += '</tbody></table></div>';
  });
  if (!Object.keys(groups).length) html = '<div class="empty">No rows match filters</div>';
  wrap.innerHTML = html;
  toast(list.length + ' row(s)');
};

function reportRowHTML(e) {
  const code = e.clients?.client_code || '—';
  const tm = e.cases?.tm_no || e.cases?.application_name || '—';
  const badge = (typeof stageBadge === 'function') ? stageBadge(e.stage) : (e.stage || '—');
  return `<tr class="${e.entry_type}-row" data-id="${e.id}">
    <td><input type="checkbox" class="row-check" value="${e.id}" onchange="toggleRow('${e.id}',this.checked)"></td>
    <td class="date-cell">${e.entry_date || ''}</td>
    <td><strong>${code}</strong></td>
    <td>${e.entry_type}</td>
    <td>${badge}</td>
    <td><strong>${tm}</strong></td>
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
  const byClient = {};
  (list || []).forEach(e => {
    const ck = (e.clients?.client_code || '—') + ' — ' + (e.clients?.client_name || '');
    if (!byClient[ck]) byClient[ck] = {};
    const tk = e.cases?.tm_no || e.cases?.application_name || 'General';
    if (!byClient[ck][tk]) byClient[ck][tk] = [];
    byClient[ck][tk].push(e);
  });

  let body = `<div class="ack-sheet">${printBrandHeader('LEDGER EXPORT · A4')}`;
  Object.keys(byClient).sort().forEach(ck => {
    body += `<div class="print-group"><div class="print-group-title">CLIENT</div><div class="print-big">${ck}</div>`;
    Object.keys(byClient[ck]).sort().forEach(tk => {
      const rows = byClient[ck][tk];
      const stages = [...new Set(rows.map(e => e.stage).filter(Boolean))];
      body += `<div class="print-pills" style="margin:8px 0;">${tmPill(tk === 'General' ? null : tk)} ${stages.map(stagePill).join(' ')}</div>
        <table class="print-table"><thead><tr>
          <th>Date</th><th>Type</th><th>Stage</th><th>Details</th><th style="text-align:right;">Due</th><th style="text-align:right;">Rec</th>
        </tr></thead><tbody>`;
      rows.forEach(e => {
        body += `<tr>
          <td>${e.entry_date || ''}</td><td>${e.entry_type || ''}</td><td>${stagePill(e.stage)}</td>
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
  body += paymentAccountsHTML() + '</div>';

  const area = document.getElementById('printArea');
  area.innerHTML = body;
  area.style.display = 'block';
  document.title = title || 'Ledger_A4';
  setTimeout(() => { window.print(); area.style.display = 'none'; area.innerHTML = ''; document.title = 'Brandex Law Associates — Client Ledger'; }, 200);
}

console.log('Brandex gaps-print v5 loaded (accounts + logo reports)');
