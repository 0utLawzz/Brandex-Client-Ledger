// loaded before app — Brandex brand kit
window.BRANDEX_ASSETS = window.BRANDEX_ASSETS || {};
(function () {
  // Prefer remote files under /assets/ when present; fallback data URIs set at deploy
  var A = window.BRANDEX_ASSETS;
  A.name = A.name || 'Brandex Law Associates';
  A.email = A.email || 'info@brandex.pk';
  A.web = A.web || 'BRANDEX.PK';
  A.facebook = A.facebook || 'FACEBOOK.COM/BRANDEX.PK';
  A.tagline = A.tagline || 'TRADEMARK REGISTRY';
  A.accent = A.accent || '#C94A00';
  A.logoMark = A.logoMark || 'assets/logo-mark.png';
  A.favicon = A.favicon || 'assets/favicon.png';
  A.logoLockup = A.logoLockup || 'assets/logo-lockup.png';
})();

(function () {
  function loadPhaseTwo() {
    if (document.getElementById('brandex-phase2-script')) return;
    var stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'phase2.css';
    document.head.appendChild(stylesheet);
    var script = document.createElement('script');
    script.id = 'brandex-phase2-script';
    script.src = 'phase2.js';
    document.body.appendChild(script);
  }
  if (document.readyState === 'complete') loadPhaseTwo();
  else window.addEventListener('load', loadPhaseTwo, { once: true });
})();
