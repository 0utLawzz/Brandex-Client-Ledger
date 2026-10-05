// Brandex brand-patch v3 — edit client, TM rules, forward stages, green print, no stage boxes
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

  // Hide stage outstanding boxes (not the desired UX)
  var box = document.getElementById('stageOutstanding');
  if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  if (typeof renderStageOutstanding === 'function') {
    renderStageOutstanding = function () {
      var b = document.getElementById('stageOutstanding');
      if (b) { b.style.display = 'none'; b.innerHTML = ''; }
    };
  }

  // --- Recent 10 ---
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

  // --- Edit client ---
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

  // Client cards: edit button + bold key info
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
        edit.style.cssText = 'margin-top:8px;width:100%;';
        edit.onclick = function (ev) {
          ev.stopPropagation();
          openClientModal(id);
        };
        card.appendChild(edit);
      });
    };
  }

  // --- Client ledger: bold TM / amounts, no stage boxes ---
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
    if (title) title.innerHTML = '<strong style="font-size:1.1em">' + (c.client_code || '') + '</strong> · Ledger';
    var sub = document.getElementById('ledgerSub');
    if (sub) {
      sub.innerHTML = '<strong>' + (c.client_name || '') + '</strong>' +
        (c.phone ? ' · ' + c.phone : '') +
        (c.email ? ' · ' + c.email : '') +
        (c.city ? ' · ' + c.city : '') +
        ' · Balance <strong style="color:' + (bal > 0 ? 'var(--accent)' : 'var(--accent2)') + '">' + fmt(bal) + '</strong>';
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

  // Bold TM + amounts in ledger rows
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

  // --- TM uniqueness (global) + stage forward-only on saveCharge ---
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

      // Global TM uniqueness: if TM exists on another client, block
      if (tmNorm) {
        var q = await sb.from('cases').select('id, client_id, tm_no, clients(client_code, client_name)').eq('tm_no_normalized', tmNorm).maybeSingle();
        if (q.data && q.data.client_id !== clientId) {
          var owner = q.data.clients ? ((q.data.clients.client_code || '') + ' — ' + (q.data.clients.client_name || '')) : 'another client';
          return toast('TM ' + tm + ' already belongs to ' + owner + '. Cannot add to this ledger.');
        }
      }

      // Stage forward-only for this TM/case
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

  // Block receiving against foreign TM
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

  // Current View + Print Current
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

  // Print CSS — hard green theme (#0D9970) instead of black
  (function () {
    var old = document.getElementById('bx-print-fix');
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = 'bx-print-fix';
    var G = '#0D9970';
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
      '.ack-sheet{border:3px solid ' + G + '!important;}' +
      '.ack-head,.print-head{border-bottom:3px solid ' + G + '!important;}' +
      '.ack-brand,.print-brand{color:' + G + '!important;}' +
      '.ack-copy{background:' + G + '!important;color:#fff!important;border-color:' + G + '!important;}' +
      '.ack-row.total{border-top:2px solid ' + G + '!important;color:' + G + '!important;}' +
      '.ack-banks{border-color:' + G + '!important;background:#E6F7F1!important;}' +
      '.ack-title{text-align:center;font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:2px;margin:12px 0;color:' + G + ';}' +
      '.print-table{width:100%;border-collapse:collapse;font-size:11px;}' +
      '.print-table th{background:' + G + '!important;color:#FAF6EE!important;padding:6px 8px;text-align:left;font-family:DM Mono,monospace;font-size:9px;text-transform:uppercase;border:1px solid ' + G + ';}' +
      '.print-table td{padding:5px 8px;border-bottom:1px solid #c5e6d9;vertical-align:top;}' +
      '.print-table .amt{text-align:right;font-family:DM Mono,monospace;font-weight:700;}' +
      '.print-brand{font-family:Bebas Neue,sans-serif;font-size:26px;letter-spacing:2px;color:' + G + ';}' +
      '.print-sub{font-family:DM Mono,monospace;font-size:10px;color:#555;}' +
      '.report-divider{border-top:3px solid ' + G + ';margin:18px 0 10px;padding-top:8px;}' +
      '.cc-edit{font-size:10px!important;}';
    document.head.appendChild(s);
  })();

  console.log('Brandex brand-patch v3 loaded');
})();
