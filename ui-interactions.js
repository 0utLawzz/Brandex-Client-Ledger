// Presentation and keyboard behavior only. No database or payment operations.
(function () {
  function syncNavigation(name) {
    const section = name === 'ledger' ? 'clients' : name;
    document.querySelectorAll('.ni[data-page]').forEach(button => {
      const current = button.dataset.page === section;
      button.classList.toggle('active', current);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  const originalShowPage = window.showPage;
  window.showPage = function (name) {
    const previous = document.querySelector('.page.active')?.id;
    const result = originalShowPage.apply(this, arguments);
    syncNavigation(name);
    if (previous !== 'page-' + name) window.scrollTo({ top: 0, behavior: 'instant' });
    return result;
  };
  syncNavigation(document.querySelector('.page.active')?.id.replace('page-', '') || 'dashboard');

  const modalNotes = {
    modalClient: 'Client identity, contact details and stage rates. The opening balance is added before ledger charges and receivings.',
    modalCharge: 'Choose a client and stage. Stage 1 can be recorded before a TM number is assigned. Amounts are in PKR.',
    modalReceiving: 'Record a receiving and its payment method. Link it to a charge when applicable. Amounts are in PKR.',
    modalEditCase: 'Select a case to update its TM number, folder and application name.',
    modalSeries: 'Use a short series code to group related client accounts.',
    modalEntryEdit: 'Update the selected entry date, amount and details. Amounts are in PKR.'
  };
  const openModals = [];
  const returnFocus = new WeakMap();
  const focusableSelector = 'button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]';
  const visibleControls = modal => Array.from(modal.querySelectorAll(focusableSelector)).filter(el => el.getClientRects().length && !el.closest('[hidden]'));
  const authGate = document.getElementById('authGate');
  function syncAuthPresentation() {
    if (!authGate) return;
    const locked = !authGate.hidden;
    document.querySelectorAll('.navbar,.main,.workspace-footer').forEach(el => { el.inert = locked; });
    if (locked && !authGate.contains(document.activeElement)) document.getElementById('authEmail')?.focus();
  }

  function prepareModal(modal) {
    const title = modal.querySelector('.mt');
    const box = modal.querySelector('.mbox');
    if (!title || !box) return;
    title.id = title.id || modal.id + 'Title';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', title.id);
    const close = modal.querySelector('.mc-btn');
    if (close) close.setAttribute('aria-label', 'Close dialog');
    if (modalNotes[modal.id] && !modal.querySelector('.form-note')) {
      const note = document.createElement('p');
      note.className = 'form-note';
      note.id = modal.id + 'Note';
      note.textContent = modalNotes[modal.id];
      const body = modal.querySelector('.mb');
      if (body) body.prepend(note);
      box.setAttribute('aria-describedby', note.id);
    }
  }

  function syncModals() {
    document.querySelectorAll('.mo').forEach(modal => {
      prepareModal(modal);
      const index = openModals.indexOf(modal);
      if (modal.classList.contains('open') && index < 0) {
        returnFocus.set(modal, document.activeElement);
        openModals.push(modal);
        const controls = visibleControls(modal);
        const firstField = controls.find(el => /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
        (firstField || controls[0])?.focus();
      } else if (!modal.classList.contains('open') && index >= 0) {
        const wasTop = index === openModals.length - 1;
        openModals.splice(index, 1);
        const previous = returnFocus.get(modal);
        if (wasTop && previous?.isConnected) previous.focus();
      }
    });
  }

  document.addEventListener('keydown', event => {
    const modal = openModals[openModals.length - 1] || (authGate && !authGate.hidden ? authGate : null);
    if (!modal) return;
    if (event.key === 'Escape' && modal.matches('.mo')) {
      event.preventDefault();
      modal.classList.remove('open');
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = visibleControls(modal);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });

  // Both static and later-created series/entry dialogs use the same treatment.
  new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes' && record.target === authGate && record.attributeName === 'hidden')) syncAuthPresentation();
    if (records.some(record => (record.type === 'attributes' && record.target.matches('.mo')) ||
      (record.type === 'childList' && Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches('.mo') || node.querySelector('.mo')))))) syncModals();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  syncAuthPresentation();
  syncModals();
})();
