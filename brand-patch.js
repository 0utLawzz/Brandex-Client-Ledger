// Brandex brand-patch v6 — edit client, TM rules, forward stages, small logo print
(function () {
  var A = window.BRANDEX_ASSETS || {};
  var STAGE_ORDER = { S1: 1, S2: 2, S3: 3, S4: 4 };

  function applyChrome() {
    var link = document.querySelector('link[rel="icon"]');
    if (link) link.href = A.favicon || 'assets/brandex-favicon-20261003.png';
    var brand = document.querySelector('.nb-brand');
    if (brand && !brand.querySelector('.nb-logo')) {
      var img = document.createElement('img');
      img.className = 'nb-logo'; img.alt = 'Brandex'; img.width = 40; img.height = 40;
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
          '<td class="date-cell">' + (e.entry_date || '') + '</td><td><strong>' + code + '</strong></td>' +
          '<td>' + e.entry_type + voidMark + '</td><td>' + stageHtml + '</td><td><strong>' + tm + '</strong></td>' +
          '<td class="amt-due">' + (e.amount_due ? fmt(e.amount_due) : '') + '</td>' +
          '<td class="amt-rec">' + (e.amount_received ? fmt(e.amount_received) : '') + '</td></tr>';
      });
    };
  }

  window._editClientId = null;
  openClientModal = function (clientId) {
    window._editClientId = clientId || null;
    var title = document.querySelector('#modalClient .mt');
    if (title) title.textContent = clientId ? 'EDIT CLIENT' : 'NEW CLIENT';
    if (clientId) {
      var c = (mem.clients || []).find(function (x) { return x.id === clientId; });
      if (!c) return toast('Client not found');
      document.getElementById('cCode').value = c.client_code || '';
      document.getElementById('cName').value = c.client_name || '';
      document.getElementById('cCity').value = c.city || '';
      if (document.getElementById('cEmail')) document.getElementById('cEmail').value = c.email || '';
      if (document.getElementById('cPhone')) document.getElementById('cPhone').value = c.phone || '';
      document.getElementById('cHeader').value = c.header_balance || 0;
      if (c.series_id && document.getElementById('cSeries')) document.getElementById('cSeries').value = c.series_id;
      var rates = (mem.rates && mem.rates[c.id]) || {};
      ['S1','S2','S3','S4'].forEach(function (st) {
        var el = document.getElementById('r' + st);
        if (el) el.value = rates[st] != null ? rates[st] : 0;
      });
    } else {
      ['cCode','cName','cCity','cEmail','cPhone'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('cHeader').value = '0';
      ['rS1','rS2','rS3','rS4'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = '0';
      });
    }
    openModal('modalClient');
  };

  saveClient = async function () {
    var code = document.getElementById('cCode').value.trim();
    if (!code) return toast('Client code required');
    if (!sb) return toast('Supabase required');
    var payload = {
      series_id: document.getElementById('cSeries').value || null,
      client_code: code,
      client_name: document.getElementById('cName').value.trim(),
      city: document.getElementById('cCity').value.trim(),
      email: (document.getElementById('cEmail') && document.getElementById('cEmail').value.trim()) || null,
      phone: (document.getElementById('cPhone') && document.getElementById('cPhone').value.trim()) || null,
      header_balance: Number(document.getElementById('cHeader').value) || 0
    };
    var rates = {
      S1: Number(document.getElementById('rS1').value) || 0,
      S2: Number(document.getElementById('rS2').value) || 0,
      S3: Number(document.getElementById('rS3').value) || 0,
      S4: Number(document.getElementById('rS4').value) || 0
    };
    var data, error;
    if (window._editClientId) {
      var res = await sb.from('clients').update(payload).eq('id', window._editClientId).select().single();
      data = res.data; error = res.error;
      if (error && (String(error.message).includes('email') || String(error.message).includes('phone'))) {
        delete payload.email; delete payload.phone;
        res = await sb.from('clients').update(payload).eq('id', window._editClientId).select().single();
        data = res.data; error = res.error;
      }
    } else {
      var res2 = await sb.from('clients').insert(payload).select().single();
      data = res2.data; error = res2.error;
      if (error && (String(error.message).includes('email') || String(error.message).includes('phone'))) {
        delete payload.email; delete payload.phone;
        res2 = await sb.from('clients').insert(payload).select().single();
        data = res2.data; error = res2.error;
      }
    }
    if (error) return toast(error.message);
    var rateRows = Object.keys(rates).map(function (stage) {
      return { client_id: data.id, stage: stage, amount: rates[stage] };
    });
    await sb.from('client_stage_rates').upsert(rateRows, { onConflict: 'client_id,stage' });
    toast(window._editClientId ? 'Client updated' : 'Client saved');
    window._editClientId = null;
    closeModal('modalClient');
    await loadClients();
    if (typeof renderClients === 'function') renderClients();
    loadDashboard();
  };

  if (typeof renderClients === 'function') {
    var _rc = renderClients;
    renderClients = function () {
      _rc();
      var grid = document.getElementById('clientsGrid');
      if (!grid) return;
      grid.querySelectorAll('.client-card').forEach(function (card) {
        if (card.querySelector('.cc-edit')) return;
        var onclick = card.getAttribute('onclick') || '';
        var m = onclick.match(/openClientLedger\('([^']+)'\)/);
        if (!m) return;
        var id = m[1];
        var edit = document.createElement('button');
        edit.className = 'btn sm cc-edit';
        edit.textContent = 'Edit';
        edit.setAttribute('aria-label', 'Edit client ' + (card.querySelector('.cc-no') || card.querySelector('.cc-code')).textContent);
        edit.onclick = function (ev) { ev.stopPropagation(); openClientModal(id); };
        (card.querySelector('.cc-footer') || card).appendChild(edit);
      });
    };
  }

  openClientLedger = async function (clientId) {
    currentClientId = clientId;
    currentViewMode = false;
    var c = (mem.clients || []).find(function (x) { return x.id === clientId; });
    if (!c) { toast('Client not found'); return; }
    var due = 0, rec = 0;
    var rows = (mem.entries || []).filter(function (e) { return e.client_id === clientId; });
    var active = typeof activeEntries === 'function' ? activeEntries(rows) : rows;
    active.forEach(function (e) {
      due += Number(e.amount_due || 0);
      rec += Number(e.amount_received || 0);
    });
    var bal = Number(c.header_balance || 0) + due - rec;
    var title = document.getElementById('ledgerTitle');
    if (title) title.textContent = c.client_code || 'Client ledger';
    var sub = document.getElementById('ledgerSub');
    if (sub) {
      sub.innerHTML = '<div class="ledger-profile"><div class="ledger-profile-copy"><h2 class="ledger-client-name">' + clientDisplayText(c.client_name || 'Unnamed client') + '</h2>' +
        '<dl class="ledger-contact"><div><dt>City</dt><dd>' + clientDisplayText(c.city || 'Not provided') + '</dd></div>' +
        '<div><dt>Phone</dt><dd>' + clientDisplayText(c.phone || 'Not provided') + '</dd></div>' +
        '<div><dt>Email</dt><dd>' + clientDisplayText(c.email || 'Not provided') + '</dd></div></dl></div>' +
        '<div class="ledger-balance ' + (bal > 0 ? 'neg' : 'pos') + '"><span>' + (bal > 0 ? 'Outstanding balance' : bal < 0 ? 'Credit balance' : 'Settled balance') + '</span><div><small>PKR</small><strong>' + fmt(bal) + '</strong></div><p>Opening + charges − received</p></div></div>' +
        '<dl class="ledger-summary"><div><dt>Opening balance</dt><dd><small>PKR</small> ' + fmt(c.header_balance || 0) + '</dd></div>' +
        '<div><dt>Total charged</dt><dd><small>PKR</small> ' + fmt(due) + '</dd></div>' +
        '<div><dt>Total received</dt><dd><small>PKR</small> ' + fmt(rec) + '</dd></div><div><dt>Active entries</dt><dd>' + active.length + '</dd></div></dl>';
    }
    var so = document.getElementById('stageOutstanding');
    if (so) { so.style.display = 'none'; so.innerHTML = ''; }
    var sel = document.getElementById('ledgerCaseFilter');
    if (sel) {
      var cases = {};
      rows.forEach(function (e) {
        if (e.cases && e.cases.id) cases[e.cases.id] = e.cases.tm_no || e.cases.application_name || e.cases.folder_no || String(e.cases.id).slice(0, 8);
      });
      sel.innerHTML = '<option value="">All cases / TM</option>';
      Object.keys(cases).forEach(function (k) {
        sel.innerHTML += '<option value="' + k + '">' + cases[k] + '</option>';
      });
    }
    window._ledgerRows = rows;
    if (typeof renderClientEntries === 'function') renderClientEntries(rows);
    showPage('ledger');
  };

  if (typeof renderClientEntries === 'function') {
    var _rce = renderClientEntries;
    renderClientEntries = function (rows) {
      _rce(rows);
      var tbody = document.querySelector('#clientLedgerTable tbody');
      if (!tbody) return;
      tbody.querySelectorAll('td.folder-no').forEach(function (td) {
        td.innerHTML = '<strong>' + td.textContent + '</strong>';
      });
      tbody.querySelectorAll('td.amt-due, td.amt-rec').forEach(function (td) {
        if (td.textContent.trim()) td.innerHTML = '<strong>' + td.textContent + '</strong>';
      });
    };
  }

  if (typeof saveCharge === 'function') {
    var _sc = saveCharge;
    saveCharge = async function () {
      var clientId = document.getElementById('chClient').value;
      var tm = document.getElementById('chTM').value.trim();
      var stage = document.getElementById('chStage').value;
      var amount = Number(document.getElementById('chAmount').value);
      if (!clientId || !amount) return toast('Client and amount required');
      if (stage !== 'S1' && !tm) return toast('TM required for ' + (typeof stageLabel === 'function' ? stageLabel(stage) : stage));
      if (!sb) return toast('Supabase required');
      var tmNorm = typeof normalizeTM === 'function' ? normalizeTM(tm) : (tm ? String(tm).replace(/[^0-9]/g, '') : null);
      if (tmNorm) {
        var q = await sb.from('cases').select('id, client_id, tm_no, clients(client_code, client_name)').eq('tm_no_normalized', tmNorm).maybeSingle();
        if (q.data && q.data.client_id !== clientId) {
          var owner = q.data.clients ? ((q.data.clients.client_code || '') + ' — ' + (q.data.clients.client_name || '')) : 'another client';
          return toast('TM ' + tm + ' already belongs to ' + owner + '. Cannot add to this ledger.');
        }
      }
      if (tmNorm && stage) {
        var caseRows = await sb.from('cases').select('id').eq('tm_no_normalized', tmNorm).eq('client_id', clientId).maybeSingle();
        if (caseRows.data) {
          var entries = await sb.from('ledger_entries').select('stage').eq('case_id', caseRows.data.id).eq('entry_type', 'charge').is('voided_at', null);
          var maxOrd = 0;
          (entries.data || []).forEach(function (e) {
            var o = STAGE_ORDER[e.stage] || 0;
            if (o > maxOrd) maxOrd = o;
          });
          var want = STAGE_ORDER[stage] || 0;
          if (want < maxOrd) {
            return toast('Stages only move forward. Highest stage on this TM is Stage ' + maxOrd + '. Cannot post Stage ' + want + '.');
          }
        }
      }
      return _sc();
    };
  }

  if (typeof saveReceiving === 'function') {
    var _sr = saveReceiving;
    saveReceiving = async function () {
      var clientId = document.getElementById('rcClient').value;
      var tm = document.getElementById('rcTM').value.trim();
      if (tm && sb && clientId) {
        var tmNorm = typeof normalizeTM === 'function' ? normalizeTM(tm) : String(tm).replace(/[^0-9]/g, '');
        if (tmNorm) {
          var q = await sb.from('cases').select('id, client_id, clients(client_code, client_name)').eq('tm_no_normalized', tmNorm).maybeSingle();
          if (q.data && q.data.client_id !== clientId) {
            var owner = q.data.clients ? ((q.data.clients.client_code || '') + ' — ' + (q.data.clients.client_name || '')) : 'another client';
            return toast('TM ' + tm + ' belongs to ' + owner + '. Cannot receive against it here.');
          }
        }
      }
      return _sr();
    };
  }

  toggleCurrentView = function () {
    currentViewMode = !currentViewMode;
    toast(currentViewMode ? 'Current view: last 6 entries' : 'Full ledger');
    if (currentClientId) openClientLedger(currentClientId);
  };
  window.printCurrentView = function () {
    if (!currentClientId) return toast('Open a client ledger first');
    var rows = window._ledgerRows || (mem.entries || []).filter(function (e) { return e.client_id === currentClientId; });
    if (typeof activeEntries === 'function') rows = activeEntries(rows);
    rows = rows.slice().sort(function (a, b) {
      return (b.entry_date || '').localeCompare(a.entry_date || '') || (b.created_at || '').localeCompare(a.created_at || '');
    }).slice(0, 6);
    if (typeof printLedgerA4 === 'function') {
      var bak = window._ledgerRows;
      window._ledgerRows = rows;
      printLedgerA4();
      window._ledgerRows = bak;
    }
  };

  function wirePrintCurrent() {
    var btn = document.querySelector('button[onclick="toggleCurrentView()"]');
    if (btn && !document.getElementById('btnPrintCurrent')) {
      var p = document.createElement('button');
      p.id = 'btnPrintCurrent';
      p.className = 'btn ok';
      p.textContent = 'Print Current';
      p.onclick = function () { window.printCurrentView(); };
      btn.parentNode.insertBefore(p, btn.nextSibling);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { applyChrome(); wirePrintCurrent(); });
  else { applyChrome(); wirePrintCurrent(); }
  setTimeout(wirePrintCurrent, 600);

  // Print CSS — small logo top + aligned 2-col banks
  (function () {
    var old = document.getElementById('bx-print-fix');
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = 'bx-print-fix';
    var D = '#8B3A00';
    var G = '#0D9970';
    var O = '#C94A00';
    s.textContent =
      '@media print{' +
      '.navbar,.tb,.lh-actions,.no-print,.ni,.nb-stats,.nb-nav,.main,.page,.mo,.toast{display:none!important;}' +
      'body{background:#fff!important;margin:0;color:' + D + '!important;}' +
      '#printArea{display:block!important;visibility:visible!important;position:static!important;width:100%!important;color:' + D + '!important;}' +
      '#printArea table{display:table!important;width:100%!important;border-collapse:collapse!important;}' +
      '#printArea thead{display:table-header-group!important;}' +
      '#printArea tbody{display:table-row-group!important;}' +
      '#printArea tr{display:table-row!important;}' +
      '#printArea th,#printArea td{display:table-cell!important;color:' + D + '!important;}' +
      '#printArea img{display:inline-block!important;}' +
      '#printArea .ack-head,#printArea .print-head,#printArea .ack-row,#printArea .print-flex,#printArea .print-signs,#printArea .print-head-row{display:flex!important;}' +
      '.ack-page{page-break-after:always;}.ack-page:last-child{page-break-after:auto;}' +
      '}' +
      '#printArea{display:none;}' +
      '.ack-sheet{border:3px solid ' + D + '!important;color:' + D + '!important;}' +
      '.print-card-wrap{margin-bottom:10px;border-bottom:2px solid ' + O + ';padding-bottom:8px;}' +
      '.print-logo-sm{width:36px;height:36px;border-radius:50%;border:2px solid ' + D + ';object-fit:cover;flex-shrink:0;}' +
      '.print-head-row{display:flex;align-items:center;gap:10px;}' +
      '.print-head-text{text-align:left;}' +
      '.print-brand{font-family:Bebas Neue,sans-serif;font-size:20px!important;letter-spacing:1px;color:' + O + ';line-height:1.1;}' +
      '.print-sub{font-family:DM Mono,monospace;font-size:9px;color:#6b4423;}' +
      '.print-subtitle{font-family:Bebas Neue,sans-serif;font-size:16px;letter-spacing:2px;color:' + O + ';margin-top:6px;text-align:center;}' +
      '.print-group{margin:12px 0;padding:8px 0;border-bottom:1px dashed #e0c4a8;}' +
      '.print-group-title{font-family:DM Mono,monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:' + O + ';margin-bottom:6px;font-weight:700;}' +
      '.print-big{font-family:Bebas Neue,sans-serif;font-size:26px;letter-spacing:1px;color:' + D + ';line-height:1.1;}' +
      '.print-big-sub{font-size:14px;font-weight:700;color:' + D + ';margin-top:2px;}' +
      '.print-meta{font-family:DM Mono,monospace;font-size:11px;color:#6b4423;margin-top:4px;}' +
      '.print-pills{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}' +
      '.print-pill{display:inline-block;padding:4px 10px;border:2px solid ' + D + ';font-family:DM Mono,monospace;font-size:11px;font-weight:700;background:#FFF4E6;color:' + D + ';}' +
      '.print-pill.tm{background:#E6F7F1;border-color:' + G + ';color:' + G + ';}' +
      '.print-pill.muted{opacity:.6;}' +
      '.ack-copy-bar{text-align:right;margin-bottom:8px;}' +
      '.ack-copy{background:' + O + '!important;color:#fff!important;border:2px solid ' + D + ';padding:4px 10px;font-family:DM Mono,monospace;font-size:10px;}' +
      '.ack-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e0c4a8;font-size:13px;color:' + D + ';}' +
      '.ack-row.total{font-weight:700;font-size:16px;border-bottom:none;margin-top:8px;border-top:2px solid ' + O + ';padding-top:8px;color:' + O + ';}' +
      '.ack-banks{margin-top:12px;font-size:11px;border:2px solid ' + G + ';padding:10px;background:#E6F7F1;color:' + D + ';}' +
      '.pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}' +
      '.pay-acct{border:1px solid #c5e6d9;padding:6px 8px;background:#fff;}' +
      '.pay-name{font-weight:700;font-size:11px;margin-bottom:4px;color:' + O + ';}' +
      '.pay-line{display:flex;gap:6px;font-size:10px;line-height:1.4;}' +
      '.pay-lbl{min-width:42px;color:#6b4423;font-family:DM Mono,monospace;}' +
      '.pay-val{font-weight:600;word-break:break-all;}' +
      '.print-signs{margin-top:28px;display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:11px;color:' + D + ';}' +
      '.print-thanks{margin-top:16px;text-align:center;font-family:DM Mono,monospace;font-size:9px;color:#6b4423;}' +
      '.print-table{width:100%;border-collapse:collapse;font-size:11px;color:' + D + ';}' +
      '.print-table th{background:' + D + '!important;color:#FAF6EE!important;padding:6px 8px;text-align:left;font-family:DM Mono,monospace;font-size:9px;text-transform:uppercase;border:1px solid ' + D + ';}' +
      '.print-table td{padding:5px 8px;border-bottom:1px solid #e0c4a8;vertical-align:top;color:' + D + ';}' +
      '.print-table .amt{text-align:right;font-family:DM Mono,monospace;font-weight:700;}' +
      '.report-divider{border-top:3px solid ' + O + ';margin:18px 0 10px;padding-top:8px;}' +
      '.cc-edit{font-size:10px!important;}';
    document.head.appendChild(s);
  })();

  function uppercaseEditableText(root) {
    var fields = root.querySelectorAll('input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="tel"], input[type="url"], textarea');
    fields.forEach(function (field) {
      field.value = field.value.toUpperCase();
    });
  }

  document.addEventListener('input', function (event) {
    var field = event.target;
    if (field && (field.id === 'authEmail' || field.id === 'authPassword')) return;
    if (field && field.matches && field.matches('input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="tel"], input[type="url"], textarea')) {
      var start = field.selectionStart;
      var end = field.selectionEnd;
      field.value = field.value.toUpperCase();
      if (typeof start === 'number' && typeof end === 'number') field.setSelectionRange(start, end);
    }
  }, true);

  ['saveClient', 'saveCharge', 'saveReceiving', 'saveEditCase'].forEach(function (name) {
    var original = window[name];
    if (typeof original !== 'function') return;
    window[name] = async function () {
      uppercaseEditableText(document);
      return original.apply(this, arguments);
    };
  });

  function renderMonthlyChart() {
    var chart = document.getElementById('monthlyChart');
    if (!chart) return;

    var months = [];
    var now = new Date();
    for (var offset = 5; offset >= 0; offset -= 1) {
      var month = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      var key = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0');
      months.push({
        key: key,
        label: month.toLocaleDateString('en', { month: 'short' }).toUpperCase(),
        charges: 0,
        receivings: 0
      });
    }

    var totalsByMonth = {};
    months.forEach(function (month) { totalsByMonth[month.key] = month; });
    var rows = typeof activeEntries === 'function' ? activeEntries(mem.entries || []) : (mem.entries || []);
    rows.forEach(function (entry) {
      var monthKey = String(entry.entry_date || '').slice(0, 7);
      var month = totalsByMonth[monthKey];
      if (!month) return;
      if (entry.entry_type === 'charge') month.charges += Number(entry.amount_due || 0);
      if (entry.entry_type === 'receiving') month.receivings += Number(entry.amount_received || 0);
    });

    var max = Math.max.apply(null, months.map(function (month) {
      return Math.max(month.charges, month.receivings);
    }));
    var scale = max > 0 ? max : 1;
    var format = function (value) { return 'PKR ' + fmt(value); };
    chart.innerHTML = months.map(function (month) {
      var chargeHeight = month.charges ? Math.max(3, month.charges / scale * 100) : 0;
      var receivingHeight = month.receivings ? Math.max(3, month.receivings / scale * 100) : 0;
      var description = month.label + ': CHARGES ' + format(month.charges) + ', RECEIVINGS ' + format(month.receivings);
      return '<div class="chart-month" title="' + description + '">' +
        '<div class="chart-bars" aria-hidden="true">' +
        '<span class="chart-bar charge" style="height:' + chargeHeight + '%"></span>' +
        '<span class="chart-bar receiving" style="height:' + receivingHeight + '%"></span>' +
        '</div><span>' + month.label + '</span></div>';
    }).join('');
    chart.setAttribute('aria-label', 'MONTHLY CHARGES AND RECEIVINGS. ' +
      months.map(function (month) {
        return month.label + ': CHARGES ' + format(month.charges) + ', RECEIVINGS ' + format(month.receivings);
      }).join('. '));
  }

  if (typeof loadDashboard === 'function') {
    var loadDashboardWithChart = loadDashboard;
    loadDashboard = async function () {
      await loadDashboardWithChart();
      var recentBody = document.getElementById('recentTableBody') || document.querySelector('#recentTable tbody');
      if (recentBody) {
        while (recentBody.rows.length > 10) recentBody.deleteRow(10);
      }
      var today = new Date().toISOString().slice(0, 10);
      var todayCount = (mem.entries || []).filter(function (entry) {
        return !entry.voided_at && entry.entry_date === today;
      }).length;
      var todayStat = document.getElementById('statToday');
      if (todayStat) todayStat.textContent = String(todayCount);
      renderMonthlyChart();
    };
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  var stageCacheEntries = null;
  var stageRowsByCase = {};
  function caseStageTotals(caseId) {
    var stages = ['S1', 'S2', 'S3', 'S4'];
    if (stageCacheEntries !== mem.entries) {
      stageCacheEntries = mem.entries;
      stageRowsByCase = {};
      (mem.entries || []).forEach(function (entry) {
        if (!entry.case_id) return;
        if (!stageRowsByCase[entry.case_id]) {
          stageRowsByCase[entry.case_id] = { charges: [], receipts: [], caseRow: null };
        }
        var group = stageRowsByCase[entry.case_id];
        if (entry.entry_type === 'charge' && !entry.voided_at) group.charges.push(entry);
        if (entry.entry_type === 'receiving' && !entry.voided_at) group.receipts.push(entry);
        if (entry.cases) group.caseRow = entry.cases;
      });
    }
    var group = stageRowsByCase[caseId] || { charges: [], receipts: [], caseRow: null };
    var charges = group.charges;
    var receipts = group.receipts;
    var caseRow = group.caseRow;
    var statusByStage = {};
    var generalPool = receipts.reduce(function (sum, entry) {
      return sum + (!entry.stage && !entry.linked_entry_id ? Number(entry.amount_received || 0) : 0);
    }, 0);

    stages.forEach(function (stage) {
      var due = charges.reduce(function (sum, entry) {
        return sum + (entry.stage === stage ? Number(entry.amount_due || 0) : 0);
      }, 0);
      var direct = receipts.reduce(function (sum, entry) {
        if (entry.linked_entry_id) {
          var linkedCharge = charges.find(function (charge) { return charge.id === entry.linked_entry_id; });
          return sum + (linkedCharge && linkedCharge.stage === stage ? Number(entry.amount_received || 0) : 0);
        }
        return sum + (entry.stage === stage ? Number(entry.amount_received || 0) : 0);
      }, 0);
      var generalApplied = Math.min(generalPool, Math.max(due - direct, 0));
      generalPool = Math.max(generalPool - generalApplied, 0);
      statusByStage[stage] = {
        due: due,
        received: direct + generalApplied,
        outstanding: Math.max(due - direct - generalApplied, 0),
        paid: due > 0 && direct + generalApplied >= due
      };
    });

    var standaloneReceipts = caseRow ? [] : receipts;
    return { stages: statusByStage, standaloneReceipts: standaloneReceipts };
  }

  function renderCaseList() {
    var body = document.getElementById('clientCaseTableBody');
    if (!body || !currentClientId) return;
    var rowsById = {};
    (mem.entries || []).filter(function (entry) {
      return entry.client_id === currentClientId && entry.cases && entry.cases.id;
    }).forEach(function (entry) {
      rowsById[entry.cases.id] = entry.cases;
    });
    (mem.cases || []).filter(function (caseRow) {
      return caseRow.client_id === currentClientId;
    }).forEach(function (caseRow) { rowsById[caseRow.id] = caseRow; });

    var query = (document.getElementById('caseSearch').value || '').trim().toUpperCase();
    var selectedStage = document.getElementById('caseStageFilter').value;
    var selectedStatus = document.getElementById('caseStatusFilter').value;
    var cases = Object.keys(rowsById).map(function (id) {
      var caseRow = rowsById[id];
      var totals = caseStageTotals(id);
      var searchable = [caseRow.tm_no, caseRow.folder_no, caseRow.application_name].join(' ').toUpperCase();
      var activeStages = Object.keys(totals.stages).filter(function (stage) {
        return totals.stages[stage].due > 0;
      });
      var isCleared = activeStages.length > 0 && activeStages.every(function (stage) {
        return totals.stages[stage].paid;
      });
      var hasOutstanding = activeStages.some(function (stage) {
        return !totals.stages[stage].paid;
      });
      return { item: caseRow, id: id, totals: totals, stages: activeStages, cleared: isCleared, hasOutstanding: hasOutstanding, searchable: searchable };
    }).filter(function (row) {
      if (query && row.searchable.indexOf(query) === -1) return false;
      if (selectedStage && row.stages.indexOf(selectedStage) === -1) return false;
      if (selectedStatus === 'CLEARED' && !row.cleared) return false;
      if (selectedStatus === 'OUTSTANDING' && !row.hasOutstanding) return false;
      return true;
    }).sort(function (a, b) {
      return String(a.item.tm_no || a.item.folder_no || '').localeCompare(String(b.item.tm_no || b.item.folder_no || ''));
    });

    body.innerHTML = cases.map(function (row) {
      var outstanding = Object.keys(row.totals.stages).reduce(function (sum, stage) {
        return sum + row.totals.stages[stage].outstanding;
      }, 0);
      var badges = row.stages.length ? row.stages.map(function (stage) {
        return '<span class="case-status ' + (row.totals.stages[stage].paid ? 'cleared' : 'outstanding') + '">' +
          stage + ' ' + (row.totals.stages[stage].paid ? 'CLEARED' : 'DUE') + '</span>';
      }).join(' ') : '<span class="case-status">NO CHARGES</span>';
      return '<tr data-case-id="' + escapeHTML(row.id) + '">' +
        '<td><strong>' + escapeHTML(row.item.tm_no || 'NO TM') + '</strong></td>' +
        '<td>' + escapeHTML(row.item.folder_no || '—') + '</td>' +
        '<td>' + escapeHTML(row.item.application_name || '—') + '</td>' +
        '<td>' + badges + '</td>' +
        '<td class="amt-due">' + fmt(outstanding) + '</td>' +
        '<td><button class="btn sm" type="button" data-open-case="' + escapeHTML(row.id) + '">OPEN CASE</button></td>' +
        '</tr>';
    }).join('');
    if (!cases.length) body.innerHTML = '<tr><td colspan="6" class="empty">NO CASES MATCH THESE FILTERS</td></tr>';
  }

  function renderStageOutstanding(rows) {
    var panel = document.getElementById('stageOutstanding');
    if (!panel) return;
    var caseId = document.getElementById('ledgerCaseFilter').value;
    var scoped = (rows || []).filter(function (entry) {
      return !caseId || (entry.cases && entry.cases.id === caseId);
    });
    var caseIds = {};
    scoped.forEach(function (entry) {
      if (entry.cases && entry.cases.id) caseIds[entry.cases.id] = true;
    });
    panel.style.display = 'grid';
    panel.innerHTML = ['S1', 'S2', 'S3', 'S4'].map(function (stage) {
      var due = 0;
      var outstanding = 0;
      Object.keys(caseIds).forEach(function (id) {
        var stageStatus = caseStageTotals(id).stages[stage];
        due += stageStatus.due;
        outstanding += stageStatus.outstanding;
      });
      return '<div class="stage-due-card">' + stage + ' OUTSTANDING<strong>PKR ' + fmt(outstanding) +
        '</strong>' + (due > 0 && outstanding === 0 ? 'CLEARED' : 'TOTAL CHARGED PKR ' + fmt(due)) + '</div>';
    }).join('');
  }
  window.renderStageOutstanding = renderStageOutstanding;

  if (typeof openClientLedger === 'function') {
    var openClientLedgerWithCases = openClientLedger;
    openClientLedger = async function (clientId) {
      await openClientLedgerWithCases(clientId);
      renderCaseList();
      renderStageOutstanding(window._ledgerRows || []);
    };
  }

  function filteredLedgerRows() {
    var caseId = document.getElementById('ledgerCaseFilter').value;
    var from = document.getElementById('ledgerDateFrom').value;
    var to = document.getElementById('ledgerDateTo').value;
    var rows = window._ledgerRows || [];
    return rows.filter(function (entry) {
      if (caseId && (!entry.cases || entry.cases.id !== caseId)) return false;
      if (from && String(entry.entry_date || '') < from) return false;
      if (to && String(entry.entry_date || '') > to) return false;
      return true;
    });
  }

  function refreshLedgerFilters() {
    renderClientEntries(filteredLedgerRows());
    renderStageOutstanding(window._ledgerRows || []);
    renderCaseList();
  }

  document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'caseSearch') renderCaseList();
  });
  ['caseStageFilter', 'caseStatusFilter', 'ledgerCaseFilter', 'ledgerDateFrom', 'ledgerDateTo'].forEach(function (id) {
    var field = document.getElementById(id);
    if (field) field.addEventListener('change', refreshLedgerFilters);
  });

  var caseTable = document.getElementById('clientCaseTableBody');
  if (caseTable) caseTable.addEventListener('click', function (event) {
    var button = event.target.closest('[data-open-case]');
    var row = event.target.closest('tr[data-case-id]');
    var caseId = button ? button.getAttribute('data-open-case') : (row && row.getAttribute('data-case-id'));
    if (!caseId) return;
    var filter = document.getElementById('ledgerCaseFilter');
    filter.value = caseId;
    refreshLedgerFilters();
    document.getElementById('clientLedgerTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function entryActionMenu(entry) {
    if (entry.voided_at) return '<span class="case-status">VOIDED</span>';
    var tm = entry.cases && entry.cases.tm_no ? entry.cases.tm_no : '';
    var caseId = entry.cases && entry.cases.id ? entry.cases.id : '';
    return '<details class="entry-menu"><summary class="btn sm">ACTIONS ▾</summary><div class="entry-menu-items">' +
      '<button class="btn sm prim" type="button" data-action="charge" data-case="' + escapeHTML(caseId) + '" data-tm="' + escapeHTML(tm) + '">CHARGE</button>' +
      '<button class="btn sm ok" type="button" data-action="receive" data-case="' + escapeHTML(caseId) + '" data-tm="' + escapeHTML(tm) + '">RECEIVE</button>' +
      '<button class="btn sm" type="button" data-action="edit" data-entry="' + escapeHTML(entry.id) + '">EDIT</button>' +
      '<button class="btn sm del" type="button" data-action="void" data-entry="' + escapeHTML(entry.id) + '">VOID</button>' +
      '<button class="btn sm" type="button" data-action="print" data-entry="' + escapeHTML(entry.id) + '">PRINT</button>' +
      '</div></details>';
  }

  if (typeof renderClientEntries === 'function') {
    renderClientEntries = function (rows) {
      var tbody = document.querySelector('#clientLedgerTable tbody');
      if (!tbody) return;
      var list = (rows || []).slice().sort(function (a, b) {
        return String(b.entry_date || '').localeCompare(String(a.entry_date || '')) ||
          String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
      if (currentViewMode) list = list.slice(0, 6);
      tbody.innerHTML = list.map(function (entry) {
        var voided = !!entry.voided_at;
        var type = entry.entry_type === 'receiving' ? 'RECEIVING' : 'CHARGE';
        return '<tr class="' + escapeHTML(entry.entry_type) + '-row" style="' +
          (voided ? 'opacity:.45;text-decoration:line-through;' : '') + '">' +
          '<td class="date-cell">' + escapeHTML(entry.entry_date || '') + '</td>' +
          '<td><span class="entry-kind ' + escapeHTML(entry.entry_type) + '">' + (voided ? 'VOID · ' : '') + type + '</span></td>' +
          '<td>' + stageBadge(entry.stage) + '</td>' +
          '<td class="folder-no">' + escapeHTML(entry.cases && (entry.cases.tm_no || entry.cases.folder_no || entry.cases.application_name) || '—') + '</td>' +
          '<td>' + escapeHTML(entry.details || '') + (entry.payment_method ? ' · ' + escapeHTML(entry.payment_method) : '') + '</td>' +
          '<td class="amt-due">' + (entry.amount_due ? fmt(entry.amount_due) : '') + '</td>' +
          '<td class="amt-rec">' + (entry.amount_received ? fmt(entry.amount_received) : '') + '</td>' +
          '<td class="no-print">' + entryActionMenu(entry) + '</td></tr>';
      }).join('');
      if (!list.length) tbody.innerHTML = '<tr><td colspan="8" class="empty">NO ENTRIES MATCH THESE FILTERS</td></tr>';
    };
  }

  var ledgerTable = document.getElementById('clientLedgerTable');
  if (ledgerTable) ledgerTable.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;
    event.preventDefault();
    var action = button.getAttribute('data-action');
    var entry = (mem.entries || []).find(function (row) { return row.id === button.getAttribute('data-entry'); });
    if (action === 'charge') {
      openChargeModal(currentClientId);
      document.getElementById('chTM').value = button.getAttribute('data-tm') || '';
      refreshStageOptions('ch', true);
      return;
    }
    if (action === 'receive') {
      openReceivingModal(currentClientId);
      document.getElementById('rcTM').value = button.getAttribute('data-tm') || '';
      refreshStageOptions('rc', true);
      return;
    }
    if (!entry) return toast('ENTRY NOT FOUND');
    if (action === 'void') return voidEntry(entry.id);
    if (action === 'print') return printEntry(entry);
    if (action === 'edit') openEntryEdit(entry);
  });

  function printEntry(entry) {
    if (entry.entry_type === 'receiving' && typeof printAck === 'function') return printAck(entry.id);
    var client = (mem.clients || []).find(function (row) { return row.id === entry.client_id; }) || {};
    var tm = entry.cases && (entry.cases.tm_no || entry.cases.folder_no || entry.cases.application_name) || '—';
    var receipt = '<main class="receipt-box"><h1>BRANDEX LAW ASSOCIATES</h1><div class="sub">CHARGE RECORD</div>' +
      '<p>DATE <strong>' + escapeHTML(entry.entry_date || '') + '</strong></p>' +
      '<p>CLIENT <strong>' + escapeHTML(client.client_code || '') + ' · ' + escapeHTML(client.client_name || '') + '</strong></p>' +
      '<p>CASE / TM <strong>' + escapeHTML(tm) + '</strong></p>' +
      '<p>STAGE <strong>' + escapeHTML(entry.stage || 'GENERAL') + '</strong></p>' +
      '<p>DETAILS <strong>' + escapeHTML(entry.details || '') + '</strong></p>' +
      '<p class="total">AMOUNT DUE <strong>PKR ' + fmt(entry.amount_due) + '</strong></p></main>';
    var popup = window.open('', '_blank', 'width=520,height=650');
    if (!popup) return toast('ALLOW POP-UPS TO PRINT THIS CHARGE');
    popup.document.write('<!doctype html><html><head><title>CHARGE</title><style>body{font:14px Arial;padding:24px;text-transform:uppercase}.receipt-box{border:3px solid #0C0C0C;padding:24px;max-width:440px;margin:auto}.sub{text-align:center;color:#8B3A00;font-weight:bold}.total{border-top:3px solid #0C0C0C;padding-top:14px;color:#8B3A00}</style></head><body>' + receipt + '<script>window.print()<\\/script></body></html>');
    popup.document.close();
  }

  function openEntryEdit(entry) {
    var modal = document.getElementById('modalEntryEdit');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalEntryEdit';
      modal.className = 'mo';
      modal.innerHTML = '<form class="mbox" id="entryEditForm"><div class="mh"><div class="mt">EDIT LEDGER ENTRY</div><button class="mc-btn" type="button" data-close-entry-edit>×</button></div>' +
        '<div class="mb"><input id="editEntryId" type="hidden"><label class="flbl" for="editEntryDate">DATE</label><input class="fi" id="editEntryDate" type="date" required>' +
        '<label class="flbl" for="editEntryAmount">AMOUNT</label><input class="fi" id="editEntryAmount" type="number" min="0.01" step="0.01" required>' +
        '<label class="flbl" for="editEntryDetails">DETAILS</label><input class="fi" id="editEntryDetails" type="text"></div>' +
        '<div class="mf"><button class="btn" type="button" data-close-entry-edit>CANCEL</button><button class="btn prim" type="submit">SAVE ENTRY</button></div></form>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('[data-close-entry-edit]')) modal.classList.remove('open');
      });
      modal.querySelector('#entryEditForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!sb) return toast('SUPABASE REQUIRED');
        var id = document.getElementById('editEntryId').value;
        var original = (mem.entries || []).find(function (row) { return row.id === id; });
        var amount = Number(document.getElementById('editEntryAmount').value);
        if (!original || !Number.isFinite(amount) || amount <= 0) return toast('ENTER A VALID AMOUNT');
        var changes = {
          entry_date: document.getElementById('editEntryDate').value,
          details: document.getElementById('editEntryDetails').value.trim().toUpperCase()
        };
        changes[original.entry_type === 'charge' ? 'amount_due' : 'amount_received'] = amount;
        var result = await sb.from('ledger_entries').update(changes).eq('id', id).is('voided_at', null);
        if (result.error) return toast(result.error.message);
        modal.classList.remove('open');
        await loadEntries();
        await loadDashboard();
        if (currentClientId) await openClientLedger(currentClientId);
        toast('ENTRY UPDATED');
      });
    }
    document.getElementById('editEntryId').value = entry.id;
    document.getElementById('editEntryDate').value = entry.entry_date || '';
    document.getElementById('editEntryAmount').value = entry.entry_type === 'charge' ? entry.amount_due : entry.amount_received;
    document.getElementById('editEntryDetails').value = entry.details || '';
    modal.classList.add('open');
  }

  var priorSaveCharge = window.saveCharge;
  var stageOptionRequest = 0;
  async function refreshStageOptions(prefix, allowLookup) {
    var stageSelect = document.getElementById(prefix + 'Stage');
    var tmField = document.getElementById(prefix + 'TM');
    if (!stageSelect || !tmField) return;
    var request = ++stageOptionRequest;
    var tm = normalizeTM(tmField.value);
    var caseId = null;
    if (tm) {
      var knownEntry = (mem.entries || []).find(function (entry) {
        return entry.cases && normalizeTM(entry.cases.tm_no) === tm;
      });
      var knownCase = (mem.cases || []).find(function (row) { return normalizeTM(row.tm_no) === tm; });
      caseId = (knownEntry && knownEntry.cases.id) || (knownCase && knownCase.id);
      if (!caseId && allowLookup && sb) {
        var result = await lookupCaseByTM(tmField.value);
        if (result) caseId = result.id;
      }
    }
    if (request !== stageOptionRequest) return;
    Array.prototype.forEach.call(stageSelect.options, function (option) {
      if (!/^S[2-4]$/.test(option.value)) {
        option.disabled = false;
        return;
      }
      var previous = 'S' + (Number(option.value.slice(1)) - 1);
      var stageStatus = caseId ? caseStageTotals(caseId).stages[previous] : null;
      option.disabled = !stageStatus || !stageStatus.paid;
    });
    if (stageSelect.selectedOptions[0] && stageSelect.selectedOptions[0].disabled) {
      stageSelect.value = prefix === 'rc' ? '' : 'S1';
    }
  }

  ['ch', 'rc'].forEach(function (prefix) {
    var tmField = document.getElementById(prefix + 'TM');
    if (tmField) {
      tmField.addEventListener('input', function () { refreshStageOptions(prefix, false); });
      tmField.addEventListener('blur', function () { refreshStageOptions(prefix, true); });
    }
  });
  var oldChargeClientChange = window.onChargeClientChange;
  if (typeof oldChargeClientChange === 'function') {
    window.onChargeClientChange = function () {
      oldChargeClientChange.apply(this, arguments);
      refreshStageOptions('ch', true);
    };
  }
  var oldOpenChargeModal = window.openChargeModal;
  if (typeof oldOpenChargeModal === 'function') {
    window.openChargeModal = function () {
      var result = oldOpenChargeModal.apply(this, arguments);
      refreshStageOptions('ch', true);
      return result;
    };
  }
  var oldOpenReceivingModal = window.openReceivingModal;
  if (typeof oldOpenReceivingModal === 'function') {
    window.openReceivingModal = function () {
      var result = oldOpenReceivingModal.apply(this, arguments);
      refreshStageOptions('rc', true);
      return result;
    };
  }

  if (typeof priorSaveCharge === 'function') {
    window.saveCharge = async function () {
      var stage = document.getElementById('chStage').value;
      if (stage !== 'S1') {
        var tm = normalizeTM(document.getElementById('chTM').value);
        var caseEntry = (mem.entries || []).find(function (entry) {
          return entry.cases && normalizeTM(entry.cases.tm_no) === tm;
        });
        if (!caseEntry) {
          var lookup = await lookupCaseByTM(document.getElementById('chTM').value);
          if (lookup && lookup.id) {
            var totals = caseStageTotals(lookup.id);
            var previousStage = 'S' + (Number(stage.slice(1)) - 1);
            if (!totals.stages[previousStage] || !totals.stages[previousStage].paid) {
              return toast(previousStage + ' MUST BE FULLY CLEARED BEFORE ' + stage);
            }
          }
        } else {
          var stageStatus = caseStageTotals(caseEntry.cases.id).stages['S' + (Number(stage.slice(1)) - 1)];
          if (!stageStatus || !stageStatus.paid) return toast('PREVIOUS STAGE MUST BE FULLY CLEARED FIRST');
        }
      }
      return priorSaveCharge.apply(this, arguments);
    };
  }

  var originalLoadEntries = window.loadEntries;
  if (typeof originalLoadEntries === 'function') {
    window.loadEntries = async function () {
      var pageSize = 500;
      var entries = [];
      var cases = [];
      if (!sb) return;
      for (var entryOffset = 0; ; entryOffset += pageSize) {
        var entryResult = await sb.from('ledger_entries')
          .select('*, clients(client_code, client_name, email, phone, city), cases(id, tm_no, folder_no, application_name)')
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(entryOffset, entryOffset + pageSize - 1);
        if (entryResult.error) {
          toast('LEDGER ENTRIES COULD NOT BE LOADED: ' + entryResult.error.message);
          return;
        }
        entries = entries.concat(entryResult.data || []);
        if (!entryResult.data || entryResult.data.length < pageSize) break;
      }
      for (var caseOffset = 0; ; caseOffset += pageSize) {
        var result = await sb.from('cases')
          .select('id, client_id, tm_no, folder_no, application_name, status')
          .order('created_at', { ascending: false })
          .range(caseOffset, caseOffset + pageSize - 1);
        if (result.error) {
          toast('CASES COULD NOT BE LOADED: ' + result.error.message);
          return;
        }
        cases = cases.concat(result.data || []);
        if (!result.data || result.data.length < pageSize) break;
      }
      mem.entries = entries;
      mem.cases = cases;
      renderCaseList();
    };
  }

  async function signOutLedger() {
    if (!sb) return;
    var result = await sb.auth.signOut();
    if (result.error) {
      var message = document.getElementById('authMessage');
      if (message) message.textContent = result.error.message.toUpperCase();
      return;
    }
    document.getElementById('authGate').hidden = false;
    document.getElementById('signOutButton').style.display = 'none';
  }
  window.signOutLedger = signOutLedger;
  document.getElementById('authForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    var message = document.getElementById('authMessage');
    if (!sb || !sb.auth) {
      message.textContent = 'SUPABASE AUTH IS NOT CONFIGURED.';
      return;
    }
    message.textContent = 'SIGNING IN…';
    var result = await sb.auth.signInWithPassword({
      email: document.getElementById('authEmail').value.trim(),
      password: document.getElementById('authPassword').value
    });
    if (result.error) {
      message.textContent = result.error.message.toUpperCase();
      return;
    }
    message.textContent = '';
    document.getElementById('authGate').hidden = true;
    document.getElementById('signOutButton').style.display = '';
    await loadDashboard();
  });

  if (sb && sb.auth) {
    sb.auth.onAuthStateChange(function (event, session) {
      if (event === 'SIGNED_IN' && session) {
        document.getElementById('authGate').hidden = true;
        document.getElementById('signOutButton').style.display = '';
        setTimeout(function () { loadDashboard(); }, 0);
      } else if (event === 'SIGNED_OUT') {
        document.getElementById('authGate').hidden = false;
        document.getElementById('signOutButton').style.display = 'none';
      }
    });
    sb.auth.getSession().then(function (result) {
      if (result.error) {
        document.getElementById('authMessage').textContent = result.error.message.toUpperCase();
        return;
      }
      if (result.data.session) {
        document.getElementById('authGate').hidden = true;
        document.getElementById('signOutButton').style.display = '';
        loadDashboard();
      }
    });
  } else {
    document.getElementById('authMessage').textContent = 'SUPABASE CONNECTION IS REQUIRED.';
  }

  console.log('Brandex brand-patch v6 loaded (small logo + banks)');
})();

// Client-first ledger controls: selection, compact balances, series creation, and interaction polish.
(function () {
  var selectedLedgerEntries = new Set();

  function escape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  window.toggleLedgerEntrySelection = function (id, checked) {
    if (checked) selectedLedgerEntries.add(id); else selectedLedgerEntries.delete(id);
    var all = document.getElementById('selectAllLedgerEntries');
    if (all) all.checked = document.querySelectorAll('.ledger-entry-check:not(:disabled):not(:checked)').length === 0;
  };

  window.printSelectedClientEntries = function () {
    if (!selectedLedgerEntries.size) return toast('SELECT ONE OR MORE ENTRIES TO PRINT');
    var selected = (window._ledgerRows || []).filter(function (entry) { return selectedLedgerEntries.has(entry.id); });
    if (!selected.length) return toast('SELECTED ENTRIES ARE NOT IN THIS VIEW');
    var previous = window._ledgerRows;
    window._ledgerRows = selected;
    printLedgerA4();
    window._ledgerRows = previous;
  };

  window.voidSelectedEntries = async function () {
    var ids = Array.from(selectedLedgerEntries);
    if (!ids.length) return toast('SELECT ONE OR MORE ENTRIES FIRST');
    if (!confirm('DELETE ' + ids.length + ' SELECTED ENTR' + (ids.length === 1 ? 'Y' : 'IES') + '? THEY WILL BE VOIDED, NOT PERMANENTLY ERASED.')) return;
    if (!sb) return toast('SUPABASE REQUIRED');
    var result = await sb.from('ledger_entries')
      .update({ voided_at: new Date().toISOString(), void_reason: 'BULK DELETED FROM LEDGER' })
      .in('id', ids)
      .is('voided_at', null);
    if (result.error) return toast(result.error.message.toUpperCase());
    selectedLedgerEntries.clear();
    await loadEntries();
    await loadDashboard();
    if (currentClientId) await openClientLedger(currentClientId);
    toast(ids.length + ' ENTR' + (ids.length === 1 ? 'Y VOIDED' : 'IES VOIDED'));
  };

  window.openSeriesModal = function () {
    var modal = document.getElementById('modalSeries');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalSeries';
      modal.className = 'mo';
      modal.innerHTML = '<form class="mbox" id="seriesForm"><div class="mh"><div class="mt">NEW SERIES</div><button class="mc-btn" type="button" data-close-series>×</button></div>' +
        '<div class="mb"><div class="fg"><div class="fgroup"><label class="flbl" for="seriesCode">SERIES CODE *</label><input class="fi" id="seriesCode" maxlength="12" required placeholder="A"></div>' +
        '<div class="fgroup"><label class="flbl" for="seriesName">SERIES NAME *</label><input class="fi" id="seriesName" required placeholder="A-SERIES"></div></div></div>' +
        '<div class="mf"><button class="btn" type="button" data-close-series>CANCEL</button><button class="btn prim" type="submit">CREATE SERIES</button></div></form>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (event) {
        if (event.target === modal || event.target.closest('[data-close-series]')) modal.classList.remove('open');
      });
      modal.querySelector('#seriesForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!sb) return toast('SUPABASE REQUIRED');
        var code = document.getElementById('seriesCode').value.trim().toUpperCase();
        var name = document.getElementById('seriesName').value.trim().toUpperCase();
        if (!code || !name) return toast('SERIES CODE AND NAME ARE REQUIRED');
        var highest = (mem.series || []).reduce(function (max, row) { return Math.max(max, Number(row.sort_order || 0)); }, 0);
        var insert = await sb.from('series').insert({ code: code, name: name, prefix: code + '-', sort_order: highest + 10 }).select().single();
        if (insert.error) return toast(insert.error.message.toUpperCase());
        await loadSeries();
        document.getElementById('cSeries').value = insert.data.id;
        modal.classList.remove('open');
        toast('SERIES CREATED');
      });
    }
    document.getElementById('seriesCode').value = '';
    document.getElementById('seriesName').value = '';
    modal.classList.add('open');
  };

  window.renderClientEntries = function (rows) {
    var tbody = document.querySelector('#clientLedgerTable tbody');
    if (!tbody) return;
    var list = (rows || []).slice().sort(function (a, b) {
      return String(b.entry_date || '').localeCompare(String(a.entry_date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    tbody.innerHTML = list.map(function (entry) {
      var voided = !!entry.voided_at;
      var tm = entry.cases && (entry.cases.tm_no || entry.cases.folder_no) || '—';
      var app = entry.cases && entry.cases.application_name || '—';
      var actions = voided ? '<span class="case-status">VOIDED</span>' :
        '<button class="btn sm" data-action="edit" data-entry="' + escape(entry.id) + '">EDIT</button> ' +
        '<button class="btn sm del" data-action="void" data-entry="' + escape(entry.id) + '">VOID</button> ' +
        '<button class="btn sm" data-action="print" data-entry="' + escape(entry.id) + '">PRINT</button>';
      return '<tr class="' + escape(entry.entry_type) + '-row"' + (voided ? ' style="opacity:.45;text-decoration:line-through;"' : '') + '>' +
        '<td><input class="ledger-entry-check" type="checkbox" aria-label="Select ' + escape(entry.entry_date || '') + ' ' + escape(entry.entry_type) + ' entry" value="' + escape(entry.id) + '"' + (voided ? ' disabled' : '') + ' onchange="toggleLedgerEntrySelection(this.value,this.checked)"></td>' +
        '<td class="date-cell">' + escape(entry.entry_date || '') + '</td>' +
        '<td><span class="entry-kind ' + escape(entry.entry_type) + '">' + (voided ? 'VOID · ' : '') + (entry.entry_type === 'receiving' ? 'PAYMENT' : 'CHARGE') + '</span></td>' +
        '<td>' + stageBadge(entry.stage) + '</td><td class="folder-no"><strong>' + escape(tm) + '</strong></td>' +
        '<td class="application-cell">' + escape(app) + '</td>' +
        '<td>' + escape(entry.details || '') + (entry.payment_method ? ' · ' + escape(entry.payment_method) : '') + '</td>' +
        '<td class="amt-due">' + (entry.amount_due ? fmt(entry.amount_due) : '') + '</td><td class="amt-rec">' + (entry.amount_received ? fmt(entry.amount_received) : '') + '</td>' +
        '<td class="no-print">' + actions + '</td></tr>';
    }).join('');
    if (!list.length) tbody.innerHTML = '<tr><td colspan="10" class="empty">NO ENTRIES MATCH THESE FILTERS</td></tr>';
  };

  var selectAll = document.getElementById('selectAllLedgerEntries');
  if (selectAll) selectAll.addEventListener('change', function () {
    document.querySelectorAll('.ledger-entry-check:not(:disabled)').forEach(function (box) {
      box.checked = selectAll.checked;
      window.toggleLedgerEntrySelection(box.value, box.checked);
    });
  });

  document.addEventListener('input', function (event) {
    var field = event.target;
    if (field && (field.id === 'authEmail' || field.id === 'authPassword')) return;
    if (!field || !/^(INPUT|TEXTAREA)$/.test(field.tagName) || /^(password|date|number)$/i.test(field.type || '')) return;
    var start = field.selectionStart, end = field.selectionEnd;
    field.value = field.value.toUpperCase();
    if (typeof start === 'number' && typeof end === 'number') field.setSelectionRange(start, end);
  }, true);

  document.addEventListener('pointerup', function (event) {
    if (!event.target.closest('button,.ni,.client-card')) return;
    try {
      var Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      var context = new Context();
      var oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.frequency.value = 520;
      gain.gain.setValueAtTime(0.025, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.05);
    } catch (_) { /* Sound is optional. */ }
  });
})();
