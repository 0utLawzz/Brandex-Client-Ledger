// ===== BRANDEX LEDGER GAPS v2 CORE =====
const STAGE_LABEL = { S1: 'Stage 1', S2: 'Stage 2', S3: 'Stage 3', S4: 'Stage 4' };
function stageLabel(s) { return STAGE_LABEL[s] || s || '—'; }
function stageBadge(s) {
  if (!s) return '—';
  return `<span class="stage-b ${String(s).toLowerCase()}">${stageLabel(s)}</span>`;
}
const BRAND = {
  name: 'Brandex Law Associates',
  email: 'info@brandex.pk',
  tagline: 'TRADEMARK REGISTRY',
  banks: [
    {
      name: 'United Bank Limited (UBL)',
      title: 'Brandex Pk',
      account: '0209301813886',
      iban: 'PK85UNIL0109000301813886'
    },
    {
      name: 'Meezan Bank Limited',
      title: 'Brandex.pk',
      account: '9814-0104862477',
      iban: 'PK12MEZN0098140104862477'
    }
  ],
  online: [
    {
      name: 'EasyPaisa',
      title: 'EHTASHAM UD DIN SIDDIQUI',
      account: '0336-0015009',
      note: 'Scan to pay · Merchant Till 214114'
    },
    {
      name: 'JazzCash / Raast ID',
      title: 'EHTASHAM UD DIN SIDDIQUI',
      account: '0336-0015004'
    }
  ]
};
function isActiveEntry(e) { return !e.voided_at; }
function activeEntries(list) { return (list || []).filter(isActiveEntry); }

function onPaymentMethodChange() {
  const m = document.getElementById('rcMethod')?.value;
  const wrap = document.getElementById('rcBankDateWrap');
  if (!wrap) return;
  const needsDate = m && m !== 'Cash';
  wrap.style.display = needsDate ? 'flex' : 'none';
  if (needsDate && document.getElementById('rcBankDate') && !document.getElementById('rcBankDate').value) {
    document.getElementById('rcBankDate').value = today();
  }
}
