// Brandex brand-patch — client view, print, recent 10, stage complete
(function () {
  var A = window.BRANDEX_ASSETS || {};

  function applyChrome() {
    var link = document.querySelector('link[rel="icon"]');
    if (link && (A.favicon || true)) link.href = A.favicon || 'assets/brandex-favicon-20261003.png';
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

  // Recent activity: 10 rows
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

  // Null-safe client ledger view (fixes crash on missing lhCode/lhName/lhBal)
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

  // Print CSS: only #printArea (hide live UI so preview is not double)
  if (!document.getElementById('bx-print-fix')) {
    var s = document.createElement('style');
    s.id = 'bx-print-fix';
    s.textContent = '@media print{' +
      '.navbar,.tb,.lh-actions,.no-print,.ni,.nb-stats,.nb-nav,.main,.page{display:none!important;}' +
      'body{background:#fff!important;margin:0;}' +
      '#printArea,#printArea *{display:block!important;visibility:visible!important;}' +
      '#printArea{display:block!important;position:static!important;}' +
      '.ack-page{page-break-after:always;}.ack-page:last-child{page-break-after:auto;}' +
      '}' +
      '.ack-title{text-align:center;font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:2px;margin:12px 0;}';
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyChrome);
  else applyChrome();
  console.log('Brandex brand-patch loaded (client+print fixes)');
})();
