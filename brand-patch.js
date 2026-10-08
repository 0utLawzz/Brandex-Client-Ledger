// Brandex brand-patch v8 — one-page dual ack CSS + TM payment status
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

  var box = document.getElementById('stageOutstanding');
  if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  if (typeof renderStageOutstanding === 'function') {
    renderStageOutstanding = function () {
      var b = document.getElementById('stageOutstanding');
      if (b) { b.style.display = 'none'; b.innerHTML = ''; }
    };
  }

  window.renderTmPaymentStatus = function (rows) {
    var el = document.getElementById('tmPaymentStatus');
    if (!el) return;
    var active = typeof activeEntries === 'function' ? activeEntries(rows) : (rows || []).filter(function (e) { return !e.voided_at; });
    if (!active.length) { el.style.display = 'none'; el.innerHTML = ''; return; }
    var by = {};
    active.forEach(function (e) {
      var key = (e.cases && (e.cases.tm_no || e.cases.application_name || e.cases.folder_no)) || (e.cases && e.cases.id ? String(e.cases.id).slice(0, 8) : 'General');
      if (!by[key]) by[key] = { due: 0, rec: 0, charges: 0, receivings: 0, stages: {} };
      by[key].due += Number(e.amount_due || 0);
      by[key].rec += Number(e.amount_received || 0);
      if (e.entry_type === 'charge') by[key].charges++;
      if (e.entry_type === 'receiving') by[key].receivings++;
      if (e.stage) by[key].stages[e.stage] = true;
    });
    var html = '';
    Object.keys(by).sort().forEach(function (k) {
      var b = by[k];
      var remain = Math.max(b.due - b.rec, 0);
      var full = b.due > 0 && remain === 0;
      var stages = Object.keys(b.stages).join(',');
      var badge = full
        ? '<span style="background:#0D9970;color:#fff;padding:2px 8px;font-size:11px;font-weight:700;">PAID IN FULL</span>'
        : (remain > 0 ? '<span style="background:#C94A00;color:#fff;padding:2px 8px;font-size:11px;font-weight:700;">BALANCE ' + fmt(remain) + '</span>' : '');
      html += '<div style="border:2px solid var(--black,#0C0C0C);padding:10px 12px;margin-bottom:8px;background:var(--bg-alt,#FAF6EE);">' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">' +
        '<div><strong style="font-size:16px;">TM / Case: ' + k + '</strong>' +
        '<span style="font-family:DM Mono,monospace;font-size:11px;color:var(--muted);margin-left:8px;">' +
        b.charges + ' charge(s) · ' + b.receivings + ' payment(s)' + (stages ? ' · stages ' + stages : '') +
        '</span></div>' + badge + '</div>' +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px;font-family:DM Mono,monospace;font-size:12px;">' +
        '<span>Due <strong>' + fmt(b.due) + '</strong></span>' +
        '<span>Received <strong style="color:var(--accent2,#0D9970)">' + fmt(b.rec) + '</strong></span>' +
        '<span>Remaining <strong>' + fmt(remain) + '</strong></span></div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:4px;">Split payments OK — each receiving row is one transaction / date.</div></div>';
    });
    el.innerHTML = html;
    el.style.display = 'block';
  };

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
        (c.phone ? ' · ' + c.phone : '') + (c.email ? ' · ' + c.email : '') + (c.city ? ' · ' + c.city : '') +
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
    window.renderTmPaymentStatus(rows);
    if (typeof renderClientEntries === 'function') renderClientEntries(rows);
    showPage('ledger');
  };

  filterLedgerByCase = function () {
    var id = document.getElementById('ledgerCaseFilter') && document.getElementById('ledgerCaseFilter').value;
    var rows = window._ledgerRows || [];
    if (id) rows = rows.filter(function (e) { return e.cases && e.cases.id === id; });
    if (typeof renderStageOutstanding === 'function') renderStageOutstanding(rows);
    window.renderTmPaymentStatus(rows);
    if (typeof renderClientEntries === 'function') renderClientEntries(rows);
  };

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyChrome);
  else applyChrome();

  (function () {
    var old = document.getElementById('bx-print-fix');
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = 'bx-print-fix';
    var D = '#8B3A00', G = '#0D9970', O = '#C94A00';
    s.textContent =
      '@media print{.navbar,.tb,.lh-actions,.no-print,.ni,.nb-stats,.nb-nav,.main,.page,.mo,.toast{display:none!important;}' +
      'body{background:#fff!important;margin:0;color:' + D + '!important;}' +
      '#printArea{display:block!important;visibility:visible!important;position:static!important;width:100%!important;}' +
      '#printArea table{display:table!important;width:100%!important;border-collapse:collapse!important;}' +
      '#printArea thead{display:table-header-group!important;}#printArea tbody{display:table-row-group!important;}' +
      '#printArea tr{display:table-row!important;}#printArea th,#printArea td{display:table-cell!important;}' +
      '#printArea img{display:inline-block!important;}' +
      '#printArea .print-head-row,#printArea .ack-row,#printArea .print-signs,#printArea .print-signs-sm,#printArea .ack-half-grid{display:flex!important;}' +
      '#printArea .ack-half-grid{display:grid!important;}' +
      '.ack-one-page{page-break-after:auto!important;page-break-inside:avoid;}' +
      '.ack-page{page-break-after:auto!important;}}' +
      '#printArea{display:none;}' +
      '.ack-sheet{border:3px solid ' + D + '!important;color:' + D + '!important;}' +
      '.print-card-wrap{margin-bottom:8px;border-bottom:2px solid ' + O + ';padding-bottom:6px;}' +
      '.print-logo-sm{width:32px;height:32px;border-radius:50%;border:2px solid ' + D + ';object-fit:cover;flex-shrink:0;}' +
      '.print-head-row{display:flex;align-items:center;gap:10px;}.print-head-text{text-align:left;}' +
      '.print-brand{font-family:Bebas Neue,sans-serif;font-size:18px!important;color:' + O + ';}' +
      '.print-sub{font-family:DM Mono,monospace;font-size:9px;color:#6b4423;}' +
      '.print-subtitle{font-family:Bebas Neue,sans-serif;font-size:14px;letter-spacing:2px;color:' + O + ';margin-top:4px;text-align:center;}' +
      '.ack-half{padding:4px 0;}' +
      '.ack-half-bar{text-align:right;margin-bottom:4px;}' +
      '.ack-half-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;}' +
      '.print-big-sm{font-family:Bebas Neue,sans-serif;font-size:18px;color:' + D + ';line-height:1.1;}' +
      '.print-big-sub-sm{font-size:12px;font-weight:700;}' +
      '.print-signs-sm{margin-top:8px;display:flex;justify-content:space-between;font-size:10px;}' +
      '.ack-banks-mini{margin-top:6px;font-size:9px;border:1px solid ' + G + ';padding:4px 6px;background:#E6F7F1;}' +
      '.ack-cut-line{border:none;border-top:2px dashed ' + D + ';margin:8px 0;padding:3px 0;text-align:center;font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;color:#6b4423;}' +
      '.print-group-title{font-family:DM Mono,monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:' + O + ';margin-bottom:2px;font-weight:700;}' +
      '.print-meta{font-family:DM Mono,monospace;font-size:10px;color:#6b4423;}' +
      '.print-pills{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0;}' +
      '.print-pill{display:inline-block;padding:2px 8px;border:1px solid ' + D + ';font-family:DM Mono,monospace;font-size:10px;font-weight:700;background:#FFF4E6;}' +
      '.print-pill.tm{background:#E6F7F1;border-color:' + G + ';color:' + G + ';}' +
      '.ack-copy{background:' + O + '!important;color:#fff!important;border:1px solid ' + D + ';padding:2px 8px;font-size:9px;}' +
      '.ack-row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e0c4a8;font-size:12px;}' +
      '.ack-row.total{font-weight:700;font-size:14px;border-top:2px solid ' + O + ';padding-top:4px;color:' + O + ';border-bottom:none;}' +
      '.print-big{font-family:Bebas Neue,sans-serif;font-size:24px;color:' + D + ';}' +
      '.print-big-sub{font-size:13px;font-weight:700;}' +
      '.print-table{width:100%;border-collapse:collapse;font-size:11px;}' +
      '.print-table th{background:' + D + '!important;color:#FAF6EE!important;padding:5px 6px;text-align:left;font-size:9px;}' +
      '.print-table td{padding:4px 6px;border-bottom:1px solid #e0c4a8;}.print-table .amt{text-align:right;font-weight:700;}';
    document.head.appendChild(s);
  })();

  console.log('Brandex brand-patch v8 loaded (one-page dual ack)');
})();
