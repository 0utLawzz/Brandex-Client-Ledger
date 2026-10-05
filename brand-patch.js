// Brandex brand-patch — client view, print tables, recent 10
(function () {
  var A = window.BRANDEX_ASSETS || {};

  function applyChrome() {
    var link = document.querySelector('link[rel="icon"]');
    if (link) link.href = A.favicon || 'assets/brandex-favicon-20261003.png';
    var brand = document.querySelector('.nb-brand');
    if (brand && !brand.querySelector('.nb-logo')) {
      var img = document.createElement('img');
      img.className = 'nb-logo';
      img.alt = 'Brandex';
      img.width = 40; img.height = 40;
      img.src = A.logoMark || 'assets/brandex-logo-15.png';
      brand.insertBefore(img, brand.firstChild);
    }
  }

  if (typeof loadDashboard === 'function') {
    var _ld = loadDashboard;
    loadDashboard = async function () {
      await _ld();
      var tbody = document.getElementById('recentTableBody') || document.querySelector('#recentTable tbody');
      if (!tbody || !window.mem) return;
      var rows = (mem.entries || []).slice(0, 10);
      tbody.innerHTML = '';
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">No entries yet</td></tr>';
        return;
      }
      rows.forEach(function (e) {
        var code = (e.clients && e.clients.client_code) || '—';
        var tm = (e.cases && (e.cases.tm_no || e.cases.application_name)) || e.details || '—';
        var voidMark = e.voided_at ? ' · VOID' : '';
        var stageHtml = (typeof stageBadge === 'function') ? stageBadge(e.stage) : (e.stage || '—');
        tbody.innerHTML += '<tr class="' + e.entry_type + '-row" style="' + (e.voided_at ? 'opacity:.45' : '') + '">' +
          '<td class="date-cell">' + (e.entry_date || '') + '</td>' +
          '<td>' + code + '</td>' +
          '<td>' + e.entry_type + voidMark + '</td>' +
          '<td>' + stageHtml + '</td>' +
          '<td>' + tm + '</td>' +
          '<td class="amt-due">' + (e.amount_due ? fmt(e.amount_due) : '') + '</td>' +
          '<td class="amt-rec">' + (e.amount_received ? fmt(e.amount_received) : '') + '</td></tr>';
      });
    };
  }

  openClientLedger = async function (clientId) {
    currentClientId = clientId;
    currentViewMode = false;
    var c = (mem.clients || []).find(function (x) { return x.id === clientId; });
    if (!c) { if (typeof toast === 'function') toast('Client not found'); return; }
    var due = 0, rec = 0;
    var rows = (mem.entries || []).filter(function (e) { return e.client_id === clientId; });
    var active = typeof activeEntries === 'function' ? activeEntries(rows) : rows;
    active.forEach(function (e) {
      due += Number(e.amount_due || 0);
      rec += Number(e.amount_received || 0);
    });
    var bal = Number(c.header_balance || 0) + due - rec;
    var title = document.getElementById('ledgerTitle');
    if (title) title.textContent = (c.client_code || '') + ' · Ledger';
    var sub = document.getElementById('ledgerSub');
    if (sub) {
      var parts = [c.client_name || '', c.phone ? ('Phone ' + c.phone) : '', c.email ? ('Email ' + c.email) : '', c.city ? ('City ' + c.city) : '', 'Balance ' + fmt(bal)];
      sub.textContent = parts.filter(Boolean).join(' · ');
    }
    function setTxt(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
    setTxt('lhCode', c.client_code || '');
    setTxt('lhName', c.client_name || '—');
    setTxt('lhBal', fmt(bal));
    if (typeof renderStageOutstanding === 'function') renderStageOutstanding(rows);
    var sel = document.getElementById('ledgerCaseFilter');
    if (sel) {
      var cases = {};
      rows.forEach(function (e) {
        if (e.cases && e.cases.id) cases[e.cases.id] = e.cases.tm_no || e.cases.application_name || e.cases.folder_no || String(e.cases.id).slice(0, 8);
      });
      sel.innerHTML = '<option value="">All cases</option>';
      Object.keys(cases).forEach(function (k) {
        sel.innerHTML += '<option value="' + k + '">' + cases[k] + '</option>';
      });
    }
    window._ledgerRows = rows;
    if (typeof renderClientEntries === 'function') renderClientEntries(rows);
    showPage('ledger');
  };

  populateLedgerCaseFilter = function (rows) {
    var sel = document.getElementById('ledgerCaseFilter');
    if (!sel) return;
    var bar = document.getElementById('caseFilterBar');
    var cases = {};
    (rows || []).forEach(function (e) {
      if (e.cases && e.cases.id) cases[e.cases.id] = e.cases.tm_no || e.cases.application_name || e.cases.folder_no || String(e.cases.id).slice(0, 8);
    });
    var keys = Object.keys(cases);
    if (bar) bar.style.display = keys.length ? 'flex' : 'none';
    sel.innerHTML = '<option value="">All cases</option>';
    keys.forEach(function (k) {
      sel.innerHTML += '<option value="' + k + '">' + cases[k] + '</option>';
    });
  };

  // Print CSS — critical: tables stay tables (never force * to display:block)
  (function () {
    var old = document.getElementById('bx-print-fix');
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = 'bx-print-fix';
    s.textContent =
      '@media print{' +
      '.navbar,.tb,.lh-actions,.no-print,.ni,.nb-stats,.nb-nav,.main,.page,.mo,.toast{display:none!important;}' +
      'body{background:#fff!important;margin:0;}' +
      '#printArea{display:block!important;visibility:visible!important;position:static!important;width:100%!important;}' +
      '#printArea table{display:table!important;width:100%!important;border-collapse:collapse!important;}' +
      '#printArea thead{display:table-header-group!important;}' +
      '#printArea tbody{display:table-row-group!important;}' +
      '#printArea tr{display:table-row!important;}' +
      '#printArea th,#printArea td{display:table-cell!important;}' +
      '#printArea img{display:inline-block!important;}' +
      '#printArea .ack-head,#printArea .print-head,#printArea .ack-row,#printArea .print-flex{display:flex!important;}' +
      '.ack-page{page-break-after:always;}.ack-page:last-child{page-break-after:auto;}' +
      '}' +
      '#printArea{display:none;}' +
      '.ack-title{text-align:center;font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:2px;margin:12px 0;}' +
      '.print-table{width:100%;border-collapse:collapse;font-size:11px;}' +
      '.print-table th{background:#0C0C0C;color:#FAF6EE;padding:6px 8px;text-align:left;font-family:DM Mono,monospace;font-size:9px;text-transform:uppercase;border:1px solid #0C0C0C;}' +
      '.print-table td{padding:5px 8px;border-bottom:1px solid #ccc;vertical-align:top;}' +
      '.print-table .amt{text-align:right;font-family:DM Mono,monospace;}' +
      '.print-brand{font-family:Bebas Neue,sans-serif;font-size:26px;letter-spacing:2px;color:#C94A00;}' +
      '.print-sub{font-family:DM Mono,monospace;font-size:10px;color:#555;}';
    document.head.appendChild(s);
  })();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyChrome);
  else applyChrome();
  console.log('Brandex brand-patch loaded (client+print-table fixes)');
})();
