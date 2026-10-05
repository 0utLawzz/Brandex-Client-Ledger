// Brand + stage UX patch (after gaps.js + gaps-print.js)
(function () {
  var A = window.BRANDEX_ASSETS || {};

  // Favicon + nav logo
  function applyChrome() {
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = A.favicon || 'assets/favicon.png';

    var brand = document.querySelector('.nb-brand');
    if (brand && !brand.querySelector('.nb-logo')) {
      var img = document.createElement('img');
      img.className = 'nb-logo';
      img.alt = 'Brandex';
      img.src = A.logoMark || 'assets/logo-mark.png';
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

  // Stage outstanding: complete marker + colors
  if (typeof renderStageOutstanding === 'function') {
    var _rso = renderStageOutstanding;
    renderStageOutstanding = function (rows) {
      var box = document.getElementById('stageOutstanding');
      if (!box) return _rso(rows);
      var active = (typeof activeEntries === 'function') ? activeEntries(rows) : (rows || []);
      var any = false;
      box.innerHTML = '';
      ['S1', 'S2', 'S3', 'S4'].forEach(function (st) {
        var d = 0, r = 0;
        active.filter(function (e) { return e.stage === st; }).forEach(function (e) {
          d += Number(e.amount_due || 0);
          r += Number(e.amount_received || 0);
        });
        if (d || r) any = true;
        var out = Math.max(d - r, 0);
        var done = d > 0 && out === 0;
        var cls = done ? 'g complete' : (out > 0 ? 'y' : (r > 0 ? 'g' : 'b'));
        var label = (typeof stageLabel === 'function') ? stageLabel(st) : st;
        var status = done
          ? '<span class="stage-complete">COMPLETE</span>'
          : '<div class="sc-sub">Due ' + fmt(d) + ' · Rec ' + fmt(r) + '</div>';
        box.innerHTML += '<div class="sc ' + cls + '" style="padding:12px;">' +
          '<div class="sc-lbl">' + label + '</div>' +
          '<div class="sc-val" style="font-size:22px;">' + (done ? '✓' : fmt(out)) + '</div>' +
          status + '</div>';
      });
      box.style.display = any ? 'grid' : 'none';
    };
  }

  // Richer acknowledgment with logo + brand color
  if (typeof buildAckHTML === 'function') {
    var _build = buildAckHTML;
    buildAckHTML = function (entry, copyLabel) {
      var client = entry.clients || (mem.clients || []).find(function (c) { return c.id === entry.client_id; }) || {};
      var tm = (entry.cases && entry.cases.tm_no) || '—';
      var app = (entry.cases && entry.cases.application_name) || '—';
      var logo = A.logoMark || 'assets/logo-mark.png';
      var stageTxt = (typeof stageLabel === 'function') ? stageLabel(entry.stage) : (entry.stage || 'General');
      return '<div class="ack-sheet ack-page">' +
        '<div class="ack-head" style="display:flex;justify-content:space-between;align-items:center;background:#FFF0E6;padding:12px;border-bottom:3px solid #C94A00;">' +
        '<div style="display:flex;gap:12px;align-items:center;">' +
        '<img class="ack-logo" src="' + logo + '" alt="Brandex">' +
        '<div><div class="ack-brand" style="color:#C94A00;">' + (A.name || 'Brandex Law Associates') + '</div>' +
        '<div class="ack-sub">' + (A.tagline || 'TRADEMARK REGISTRY') + '</div>' +
        '<div class="ack-sub">' + (A.web || 'BRANDEX.PK') + ' · ' + (A.email || '') + '</div></div></div>' +
        '<div class="ack-copy" style="background:#C94A00;color:#fff;border-color:#0C0C0C;">' + copyLabel + '</div></div>' +
        '<div style="text-align:center;font-family:Bebas Neue,sans-serif;font-size:22px;letter-spacing:2px;margin:12px 0;color:#0C0C0C;">PAYMENT ACKNOWLEDGMENT</div>' +
        '<div class="ack-row"><span>Receipt No</span><span>' + (entry.receipt_no || '—') + '</span></div>' +
        '<div class="ack-row"><span>Date</span><span>' + (entry.entry_date || '') + '</span></div>' +
        '<div class="ack-row"><span>Client</span><span>' + (client.client_code || '') + ' — ' + (client.client_name || '') + '</span></div>' +
        '<div class="ack-row"><span>Phone</span><span>' + (client.phone || '—') + '</span></div>' +
        '<div class="ack-row"><span>Email</span><span>' + (client.email || '—') + '</span></div>' +
        '<div class="ack-row"><span>TM Number</span><span>' + tm + '</span></div>' +
        '<div class="ack-row"><span>Application</span><span>' + app + '</span></div>' +
        '<div class="ack-row"><span>Stage</span><span>' + stageTxt + '</span></div>' +
        '<div class="ack-row"><span>Method</span><span>' + (entry.payment_method || '—') + '</span></div>' +
        '<div class="ack-row"><span>Details</span><span>' + (entry.details || '') + '</span></div>' +
        '<div class="ack-row total" style="color:#C94A00;"><span>Amount Received</span><span>PKR ' + fmt(entry.amount_received) + '</span></div>' +
        '<div class="ack-banks" style="border-color:#C94A00;background:#FFF0E6;"><strong style="color:#C94A00;">Bank payment details</strong><br>' +
        'Meezan Bank Limited — use account details on invoice<br>National Bank of Pakistan — use account details on invoice</div>' +
        '<div style="margin-top:28px;display:flex;justify-content:space-between;font-family:DM Mono,monospace;font-size:11px;">' +
        '<div>_________________<br>Received by</div><div>_________________<br>Client / Bearer</div></div>' +
        '<div style="margin-top:16px;text-align:center;font-family:DM Mono,monospace;font-size:9px;color:#555;">Thank you · ' + (A.name || 'Brandex') + ' · ' + (A.web || '') + '</div></div>';
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyChrome);
  else applyChrome();
  console.log('Brandex brand-patch loaded');
})();
