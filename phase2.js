(function () {
  if (document.getElementById('authGate') && document.getElementById('clientCaseTableBody')) return;
  var stages = ['S1', 'S2', 'S3', 'S4'];
  var stageOrder = { S1: 1, S2: 2, S3: 3, S4: 4 };
  var caseCache = {};
  var cacheEntries = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
  function active(row) { return !row.voided_at; }
  function norm(value) { return String(value || '').replace(/\D/g, ''); }
  function fmtAmount(value) {
    return typeof fmt === 'function' ? fmt(value) : Number(value || 0).toLocaleString();
  }
  function rebuildCaseCache() {
    if (cacheEntries === mem.entries) return;
    cacheEntries = mem.entries;
    caseCache = {};
    (mem.entries || []).forEach(function (entry) {
      if (!entry.case_id) return;
      var group = caseCache[entry.case_id] || (caseCache[entry.case_id] = { charges: [], receipts: [], case: null });
      if (entry.entry_type === 'charge' && active(entry)) group.charges.push(entry);
      if (entry.entry_type === 'receiving' && active(entry)) group.receipts.push(entry);
      if (entry.cases) group.case = entry.cases;
    });
  }
  function totalsFor(caseId) {
    rebuildCaseCache();
    var group = caseCache[caseId] || { charges: [], receipts: [], case: null };
    var general = group.receipts.reduce(function (sum, entry) {
      return sum + (!entry.stage && !entry.linked_entry_id ? Number(entry.amount_received || 0) : 0);
    }, 0);
    var totals = {};
    stages.forEach(function (stage) {
      var due = group.charges.reduce(function (sum, entry) {
        return sum + (entry.stage === stage ? Number(entry.amount_due || 0) : 0);
      }, 0);
      var received = group.receipts.reduce(function (sum, entry) {
        if (entry.linked_entry_id) {
          var linked = group.charges.find(function (charge) { return charge.id === entry.linked_entry_id; });
          return sum + (linked && linked.stage === stage ? Number(entry.amount_received || 0) : 0);
        }
        return sum + (entry.stage === stage ? Number(entry.amount_received || 0) : 0);
      }, 0);
      var applied = Math.min(general, Math.max(due - received, 0));
      general = Math.max(general - applied, 0);
      totals[stage] = { due: due, received: received + applied, outstanding: Math.max(0, due - received - applied), paid: due > 0 && received + applied >= due };
    });
    return totals;
  }

  function addAuthGate() {
    var gate = document.createElement('section');
    gate.className = 'phase2-auth';
    gate.id = 'authGate';
    gate.setAttribute('aria-labelledby', 'phase2AuthTitle');
    gate.innerHTML = '<form class="phase2-auth-card" id="phase2AuthForm"><h1 id="phase2AuthTitle">STAFF SIGN IN</h1>' +
      '<p>USE YOUR BRANDEX LEDGER STAFF ACCOUNT.</p><label for="phase2Email">EMAIL</label>' +
      '<input class="fi" id="phase2Email" type="email" autocomplete="username" required>' +
      '<label for="phase2Password">PASSWORD</label><input class="fi" id="phase2Password" type="password" autocomplete="current-password" required>' +
      '<button class="btn prim" type="submit">SIGN IN</button><p id="phase2AuthMessage" role="status"></p></form>';
    document.body.appendChild(gate);
    var signOut = document.createElement('button');
    signOut.id = 'phase2SignOut';
    signOut.className = 'btn sm';
    signOut.textContent = 'SIGN OUT';
    signOut.hidden = true;
    signOut.onclick = async function () {
      var result = await sb.auth.signOut();
      if (result.error) document.getElementById('phase2AuthMessage').textContent = result.error.message.toUpperCase();
    };
    var nav = document.querySelector('.navbar .nb-stats') || document.querySelector('.navbar');
    if (nav) nav.appendChild(signOut);
    gate.hidden = false;
    document.getElementById('phase2AuthForm').addEventListener('submit', async function (event) {
      event.preventDefault();
      var result = await sb.auth.signInWithPassword({
        email: document.getElementById('phase2Email').value.trim(),
        password: document.getElementById('phase2Password').value
      });
      document.getElementById('phase2AuthMessage').textContent = result.error ? result.error.message.toUpperCase() : '';
    });
    sb.auth.onAuthStateChange(function (event, session) {
      gate.hidden = event === 'SIGNED_IN' && !!session;
      signOut.hidden = !session;
      if (event === 'SIGNED_IN' && session) setTimeout(loadDashboard, 0);
    });
    sb.auth.getSession().then(function (result) {
      if (result.error) {
        document.getElementById('phase2AuthMessage').textContent = result.error.message.toUpperCase();
        return;
      }
      gate.hidden = !!result.data.session;
      signOut.hidden = !result.data.session;
      if (result.data.session) loadDashboard();
    });
  }

  function installCasePanel() {
    var page = document.getElementById('page-ledger');
    var toolbar = page && page.querySelector('.lh-actions');
    if (!toolbar) return;
    var section = document.createElement('section');
    section.className = 'phase2-case-panel';
    section.innerHTML = '<header>CASES & FOLDERS</header><div class="phase2-case-filters">' +
      '<input class="fi" id="phase2CaseSearch" type="search" placeholder="SEARCH TM / FOLDER / APPLICATION">' +
      '<select class="fsel" id="phase2CaseStage"><option value="">ALL STAGES</option><option>S1</option><option>S2</option><option>S3</option><option>S4</option></select>' +
      '<select class="fsel" id="phase2CaseStatus"><option value="">ALL STATUS</option><option value="DUE">OUTSTANDING</option><option value="PAID">CLEARED</option></select>' +
      '<input class="fi" id="phase2DateFrom" type="date" aria-label="Filter from date">' +
      '<input class="fi" id="phase2DateTo" type="date" aria-label="Filter to date"></div>' +
      '<div class="phase2-case-wrap"><table class="phase2-case-table"><thead><tr><th>CASE / TM</th><th>FOLDER</th><th>APPLICATION</th><th>STAGE STATUS</th><th>OUTSTANDING</th><th></th></tr></thead><tbody id="clientCaseTableBody"></tbody></table></div>';
    toolbar.insertAdjacentElement('afterend', section);
    var panel = document.createElement('section');
    panel.id = 'stageOutstanding';
    panel.className = 'phase2-stage-panel';
    section.insertAdjacentElement('afterend', panel);
    ['phase2CaseSearch'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', renderCases);
    });
    ['phase2CaseStage', 'phase2CaseStatus', 'ledgerCaseFilter', 'phase2DateFrom', 'phase2DateTo'].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.addEventListener('change', refreshLedger);
    });
    document.getElementById('clientCaseTableBody').addEventListener('click', function (event) {
      var row = event.target.closest('[data-case-id]');
      if (!row) return;
      var filter = document.getElementById('ledgerCaseFilter');
      if (filter) {
        filter.value = row.getAttribute('data-case-id');
        filter.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('clientLedgerTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    var ledger = document.getElementById('clientLedgerTable');
    if (ledger) ledger.addEventListener('click', onEntryAction);
  }

  function clientCases(clientId) {
    var found = {};
    (mem.cases || []).forEach(function (row) {
      if (row.client_id === clientId) found[row.id] = row;
    });
    (mem.entries || []).forEach(function (entry) {
      if (entry.client_id === clientId && entry.cases && entry.cases.id) found[entry.cases.id] = entry.cases;
    });
    return found;
  }
  function renderCases() {
    var body = document.getElementById('clientCaseTableBody');
    if (!body || !currentClientId) return;
    var query = (document.getElementById('phase2CaseSearch').value || '').toUpperCase();
    var wantedStage = document.getElementById('phase2CaseStage').value;
    var wantedStatus = document.getElementById('phase2CaseStatus').value;
    var caseRows = clientCases(currentClientId);
    var cases = Object.keys(caseRows).map(function (id) {
      var row = caseRows[id];
      var stageTotals = totalsFor(id);
      var activeStages = stages.filter(function (stage) { return stageTotals[stage].due > 0; });
      var paid = activeStages.length > 0 && activeStages.every(function (stage) { return stageTotals[stage].paid; });
      var due = stages.reduce(function (sum, stage) { return sum + stageTotals[stage].outstanding; }, 0);
      return { row: row, id: id, totals: stageTotals, active: activeStages, paid: paid, due: due };
    }).filter(function (item) {
      var searchable = [item.row.tm_no, item.row.folder_no, item.row.application_name].join(' ').toUpperCase();
      if (query && !searchable.includes(query)) return false;
      if (wantedStage && !item.active.includes(wantedStage)) return false;
      if (wantedStatus === 'PAID' && !item.paid) return false;
      if (wantedStatus === 'DUE' && (!item.active.length || item.paid)) return false;
      return true;
    }).sort(function (a, b) {
      return String(a.row.tm_no || a.row.folder_no || '').localeCompare(String(b.row.tm_no || b.row.folder_no || ''));
    });
    body.innerHTML = cases.map(function (item) {
      var badges = item.active.length ? item.active.map(function (stage) {
        return '<span class="phase2-status ' + (item.totals[stage].paid ? 'paid' : 'due') + '">' +
          stage + ' ' + (item.totals[stage].paid ? 'CLEARED' : 'DUE') + '</span>';
      }).join(' ') : '<span class="phase2-status">NO CHARGES</span>';
      return '<tr data-case-id="' + esc(item.id) + '"><td><strong>' + esc(item.row.tm_no || 'NO TM') +
        '</strong></td><td>' + esc(item.row.folder_no || '—') + '</td><td>' + esc(item.row.application_name || '—') +
        '</td><td>' + badges + '</td><td>' + fmtAmount(item.due) +
        '</td><td><button class="btn sm" type="button">OPEN CASE</button></td></tr>';
    }).join('');
    if (!cases.length) body.innerHTML = '<tr><td colspan="6">NO CASES MATCH FILTERS</td></tr>';
    renderStagePanel();
  }
  function renderStagePanel() {
    var panel = document.getElementById('stageOutstanding');
    if (!panel || !currentClientId) return;
    var filter = document.getElementById('ledgerCaseFilter');
    var caseId = filter && filter.value;
    var caseIds = Object.keys(clientCases(currentClientId)).filter(function (id) { return !caseId || caseId === id; });
    panel.innerHTML = stages.map(function (stage) {
      var due = 0, outstanding = 0;
      caseIds.forEach(function (id) {
        var totals = totalsFor(id)[stage];
        due += totals.due;
        outstanding += totals.outstanding;
      });
      return '<div class="phase2-stage-card">' + stage + ' OUTSTANDING<strong>PKR ' +
        fmtAmount(outstanding) + '</strong>' + (due > 0 && outstanding === 0 ? 'CLEARED' : 'CHARGED PKR ' + fmtAmount(due)) + '</div>';
    }).join('');
  }

  function renderLedger(rows) {
    var tbody = document.querySelector('#clientLedgerTable tbody');
    if (!tbody) return;
    var from = document.getElementById('phase2DateFrom').value;
    var to = document.getElementById('phase2DateTo').value;
    var caseId = document.getElementById('ledgerCaseFilter') && document.getElementById('ledgerCaseFilter').value;
    var filtered = (rows || []).filter(function (entry) {
      if (caseId && (!entry.cases || entry.cases.id !== caseId)) return false;
      if (from && String(entry.entry_date || '') < from) return false;
      if (to && String(entry.entry_date || '') > to) return false;
      return true;
    }).slice().sort(function (a, b) {
      return String(b.entry_date || '').localeCompare(String(a.entry_date || '')) ||
        String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    if (currentViewMode) filtered = filtered.slice(0, 6);
    tbody.innerHTML = filtered.map(function (entry) {
      var kind = entry.entry_type === 'receiving' ? 'RECEIVING' : 'CHARGE';
      var caseName = entry.cases && (entry.cases.tm_no || entry.cases.folder_no || entry.cases.application_name) || '—';
      var menu = entry.voided_at ? '<span class="phase2-status">VOIDED</span>' :
        '<details class="phase2-menu"><summary class="btn sm">ACTIONS ▾</summary><div class="phase2-actions">' +
        '<button class="btn sm prim" data-entry-action="charge" data-tm="' + esc(entry.cases && entry.cases.tm_no) + '">CHARGE</button>' +
        '<button class="btn sm ok" data-entry-action="receive" data-tm="' + esc(entry.cases && entry.cases.tm_no) + '">RECEIVE</button>' +
        '<button class="btn sm" data-entry-action="edit" data-id="' + esc(entry.id) + '">EDIT</button>' +
        '<button class="btn sm del" data-entry-action="void" data-id="' + esc(entry.id) + '">VOID</button>' +
        '<button class="btn sm" data-entry-action="print" data-id="' + esc(entry.id) + '">PRINT</button></div></details>';
      return '<tr class="' + esc(entry.entry_type) + '-row"><td>' + esc(entry.entry_date || '') +
        '</td><td><span class="phase2-type ' + esc(entry.entry_type) + '">' + (entry.voided_at ? 'VOID · ' : '') + kind +
        '</span></td><td>' + (typeof stageBadge === 'function' ? stageBadge(entry.stage) : esc(entry.stage || '—')) +
        '</td><td>' + esc(caseName) + '</td><td>' + esc(entry.details || '') +
        '</td><td class="amt-due">' + (entry.amount_due ? fmtAmount(entry.amount_due) : '') +
        '</td><td class="amt-rec">' + (entry.amount_received ? fmtAmount(entry.amount_received) : '') +
        '</td><td>' + menu + '</td></tr>';
    }).join('');
    if (!filtered.length) tbody.innerHTML = '<tr><td colspan="8" class="empty">NO ENTRIES</td></tr>';
  }
  function refreshLedger() {
    renderCases();
    renderLedger(window._ledgerRows || []);
    renderStagePanel();
  }

  function installDashboard() {
    var dashboard = document.getElementById('page-dashboard');
    var kpis = dashboard && dashboard.querySelector('.sg');
    if (kpis && !document.getElementById('phase2Today')) {
      var card = document.createElement('div');
      card.className = 'sc b';
      card.innerHTML = '<div class="sc-lbl">TODAY</div><div class="sc-val" id="phase2Today">0</div><div class="sc-sub">ENTRIES POSTED</div>';
      kpis.appendChild(card);
    }
    var recent = document.querySelector('#recentTable tbody');
    if (recent) while (recent.rows.length > 10) recent.deleteRow(10);
    if (dashboard && !document.getElementById('phase2MonthlyChart')) {
      var chart = document.createElement('section');
      chart.id = 'phase2MonthlyChart';
      chart.className = 'phase2-chart';
      chart.innerHTML = '<h2>MONTHLY CHARGES & RECEIVINGS · LAST 6 MONTHS</h2><div class="phase2-legend">🟠 CHARGES &nbsp; 🟢 RECEIVINGS</div><div class="phase2-bars"></div>';
      kpis.insertAdjacentElement('afterend', chart);
    }
    renderDashboard();
  }
  function renderDashboard() {
    var rows = (mem.entries || []).filter(active);
    var localDate = new Date();
    var today = localDate.getFullYear() + '-' + String(localDate.getMonth() + 1).padStart(2, '0') +
      '-' + String(localDate.getDate()).padStart(2, '0');
    var todayElement = document.getElementById('phase2Today');
    if (todayElement) todayElement.textContent = String(rows.filter(function (entry) { return entry.entry_date === today; }).length);
    var chart = document.querySelector('#phase2MonthlyChart .phase2-bars');
    if (!chart) return;
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var date = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
      months.push({ key: date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0'), label: date.toLocaleDateString('en', { month: 'short' }).toUpperCase(), charge: 0, receiving: 0 });
    }
    rows.forEach(function (entry) {
      var month = months.find(function (item) { return item.key === String(entry.entry_date || '').slice(0, 7); });
      if (month && entry.entry_type === 'charge') month.charge += Number(entry.amount_due || 0);
      if (month && entry.entry_type === 'receiving') month.receiving += Number(entry.amount_received || 0);
    });
    var max = Math.max(1, ...months.map(function (month) { return Math.max(month.charge, month.receiving); }));
    chart.innerHTML = months.map(function (month) {
      return '<div class="phase2-month" title="' + month.label + ' CHARGES ' + fmtAmount(month.charge) +
        ' · RECEIVINGS ' + fmtAmount(month.receiving) + '"><div class="phase2-barbox">' +
        '<i class="phase2-bar charge" style="height:' + (month.charge ? Math.max(3, month.charge / max * 100) : 0) +
        '%"></i><i class="phase2-bar receiving" style="height:' + (month.receiving ? Math.max(3, month.receiving / max * 100) : 0) +
        '%"></i></div>' + month.label + '</div>';
    }).join('');
  }

  function stageOptionUpdate(prefix) {
    var select = document.getElementById(prefix + 'Stage');
    var tm = document.getElementById(prefix + 'TM');
    if (!select || !tm) return;
    var id = null, normalized = norm(tm.value);
    var entry = (mem.entries || []).find(function (item) { return item.cases && norm(item.cases.tm_no) === normalized; });
    var caseRow = (mem.cases || []).find(function (item) { return norm(item.tm_no) === normalized; });
    id = (entry && entry.cases.id) || (caseRow && caseRow.id);
    Array.prototype.forEach.call(select.options, function (option) {
      var order = stageOrder[option.value];
      if (!order || order === 1) { option.disabled = false; return; }
      var previous = totalsFor(id)[stages[order - 2]];
      option.disabled = !previous || !previous.paid;
    });
    if (select.selectedOptions[0] && select.selectedOptions[0].disabled) select.value = prefix === 'rc' ? '' : 'S1';
  }

  function installStageGate() {
    ['ch', 'rc'].forEach(function (prefix) {
      var input = document.getElementById(prefix + 'TM');
      if (input) {
        input.addEventListener('input', function () { stageOptionUpdate(prefix); });
        input.addEventListener('blur', function () { stageOptionUpdate(prefix); });
      }
    });
    var save = window.saveCharge;
    if (typeof save === 'function') {
      window.saveCharge = async function () {
        var stage = document.getElementById('chStage').value;
        var order = stageOrder[stage];
        if (order > 1) {
          var tm = norm(document.getElementById('chTM').value);
          var entry = (mem.entries || []).find(function (item) { return item.cases && norm(item.cases.tm_no) === tm; });
          var caseRow = (mem.cases || []).find(function (item) { return norm(item.tm_no) === tm; });
          var id = (entry && entry.cases.id) || (caseRow && caseRow.id);
          if (!id || !totalsFor(id)[stages[order - 2]].paid) {
            return toast('PREVIOUS STAGE MUST BE FULLY CLEARED FIRST');
          }
        }
        return save.apply(this, arguments);
      };
    }
  }

  function openEdit(entry) {
    var modal = document.getElementById('phase2EditModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'phase2EditModal';
      modal.className = 'phase2-edit';
      modal.innerHTML = '<form><h2>EDIT ENTRY</h2><label>DATE</label><input id="phase2EditDate" type="date" required>' +
        '<label>AMOUNT</label><input id="phase2EditAmount" type="number" min="0.01" step="0.01" required>' +
        '<label>DETAILS</label><input id="phase2EditDetails" type="text"><div><button class="btn" type="button" data-cancel>Cancel</button> ' +
        '<button class="btn prim" type="submit">Save</button></div></form>';
      document.body.appendChild(modal);
      modal.addEventListener('click', function (event) { if (event.target === modal || event.target.closest('[data-cancel]')) modal.classList.remove('open'); });
      modal.querySelector('form').addEventListener('submit', async function (event) {
        event.preventDefault();
        var original = (mem.entries || []).find(function (item) { return item.id === modal.dataset.id; });
        if (!original) return toast('ENTRY NOT FOUND');
        var amount = Number(document.getElementById('phase2EditAmount').value);
        if (!Number.isFinite(amount) || amount <= 0) return toast('ENTER A VALID AMOUNT');
        var changes = { entry_date: document.getElementById('phase2EditDate').value, details: document.getElementById('phase2EditDetails').value.trim().toUpperCase() };
        changes[original.entry_type === 'charge' ? 'amount_due' : 'amount_received'] = amount;
        var result = await sb.from('ledger_entries').update(changes).eq('id', original.id).is('voided_at', null);
        if (result.error) return toast(result.error.message);
        modal.classList.remove('open');
        await loadDashboard();
        if (currentClientId) await openClientLedger(currentClientId);
        toast('ENTRY UPDATED');
      });
    }
    modal.dataset.id = entry.id;
    document.getElementById('phase2EditDate').value = entry.entry_date || '';
    document.getElementById('phase2EditAmount').value = entry.entry_type === 'charge' ? entry.amount_due : entry.amount_received;
    document.getElementById('phase2EditDetails').value = entry.details || '';
    modal.classList.add('open');
  }
  function printEntry(entry) {
    var area = document.getElementById('printArea');
    if (!area) return window.print();
    var previous = area.innerHTML;
    var client = entry.clients || (mem.clients || []).find(function (item) { return item.id === entry.client_id; }) || {};
    var isReceiving = entry.entry_type === 'receiving';
    var amount = isReceiving ? entry.amount_received : entry.amount_due;
    var caseName = entry.cases && (entry.cases.tm_no || entry.cases.folder_no || entry.cases.application_name);
    area.innerHTML = '<article class="phase2-print-sheet ' + (isReceiving ? 'receiving' : 'charge') + '">' +
      '<h1>' + (isReceiving ? 'RECEIVING RECORD' : 'CHARGE RECORD') + '</h1>' +
      '<p><strong>CLIENT:</strong> ' + esc(client.client_name || client.client_code || '—') + '</p>' +
      '<p><strong>DATE:</strong> ' + esc(entry.entry_date || '—') + '</p>' +
      '<p><strong>CASE / TM:</strong> ' + esc(caseName || '—') + '</p>' +
      '<p><strong>STAGE:</strong> ' + esc(entry.stage || 'GENERAL') + '</p>' +
      '<p><strong>DETAILS:</strong> ' + esc(entry.details || '—') + '</p>' +
      '<p class="amount"><strong>' + (isReceiving ? 'RECEIVED' : 'CHARGED') + ':</strong> PKR ' + esc(fmtAmount(amount)) + '</p>' +
      (isReceiving ? '<p><strong>RECEIPT NO:</strong> ' + esc(entry.receipt_no || '—') + '</p>' : '') +
      '<p><strong>STATUS:</strong> ' + (entry.voided_at ? 'VOIDED' : 'ACTIVE') + '</p></article>';
    window.addEventListener('afterprint', function restorePrintArea() {
      area.innerHTML = previous;
    }, { once: true });
    window.print();
  }
  function onEntryAction(event) {
    var button = event.target.closest('[data-entry-action]');
    if (!button) return;
    var action = button.getAttribute('data-entry-action');
    var id = button.getAttribute('data-id');
    var entry = (mem.entries || []).find(function (item) { return item.id === id; });
    if (action === 'charge') {
      openChargeModal(currentClientId);
      document.getElementById('chTM').value = button.getAttribute('data-tm') || '';
      stageOptionUpdate('ch');
    } else if (action === 'receive') {
      openReceivingModal(currentClientId);
      document.getElementById('rcTM').value = button.getAttribute('data-tm') || '';
      stageOptionUpdate('rc');
    } else if (!entry) toast('ENTRY NOT FOUND');
    else if (action === 'edit') openEdit(entry);
    else if (action === 'void' && typeof voidEntry === 'function') voidEntry(id);
    else if (action === 'print' && entry.entry_type === 'receiving' && typeof printAck === 'function') printAck(id);
    else if (action === 'print') printEntry(entry);
  }

  async function loadCases() {
    if (!sb || !sb.auth) return;
    var all = [], pageSize = 500;
    for (var offset = 0; ; offset += pageSize) {
      var result = await sb.from('cases').select('id,client_id,tm_no,folder_no,application_name,status')
        .order('created_at').range(offset, offset + pageSize - 1);
      if (result.error) return toast('CASES COULD NOT BE LOADED: ' + result.error.message);
      all = all.concat(result.data || []);
      if (!result.data || result.data.length < pageSize) break;
    }
    mem.cases = all;
    renderCases();
  }
  function installPaging() {
    var originalEntries = window.loadEntries;
    if (typeof originalEntries === 'function') {
      window.loadEntries = async function () {
        if (!sb) return originalEntries.apply(this, arguments);
        var all = [], pageSize = 500;
        for (var offset = 0; ; offset += pageSize) {
          var result = await sb.from('ledger_entries')
            .select('*, clients(client_code,client_name,email,phone,city), cases(id,tm_no,folder_no,application_name)')
            .order('entry_date', { ascending: false }).order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);
          if (result.error) return toast('LEDGER COULD NOT BE LOADED: ' + result.error.message);
          all = all.concat(result.data || []);
          if (!result.data || result.data.length < pageSize) break;
        }
        mem.entries = all;
        await loadCases();
      };
    }
    var originalDashboard = window.loadDashboard;
    if (typeof originalDashboard === 'function') {
      window.loadDashboard = async function () {
        await originalDashboard.apply(this, arguments);
        var body = document.querySelector('#recentTable tbody');
        if (body) while (body.rows.length > 10) body.deleteRow(10);
        renderDashboard();
        if (currentClientId) refreshLedger();
      };
    }
    var originalOpen = window.openClientLedger;
    if (typeof originalOpen === 'function') {
      window.openClientLedger = async function (clientId) {
        await originalOpen.apply(this, arguments);
        renderCases();
        renderLedger(window._ledgerRows || []);
      };
    }
    var originalCurrentView = window.toggleCurrentView;
    if (typeof originalCurrentView === 'function') {
      window.toggleCurrentView = function () {
        originalCurrentView.apply(this, arguments);
        renderLedger(window._ledgerRows || []);
      };
    }
  }

  document.addEventListener('input', function (event) {
    var field = event.target;
    if (field && field.matches('input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="tel"],input[type="url"],textarea')) {
      var start = field.selectionStart, end = field.selectionEnd;
      field.value = field.value.toUpperCase();
      if (typeof start === 'number' && typeof end === 'number') field.setSelectionRange(start, end);
    }
  }, true);
  ['saveClient', 'saveCharge', 'saveReceiving', 'saveEditCase'].forEach(function (name) {
    var original = window[name];
    if (typeof original === 'function') window[name] = function () {
      document.querySelectorAll('input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="tel"],input[type="url"],textarea').forEach(function (field) {
        field.value = field.value.toUpperCase();
      });
      return original.apply(this, arguments);
    };
  });
  function initialize() {
    document.body.style.textTransform = 'uppercase';
    if (!sb || !sb.auth) return toast('SUPABASE AUTH IS REQUIRED');
    if (!document.getElementById('page-ledger')) return toast('LEDGER VIEW IS NOT AVAILABLE');
    installCasePanel();
    installDashboard();
    installStageGate();
    installPaging();
    addAuthGate();
  }
  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
