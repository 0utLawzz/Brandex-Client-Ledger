(function () {
  'use strict';

  var stages = ['S1', 'S2', 'S3', 'S4'];
  var signedEvidenceByPath = {};

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function caseRowFor(id) {
    return (mem.cases || []).find(function (row) { return row.id === id; }) || null;
  }
  function seriesPrefix(client) {
    var series = client && (client.series || (mem.series || []).find(function (item) { return item.id === client.series_id; }));
    return String(series && (series.code || series.prefix) || '').trim();
  }
  function clientLabel(client) {
    return [seriesPrefix(client) || '—', client.client_code || '—', client.client_name || 'Unnamed client'].join(' — ');
  }
  function clientHeaderCode(client) {
    var prefix = seriesPrefix(client);
    var code = String(client && client.client_code || '').trim();
    if (!code) return prefix || 'CLIENT';
    return prefix && !new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[- ]|$)', 'i').test(code)
      ? prefix + ' — ' + code
      : code;
  }
  function populateClassSelect(select) {
    if (!select || select.dataset.classReady) return;
    var hasBlank = select.querySelector('option[value=""]');
    var blank = hasBlank ? hasBlank.outerHTML : '<option value="">SELECT CLASS</option>';
    select.innerHTML = blank;
    for (var n = 1; n <= 45; n += 1) select.insertAdjacentHTML('beforeend', '<option value="' + n + '">' + n + '</option>');
    select.dataset.classReady = '1';
  }
  var googleLibrariesPromise = null;
  function loadGoogleScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      var script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = function () { script.dataset.loaded = '1'; resolve(); };
      script.onerror = function () { reject(new Error('GOOGLE PICKER LIBRARIES COULD NOT BE LOADED')); };
      document.head.appendChild(script);
    });
  }
  function loadGooglePickerLibraries() {
    if (googleLibrariesPromise) return googleLibrariesPromise;
    googleLibrariesPromise = Promise.all([
      loadGoogleScript('https://apis.google.com/js/api.js'),
      loadGoogleScript('https://accounts.google.com/gsi/client')
    ]).then(function () {
      return new Promise(function (resolve, reject) {
        if (!window.gapi || !window.google || !google.accounts || !google.accounts.oauth2) return reject(new Error('GOOGLE IDENTITY LIBRARY IS UNAVAILABLE'));
        window.gapi.load('picker', { callback: resolve, onerror: function () { reject(new Error('GOOGLE PICKER API FAILED TO LOAD')); } });
      });
    });
    return googleLibrariesPromise;
  }
  function chooseDriveFolder() {
    var config = window.BRANDEX_GOOGLE_DRIVE_CONFIG || {};
    if (!config.clientId || !config.apiKey || !config.appId) {
      return toast('GOOGLE DRIVE PICKER NEEDS AN OAUTH CLIENT ID, API KEY AND CLOUD PROJECT NUMBER. SEE GOOGLE DRIVE SETUP NOTES.');
    }
    loadGooglePickerLibraries().then(function () {
      var tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: function (tokenResponse) {
          if (tokenResponse.error) return toast('GOOGLE DRIVE AUTHORIZATION FAILED: ' + tokenResponse.error);
          var folderView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
            .setIncludeFolders(true).setSelectFolderEnabled(true);
          var picker = new google.picker.PickerBuilder()
            .setAppId(config.appId)
            .setDeveloperKey(config.apiKey)
            .setOAuthToken(tokenResponse.access_token)
            .setOrigin(window.location.protocol + '//' + window.location.host)
            .addView(folderView)
            .setTitle('SELECT CASE FOLDER')
            .setCallback(function (data) {
              if (data.action !== google.picker.Action.PICKED || !data.docs || !data.docs.length) return;
              var folder = data.docs[0];
              document.getElementById('ecDriveFolderId').value = folder.id || '';
              document.getElementById('ecDriveFolderName').textContent = folder.name || 'DRIVE FOLDER SELECTED';
            }).build();
          picker.setVisible(true);
        }
      });
      tokenClient.requestAccessToken({ prompt: '' });
    }).catch(function (error) {
      googleLibrariesPromise = null;
      toast(error.message || 'GOOGLE DRIVE PICKER COULD NOT OPEN');
    });
  }
  function populateSeriesSelects() {
    var modal = document.getElementById('cSeries');
    if (!modal) return;
    var selected = modal.value;
    modal.innerHTML = (mem.series || []).filter(function (s) { return s.is_active !== false; }).map(function (s) {
      return '<option value="' + escapeHTML(s.id) + '">' + escapeHTML(s.name || s.code) + '</option>';
    }).join('');
    if (selected && modal.querySelector('option[value="' + CSS.escape(selected) + '"]')) modal.value = selected;
    var filter = document.getElementById('seriesFilter');
    if (filter) Array.from(filter.options).forEach(function (option) {
      if (option.value) {
        var item = (mem.series || []).find(function (s) { return s.id === option.value; });
        if (item) option.textContent = item.name || item.code;
      }
    });
  }
  function fillClientSelect(id, pinnedId) {
    var select = document.getElementById(id);
    if (!select) return;
    var list = (mem.clients || []).filter(function (client) {
      return client.is_active !== false && (!pinnedId || client.id === pinnedId);
    });
    var prior = pinnedId || select.value;
    select.innerHTML = list.map(function (client) {
      return '<option value="' + escapeHTML(client.id) + '">' + escapeHTML(clientLabel(client)) + '</option>';
    }).join('');
    if (prior && list.some(function (client) { return client.id === prior; })) select.value = prior;
  }
  function formatPkr(value) {
    var amount = Number(value);
    if (!Number.isFinite(amount)) return '';
    return 'PKR ' + new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  }
  var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function underThousand(value) {
    var n = Math.floor(value), parts = [];
    if (n >= 100) { parts.push(ones[Math.floor(n / 100)] + ' hundred'); n %= 100; }
    if (n >= 20) { parts.push(tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '')); }
    else if (n >= 10) parts.push(teens[n - 10]);
    else if (n) parts.push(ones[n]);
    return parts.join(' ');
  }
  function amountInWords(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number < 0) return '';
    if (number > 9999999999) return 'AMOUNT TOO LARGE TO SPELL';
    var cents = Math.round(number * 100), whole = Math.floor(cents / 100), paisa = cents % 100, parts = [];
    var units = [[10000000, 'crore'], [100000, 'lakh'], [1000, 'thousand'], [1, '']];
    units.forEach(function (unit) {
      var count = Math.floor(whole / unit[0]);
      whole %= unit[0];
      if (count) parts.push((unit[0] === 1 ? underThousand(count) : underThousand(count)) + (unit[1] ? ' ' + unit[1] : ''));
    });
    var words = parts.join(' ').trim() || 'zero';
    return (words + ' rupees' + (paisa ? ' and ' + underThousand(paisa) + ' paisa' : '') + ' only').toUpperCase();
  }
  function updateAmountWords(inputId, outputId) {
    var input = document.getElementById(inputId), output = document.getElementById(outputId);
    if (!input || !output) return;
    var amount = input.value;
    output.textContent = amount !== '' && Number(amount) >= 0 ? formatPkr(amount) + ' · ' + amountInWords(amount) : '';
  }

  function attachTMMatch() {
    var field = document.getElementById('chTM'), box = document.getElementById('chTMInfo');
    if (!field || !box || field.dataset.relationshipBound) return;
    field.dataset.relationshipBound = '1';
    async function renderMatch() {
      var tm = String(field.value || '').trim();
      if (!tm) { box.innerHTML = ''; return; }
      var found = await lookupCaseByTM(tm);
      if (!found) {
        box.innerHTML = '<div class="tm-match-grid"><div class="tm-match-cell"><span>Trademark Number</span><strong>' + escapeHTML(tm) + '</strong></div><div class="tm-match-cell"><span>Case Match</span><strong>NO EXISTING CASE · WILL CREATE ON SAVE</strong></div></div>';
        return;
      }
      var client = (mem.clients || []).find(function (c) { return c.id === found.client_id; }) || {};
      box.innerHTML = '<div class="tm-match-grid">' +
        '<div class="tm-match-cell"><span>Trademark Number</span><strong>' + escapeHTML(found.tm_no || tm) + '</strong></div>' +
        '<div class="tm-match-cell"><span>Client</span><strong>' + escapeHTML(clientLabel(client)) + '</strong></div>' +
        '<div class="tm-match-cell"><span>Folder Number</span><strong>' + escapeHTML(found.folder_no || 'ASSIGNED ON SAVE') + '</strong></div></div>';
      var classField = document.getElementById('chClass');
      if (classField && found.class_no) classField.value = String(found.class_no);
      var folder = document.getElementById('chFolder');
      if (folder && found.folder_no) folder.value = found.folder_no;
      var app = document.getElementById('chAppName');
      if (app && found.application_name) app.value = found.application_name;
    }
    field.addEventListener('blur', renderMatch);
  }
  async function refreshLedger(button) {
    var buttons = [button, document.getElementById('refreshClientLedgerTop')].filter(Boolean);
    buttons.forEach(function (item) { item.disabled = true; item.textContent = 'REFRESHING…'; });
    var status = document.getElementById('ledgerRefreshStatus');
    try {
      await loadDashboard();
      if (currentClientId && typeof openClientLedger === 'function') await openClientLedger(currentClientId);
      if (status) status.textContent = 'UPDATED';
    } catch (error) {
      if (status) status.textContent = 'REFRESH FAILED';
      toast('LEDGER REFRESH FAILED: ' + (error.message || error));
    } finally {
      buttons.forEach(function (item) { item.disabled = false; item.textContent = item.id === 'refreshClientLedgerTop' ? 'REFRESH' : '↻ REFRESH LEDGER'; });
    }
  }
  function ensureEvidencePreview() {
    if (document.getElementById('evidencePreview')) return;
    var overlay = document.createElement('div');
    overlay.id = 'evidencePreview'; overlay.className = 'evidence-preview'; overlay.hidden = true;
    overlay.innerHTML = '<figure><button type="button" class="btn" data-evidence-close>CLOSE</button><img alt="Ledger supporting image"></figure>';
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay || event.target.closest('[data-evidence-close]')) overlay.hidden = true;
    });
    document.body.appendChild(overlay);
  }
  function previewEvidence(url) {
    ensureEvidencePreview();
    var overlay = document.getElementById('evidencePreview');
    overlay.querySelector('img').src = url;
    overlay.hidden = false;
  }
  async function signEvidence(rows) {
    var paths = Array.from(new Set((rows || []).map(function (row) { return row.evidence_path; }).filter(function (path) { return path && !signedEvidenceByPath[path]; })));
    if (!paths.length || !sb || !sb.storage) return;
    var result = await sb.storage.from('ledger-evidence').createSignedUrls(paths, 3600);
    if (result.error) { console.warn('Evidence preview links unavailable:', result.error.message); return; }
    (result.data || []).forEach(function (item) {
      if (item.path && item.signedUrl) signedEvidenceByPath[item.path] = item.signedUrl;
    });
  }
  function stageAndEntryRelationships(entry) {
    var rows = mem.entries || [];
    if (entry.entry_type === 'charge') {
      var linked = rows.filter(function (row) { return row.entry_type === 'receiving' && !row.voided_at && row.linked_entry_id === entry.id; });
      var total = linked.reduce(function (sum, row) { return sum + Number(row.amount_received || 0); }, 0);
      return '<small class="entry-relation">' + linked.length + ' LINKED PAYMENT' + (linked.length === 1 ? '' : 'S') + ' · PKR ' + fmt(total) + ' / ' + fmt(entry.amount_due || 0) + '</small>';
    }
    if (entry.linked_entry_id) {
      var charge = rows.find(function (row) { return row.id === entry.linked_entry_id; });
      if (charge) return '<small class="entry-relation">LINKED TO ' + escapeHTML(charge.stage || 'GENERAL') + ' CHARGE · PKR ' + fmt(charge.amount_due || 0) + '</small>';
    }
    return entry.stage ? '<small class="entry-relation">ALLOCATED TO ' + escapeHTML(entry.stage) + '</small>' : '';
  }
  async function decorateRows(inputRows) {
    var tbody = document.querySelector('#clientLedgerTable tbody');
    if (!tbody) return;
    var rows = (inputRows || []).slice().sort(function (a, b) {
      return String(b.entry_date || '').localeCompare(String(a.entry_date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
    if (currentViewMode) rows = rows.slice(0, 6);
    await signEvidence(rows);
    Array.from(tbody.rows).forEach(function (tr, index) {
      var entry = rows[index];
      if (!entry || tr.cells.length < 10 || tr.dataset.decorated === '1') return;
      tr.dataset.decorated = '1';
      tr.dataset.entryId = entry.id;
      var evidenceCell = document.createElement('td');
      evidenceCell.className = 'entry-evidence-cell';
      var evidenceUrl = entry.evidence_path && signedEvidenceByPath[entry.evidence_path];
      evidenceCell.innerHTML = evidenceUrl
        ? '<button class="evidence-thumb" type="button" aria-label="View supporting image" data-evidence-url="' + escapeHTML(evidenceUrl) + '"><img src="' + escapeHTML(evidenceUrl) + '" alt="Supporting image thumbnail" loading="lazy"></button>'
        : '<span class="evidence-empty">—</span>';
      tr.cells[1].after(evidenceCell);
      var caseRow = entry.cases || caseRowFor(entry.case_id);
      var classNo = caseRow && Number(caseRow.class_no);
      var classCell = document.createElement('td');
      classCell.className = 'entry-class-cell';
      classCell.innerHTML = classNo ? '<span class="entry-class-chip class-color-' + ((classNo - 1) % 6 + 1) + '">' + classNo + '</span>' : '<span class="evidence-empty">—</span>';
      tr.cells[5].after(classCell);
      if (tr.cells[8]) tr.cells[8].insertAdjacentHTML('beforeend', stageAndEntryRelationships(entry));
    });
  }
  window.openCaseStageLedger = function (caseId, stage) {
    var caseFilter = document.getElementById('ledgerCaseFilter');
    var stageFilter = document.getElementById('ledgerEntryStage');
    if (caseFilter) caseFilter.value = caseId;
    if (stageFilter) stageFilter.value = stage;
    if (currentViewMode) { currentViewMode = false; }
    if (typeof filterLedgerByCase === 'function') filterLedgerByCase();
    if (stageFilter) stageFilter.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('clientLedgerTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  var oldLoadSeries = window.loadSeries;
  if (typeof oldLoadSeries === 'function') window.loadSeries = async function () {
    var result = await oldLoadSeries.apply(this, arguments);
    populateSeriesSelects();
    return result;
  };

  var oldOpenClientModal = window.openClientModal;
  if (typeof oldOpenClientModal === 'function') window.openClientModal = function () {
    populateSeriesSelects();
    return oldOpenClientModal.apply(this, arguments);
  };

  var oldApplyStageRate = window.applyStageRate;
  var rateRequest = 0;
  if (typeof oldApplyStageRate === 'function') window.applyStageRate = function () {
    oldApplyStageRate.apply(this, arguments);
    var clientId = document.getElementById('chClient').value;
    var stage = document.getElementById('chStage').value;
    var request = ++rateRequest;
    var savedRate = mem.rates && mem.rates[clientId] && mem.rates[clientId][stage];
    if (savedRate != null) {
      document.getElementById('chAmount').value = savedRate;
      updateAmountWords('chAmount', 'chAmountWords');
      return;
    }
    document.getElementById('chAmount').value = '';
    updateAmountWords('chAmount', 'chAmountWords');
    if (sb) sb.from('client_stage_rates').select('amount').eq('client_id', clientId).eq('stage', stage).maybeSingle().then(function (result) {
      if (request !== rateRequest || result.error || !result.data) return;
      mem.rates[clientId] = mem.rates[clientId] || {};
      mem.rates[clientId][stage] = result.data.amount;
      document.getElementById('chAmount').value = result.data.amount;
      updateAmountWords('chAmount', 'chAmountWords');
    });
  };

  ['chClass', 'ecClass', 'ledgerEntryClass', 'reportClass'].forEach(function (id) { populateClassSelect(document.getElementById(id)); });
  populateSeriesSelects();
  ['chAmount', 'rcAmount'].forEach(function (id) {
    var outputId = id === 'chAmount' ? 'chAmountWords' : 'rcAmountWords';
    var input = document.getElementById(id);
    if (input) input.addEventListener('input', function () { updateAmountWords(id, outputId); });
  });
  attachTMMatch();

  var driveFolderButton = document.getElementById('pickDriveFolder');
  if (driveFolderButton) driveFolderButton.addEventListener('click', chooseDriveFolder);

  var oldOpenCharge = window.openChargeModal;
  if (typeof oldOpenCharge === 'function') window.openChargeModal = function (preClientId) {
    var onClientLedger = document.getElementById('page-ledger').classList.contains('active') && currentClientId;
    var pinned = preClientId || (onClientLedger ? currentClientId : null);
    var result = oldOpenCharge.apply(this, [pinned]);
    fillClientSelect('chClient', pinned);
    var title = document.querySelector('#modalCharge .mt');
    var client = (mem.clients || []).find(function (row) { return row.id === pinned; });
    if (title && client) title.textContent = 'ADD CHARGE · ' + clientLabel(client);
    var wrap = document.getElementById('chClientWrap');
    if (wrap) wrap.classList.toggle('client-ledger-locked', !!pinned);
    var modal = document.getElementById('modalCharge');
    if (modal) modal.classList.toggle('client-ledger-locked', !!pinned);
    var clientField = document.getElementById('chClient');
    if (clientField) clientField.disabled = !!pinned;
    if (typeof applyStageRate === 'function') applyStageRate();
    var folder = document.getElementById('chFolder');
    if (folder) folder.value = '';
    var classField = document.getElementById('chClass');
    if (classField) classField.value = '';
    var evidence = document.getElementById('chEvidence');
    if (evidence) evidence.value = '';
    updateAmountWords('chAmount', 'chAmountWords');
    attachTMMatch();
    return result;
  };
  var oldOpenReceiving = window.openReceivingModal;
  if (typeof oldOpenReceiving === 'function') window.openReceivingModal = function (preClientId) {
    var onClientLedger = document.getElementById('page-ledger').classList.contains('active') && currentClientId;
    var pinned = preClientId || (onClientLedger ? currentClientId : null);
    var result = oldOpenReceiving.apply(this, [pinned]);
    fillClientSelect('rcClient', pinned);
    var title = document.querySelector('#modalReceiving .mt');
    var client = (mem.clients || []).find(function (row) { return row.id === pinned; });
    if (title && client) title.textContent = 'ADD RECEIVING · ' + clientLabel(client);
    var wrap = document.getElementById('rcClientWrap');
    if (wrap) wrap.classList.toggle('client-ledger-locked', !!pinned);
    var modal = document.getElementById('modalReceiving');
    if (modal) modal.classList.toggle('client-ledger-locked', !!pinned);
    var clientField = document.getElementById('rcClient');
    if (clientField) clientField.disabled = !!pinned;
    updateAmountWords('rcAmount', 'rcAmountWords');
    return result;
  };

  var refreshOne = document.getElementById('refreshClientLedger');
  var refreshTwo = document.getElementById('refreshClientLedgerTop');
  if (refreshOne) refreshOne.addEventListener('click', function () { refreshLedger(refreshOne); });
  if (refreshTwo) refreshTwo.addEventListener('click', function () { refreshLedger(refreshTwo); });
  var table = document.getElementById('clientLedgerTable');
  if (table) table.addEventListener('click', function (event) {
    var button = event.target.closest('[data-evidence-url]');
    if (button) previewEvidence(button.getAttribute('data-evidence-url'));
  });

  var oldRenderEntries = window.renderClientEntries;
  if (typeof oldRenderEntries === 'function') window.renderClientEntries = function (rows) {
    document.querySelectorAll('#clientLedgerTable tbody tr').forEach(function (row) { delete row.dataset.decorated; });
    var result = oldRenderEntries.apply(this, arguments);
    decorateRows(rows).catch(function (error) { console.warn('Ledger row details could not be displayed:', error); });
    return result;
  };

  var oldOpenLedger = window.openClientLedger;
  if (typeof oldOpenLedger === 'function') window.openClientLedger = async function () {
    var result = await oldOpenLedger.apply(this, arguments);
    var filter = document.getElementById('ledgerCaseFilter');
    if (filter) filter.hidden = false;
    var c = (mem.clients || []).find(function (row) { return row.id === currentClientId; });
    var title = document.getElementById('ledgerTitle');
    if (title && c) title.textContent = clientHeaderCode(c);
    return result;
  };

  var oldSaveCharge = window.saveCharge;
  if (typeof oldSaveCharge === 'function') window.saveCharge = async function () {
    var evidenceField = document.getElementById('chEvidence');
    var file = evidenceField && evidenceField.files && evidenceField.files[0];
    var path = null;
    if (file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) return toast('CHOOSE A JPEG, PNG OR WEBP IMAGE UNDER 5 MB.');
      if (!sb || !sb.storage) return toast('SUPABASE STORAGE IS NOT AVAILABLE.');
      var ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
      path = document.getElementById('chClient').value + '/' + crypto.randomUUID() + '.' + ext;
      var upload = await sb.storage.from('ledger-evidence').upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) return toast('IMAGE UPLOAD FAILED: ' + upload.error.message);
      window._pendingEvidencePath = path;
    }
    try {
      var result = await oldSaveCharge.apply(this, arguments);
      var saved = path && (mem.entries || []).some(function (row) { return row.evidence_path === path; });
      if (path && !saved) {
        await sb.storage.from('ledger-evidence').remove([path]);
        return result;
      }
      if (currentClientId) await openClientLedger(currentClientId);
      await loadDashboard();
      if (currentClientId) await openClientLedger(currentClientId);
      return result;
    } finally { window._pendingEvidencePath = null; }
  };
  var oldSaveReceiving = window.saveReceiving;
  if (typeof oldSaveReceiving === 'function') window.saveReceiving = async function () {
    var result = await oldSaveReceiving.apply(this, arguments);
    await loadDashboard();
    if (currentClientId) await openClientLedger(currentClientId);
    return result;
  };

  console.info('Brandex post-release workflow updates loaded.');
})();
